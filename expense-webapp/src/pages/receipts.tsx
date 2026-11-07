import { useState, type ReactElement } from "react";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
} from "@wso2/oxygen-ui";
import { apiFetch } from "../authz/client";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { errorLines } from "./claimsShared";

export type Receipt = components["schemas"]["Receipt"];

/** Which operation serves the file: the caller's own claims, a direct report's, or any claim. */
export type ReceiptScope = "own" | "team" | "all";

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ACCEPT = "image/*,application/pdf";
export const RECEIPT_HELP = "Receipts are images or PDFs, up to 10 MB.";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|heif|tiff?|svg)$/i;

/** Client-side check of a receipt file. Returns a message for the user, or null when the file is acceptable. */
export function checkReceipt(file: File): string | null {
  const isPdf = file.type === "application/pdf" || (file.type === "" && /\.pdf$/i.test(file.name));
  const isImage = file.type.startsWith("image/") || (file.type === "" && IMAGE_EXT.test(file.name));
  if (!isPdf && !isImage) return `${file.name} is not an image or a PDF. Choose a photo, a screenshot or a PDF.`;
  if (file.size === 0) return `${file.name} is empty. Choose another file.`;
  if (file.size > MAX_RECEIPT_BYTES) {
    return `${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Receipts can be up to 10 MB.`;
  }
  return null;
}

/** Attaches a file to a line of the caller's own claim. Returns an error message, or null on success. */
export async function uploadReceipt(claimId: string, lineId: string, file: File): Promise<string | null> {
  const problem = checkReceipt(file);
  if (problem) return problem;
  try {
    const { response, error } = await expenseApi.POST("/me/claims/{claimId}/lines/{lineId}/receipts", {
      params: { path: { claimId, lineId } },
      body: { file: file as unknown as string },
      bodySerializer: () => {
        const form = new FormData();
        form.append("file", file, file.name);
        return form;
      },
    });
    return response.ok ? null : errorLines(error, "The receipt could not be attached.")[0];
  } catch {
    return "The receipt could not be attached.";
  }
}

/** Removes a receipt from a line of the caller's own claim. Returns an error message, or null on success. */
export async function removeReceipt(claimId: string, lineId: string, receiptId: string): Promise<string | null> {
  try {
    const { response, error } = await expenseApi.DELETE("/me/claims/{claimId}/lines/{lineId}/receipts/{receiptId}", {
      params: { path: { claimId, lineId, receiptId } },
    });
    return response.ok ? null : errorLines(error, "The receipt could not be removed.")[0];
  } catch {
    return "The receipt could not be removed.";
  }
}

const filePath = (scope: ReceiptScope, claimId: string, lineId: string, receiptId: string): string => {
  const tail = `/claims/${claimId}/lines/${lineId}/receipts/${receiptId}/file`;
  return scope === "own" ? `/me${tail}` : scope === "team" ? `/me/team${tail}` : tail;
};

/** Fetches the receipt file with the bearer token (a plain link cannot carry it). */
async function fetchReceiptFile(scope: ReceiptScope, claimId: string, lineId: string, receipt: Receipt): Promise<Blob> {
  const response = await apiFetch(filePath(scope, claimId, lineId, receipt.id));
  return new Blob([await response.blob()], { type: receipt.contentType });
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function openBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) saveBlob(blob, fileName); // pop-up blocked: fall back to a download
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** The receipts of one line: each can be viewed and downloaded, and removed when `onRemove` is given. */
export function ReceiptLinks({
  scope, claimId, lineId, receipts, onRemove, busy,
}: {
  scope: ReceiptScope;
  claimId: string;
  lineId: string;
  receipts: Receipt[];
  onRemove?: (receipt: Receipt) => void;
  busy?: boolean;
}): ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const act = async (r: Receipt, how: "view" | "download"): Promise<void> => {
    setError(null);
    setLoading(r.id);
    try {
      const blob = await fetchReceiptFile(scope, claimId, lineId, r);
      if (how === "view") openBlob(blob, r.fileName);
      else saveBlob(blob, r.fileName);
    } catch {
      setError(`${r.fileName} could not be opened. Try again.`);
    } finally {
      setLoading(null);
    }
  };

  if (receipts.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No receipt
      </Typography>
    );
  }
  return (
    <Stack spacing={0.5} alignItems="flex-start">
      {receipts.map((r) => (
        <Stack key={r.id} direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          <Typography variant="body2">{r.fileName}</Typography>
          <Button size="small" variant="text" disabled={loading === r.id} aria-label={`View ${r.fileName}`} onClick={() => void act(r, "view")}>
            View
          </Button>
          <Button size="small" variant="text" disabled={loading === r.id} aria-label={`Download ${r.fileName}`} onClick={() => void act(r, "download")}>
            Download
          </Button>
          {onRemove && (
            <Button size="small" variant="text" color="error" disabled={busy} aria-label={`Remove receipt ${r.fileName}`} onClick={() => onRemove(r)}>
              Remove receipt
            </Button>
          )}
        </Stack>
      ))}
      {error && (
        <Typography variant="caption" color="error" role="alert">
          {error}
        </Typography>
      )}
    </Stack>
  );
}

/** The "Attach a receipt" dialog: checks the file, uploads it, and closes on success. */
export function AttachReceiptDialog({
  open, claimId, lineId, lineLabel, onClose, onAttached,
}: {
  open: boolean;
  claimId: string;
  lineId: string;
  lineLabel: string;
  onClose: () => void;
  onAttached: () => Promise<void>;
}): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = (): void => {
    setFile(null);
    setError(null);
    onClose();
  };

  const attach = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!file) return setError("Choose a receipt file.");
    const problem = checkReceipt(file);
    if (problem) return setError(problem);
    setBusy(true);
    const failed = await uploadReceipt(claimId, lineId, file);
    setBusy(false);
    if (failed) return setError(failed);
    await onAttached();
    close();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <form onSubmit={(e) => void attach(e)} noValidate>
        <DialogTitle>Attach a receipt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">{lineLabel}</Typography>
            <TextField
              label="Receipt file"
              type="file"
              required
              fullWidth
              onChange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0] ?? null;
                setFile(f);
                setError(f ? checkReceipt(f) : null);
              }}
              error={error !== null}
              helperText={error ?? RECEIPT_HELP}
              slotProps={{ htmlInput: { accept: RECEIPT_ACCEPT }, inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            Attach
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
