import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, ListingTable, PageContent,
  PageTitle, Stack, Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import { apiFetch } from "../authz/client";
import type { components } from "../generated/expense-api";
import { money } from "./claimsShared";

type PayrollExport = components["schemas"]["Export"];

const fileName = (x: PayrollExport): string => `claims-${x.createdOn}.csv`;

export function ExportHistoryPage(): ReactElement {
  const navigate = useNavigate();
  const [exports, setExports] = useState<PayrollExport[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [download, setDownload] = useState<PayrollExport | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await expenseApi.GET("/exports", { params: { query: { limit: 100 } } });
        if (data) setExports(data.data);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  const close = (): void => {
    setDownload(null);
    setDownloadError(false);
  };

  // The file is fetched with the bearer, then saved from a Blob: a plain link would carry no token.
  const save = async (x: PayrollExport): Promise<void> => {
    setBusy(true);
    setDownloadError(false);
    try {
      const response = await apiFetch(`/exports/${x.id}/file`);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(x);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(true);
    } finally {
      setBusy(false);
    }
  };

  const past = exports ?? [];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Export history</PageTitle.Header>
      </PageTitle>
      {failed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Past exports could not be loaded. Try again in a moment.
        </Alert>
      )}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Past exports</Typography>
        <Chip size="small" label={past.length} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Download any export again; downloading never changes a claim.
      </Typography>
      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Created</ListingTable.Cell>
              <ListingTable.Cell>By</ListingTable.Cell>
              <ListingTable.Cell align="right">Claims</ListingTable.Cell>
              <ListingTable.Cell align="right">Total</ListingTable.Cell>
              <ListingTable.Cell align="right" />
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {exports === null && !failed && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5} align="center">
                  <CircularProgress size={20} aria-label="Loading exports" />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {exports !== null && past.length === 0 && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5}>
                  <ListingTable.EmptyState
                    title="No exports yet"
                    description="Exports you create appear here."
                    action={
                      <Button variant="outlined" onClick={() => navigate("/export")}>
                        Go to payroll export
                      </Button>
                    }
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {past.map((x) => (
              <ListingTable.Row key={x.id}>
                <ListingTable.Cell>{x.createdOn}</ListingTable.Cell>
                <ListingTable.Cell>{x.createdByName}</ListingTable.Cell>
                <ListingTable.Cell align="right">{x.claimCount}</ListingTable.Cell>
                <ListingTable.Cell align="right">{money(x.totalCents)}</ListingTable.Cell>
                <ListingTable.Cell align="right">
                  <Button size="small" variant="text" onClick={() => setDownload(x)}>
                    Download
                  </Button>
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
      <Dialog open={download !== null} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Download export</DialogTitle>
        <DialogContent>
          {download && (
            <Typography variant="body2">
              {`${fileName(download)}: ${download.claimCount} claim${download.claimCount === 1 ? "" : "s"}, ${money(download.totalCents)} in total. One row per claim: employee, claim number, total, approval date.`}
            </Typography>
          )}
          {downloadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              The file could not be downloaded. Try again in a moment.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={close}>
            Close
          </Button>
          <Button variant="contained" disabled={busy} onClick={() => download && void save(download)}>
            Download CSV
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}
