import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Card, CardContent, Chip, Stack, Typography } from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";

export type ClaimDetail = components["schemas"]["ClaimDetail"];
export type ClaimSummary = components["schemas"]["ClaimSummary"];
export type Category = components["schemas"]["Category"];

export const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

type ChipColor = "default" | "info" | "success" | "warning" | "error";
const STATUS_COLOR: Record<ClaimSummary["status"], ChipColor> = {
  Draft: "default",
  Submitted: "warning",
  Approved: "success",
  Rejected: "error",
  Exported: "info",
};

export function StatusChip({ status }: { status: ClaimSummary["status"] }): ReactElement {
  return <Chip size="small" label={status} color={STATUS_COLOR[status]} variant={status === "Draft" ? "outlined" : "filled"} />;
}

/** A claim may change until the manager decides it. */
export const isEditable = (status: ClaimSummary["status"]): boolean =>
  status === "Draft" || status === "Submitted" || status === "Rejected";

/** Turns an API error body (Error or ClaimRefusal) into lines the user can read. */
export function errorLines(error: unknown, fallback: string): string[] {
  const e = error as
    | { message?: string; description?: string; violations?: { description: string; category: string; amountCents: number; maximumCents: number }[] }
    | undefined;
  if (!e || (!e.message && !e.description)) return [fallback];
  const lines = [e.description ?? e.message ?? fallback];
  for (const v of e.violations ?? []) {
    lines.push(`${v.description} (${v.category}): ${money(v.amountCents)} is over the ${money(v.maximumCents)} maximum.`);
  }
  return lines;
}

export type LoadState<T> =
  | { kind: "loading" }
  | { kind: "ready"; value: T }
  | { kind: "notFound" }
  | { kind: "failed" };

/** Loads one of the caller's claims; `set` replaces it with a fresher copy from a mutation. */
export function useMyClaim(claimId: string | undefined): {
  state: LoadState<ClaimDetail>;
  reload: () => Promise<void>;
  set: (claim: ClaimDetail) => void;
} {
  const [state, setState] = useState<LoadState<ClaimDetail>>({ kind: "loading" });
  const reload = useCallback(async () => {
    if (!claimId) return setState({ kind: "notFound" });
    try {
      const { data, response } = await expenseApi.GET("/me/claims/{claimId}", { params: { path: { claimId } } });
      if (data) setState({ kind: "ready", value: data });
      else setState({ kind: response.status === 404 ? "notFound" : "failed" });
    } catch {
      setState({ kind: "failed" });
    }
  }, [claimId]);
  useEffect(() => {
    setState({ kind: "loading" });
    void reload();
  }, [reload]);
  return { state, reload, set: (value) => setState({ kind: "ready", value }) };
}

/** The caller's team claims (direct reports, never drafts), oldest submission first. */
export function useTeamClaims(): { claims: ClaimSummary[] | null; failed: boolean; reload: () => Promise<void> } {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(async () => {
    try {
      const { data } = await expenseApi.GET("/me/team/claims", { params: { query: { limit: 100 } } });
      if (data) {
        setClaims(data.data);
        setFailed(false);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { claims, failed, reload };
}

/** Loads one claim of a direct report. */
export function useTeamClaim(claimId: string | undefined): {
  state: LoadState<ClaimDetail>;
  set: (claim: ClaimDetail) => void;
} {
  const [state, setState] = useState<LoadState<ClaimDetail>>({ kind: "loading" });
  useEffect(() => {
    setState({ kind: "loading" });
    if (!claimId) return setState({ kind: "notFound" });
    void (async () => {
      try {
        const { data, response } = await expenseApi.GET("/me/team/claims/{claimId}", { params: { path: { claimId } } });
        if (data) setState({ kind: "ready", value: data });
        else setState({ kind: response.status === 404 ? "notFound" : "failed" });
      } catch {
        setState({ kind: "failed" });
      }
    })();
  }, [claimId]);
  return { state, set: (value) => setState({ kind: "ready", value }) };
}

/** A stat tile: overline label with icon, big value, caption. */
export function StatTile({ label, value, hint, icon }: { label: string; value: number; hint: string; icon: ReactElement }): ReactElement {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
          <Typography variant="overline">{label}</Typography>
        </Stack>
        <Typography variant="h4">{value}</Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}
