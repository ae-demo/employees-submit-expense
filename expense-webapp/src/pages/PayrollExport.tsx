import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Chip, CircularProgress, Grid, ListingTable, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import { ListChecks, Receipt } from "@wso2/oxygen-ui-icons-react";
import { expenseApi } from "../api";
import { StatTile, errorLines, money, type ClaimSummary } from "./claimsShared";

export function PayrollExportPage(): ReactElement {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await expenseApi.GET("/claims", { params: { query: { status: "Approved", limit: 100 } } });
      if (data) {
        setClaims(data.data.filter((c) => c.status === "Approved"));
        setFailed(false);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const approved = claims ?? [];
  const chosen = approved.filter((c) => selected.includes(c.id));
  const chosenTotal = chosen.reduce((sum, c) => sum + c.totalCents, 0);

  const toggle = (id: string): void =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const doExport = async (): Promise<void> => {
    if (chosen.length === 0) return;
    setBusy(true);
    setError([]);
    try {
      const { data, error: err } = await expenseApi.POST("/exports", { body: { claimIds: chosen.map((c) => c.id) } });
      if (data) {
        setSelected([]);
        navigate("/export-history");
      } else {
        setError(errorLines(err, "The export could not be created."));
        void load();
      }
    } catch {
      setError(["The export could not be created."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Payroll export</PageTitle.Header>
      </PageTitle>
      {failed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Approved claims could not be loaded. Try again in a moment.
        </Alert>
      )}
      {error.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTile label="Ready to export" value={approved.length} hint="approved, not yet exported" icon={<Receipt size={18} />} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTile label="Selected" value={chosen.length} hint={money(chosenTotal)} icon={<ListChecks size={18} />} />
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Approved claims</Typography>
        <Chip size="small" label={approved.length} />
        <Stack sx={{ flexGrow: 1 }} />
        <Button variant="contained" disabled={chosen.length === 0 || busy} onClick={() => void doExport()}>
          {`Export ${chosen.length} selected`}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select claims to include. Exported claims are marked Exported and leave this list.
      </Typography>
      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Employee</ListingTable.Cell>
              <ListingTable.Cell>Claim</ListingTable.Cell>
              <ListingTable.Cell>Description</ListingTable.Cell>
              <ListingTable.Cell>Approved</ListingTable.Cell>
              <ListingTable.Cell align="right">Total</ListingTable.Cell>
              <ListingTable.Cell>Selection</ListingTable.Cell>
              <ListingTable.Cell align="right" />
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {claims === null && !failed && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={7} align="center">
                  <CircularProgress size={20} aria-label="Loading claims" />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {claims !== null && approved.length === 0 && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={7}>
                  <ListingTable.EmptyState title="Nothing to export" description="Approved claims appear here until they are exported." />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {approved.map((c) => {
              const on = selected.includes(c.id);
              return (
                <ListingTable.Row key={c.id} clickable onClick={() => navigate(`/finance-claim/${c.id}`)}>
                  <ListingTable.Cell>{c.employeeName}</ListingTable.Cell>
                  <ListingTable.Cell>{c.number}</ListingTable.Cell>
                  <ListingTable.Cell>{c.description}</ListingTable.Cell>
                  <ListingTable.Cell>{c.decidedOn}</ListingTable.Cell>
                  <ListingTable.Cell align="right">{money(c.totalCents)}</ListingTable.Cell>
                  <ListingTable.Cell>
                    <Chip size="small" label={on ? "Selected" : "Not selected"} color={on ? "info" : "default"} variant={on ? "filled" : "outlined"} />
                  </ListingTable.Cell>
                  <ListingTable.Cell align="right" onClick={(e) => e.stopPropagation()}>
                    <Button size="small" variant="text" onClick={() => toggle(c.id)}>
                      {on ? "Unselect" : "Select"}
                    </Button>
                  </ListingTable.Cell>
                </ListingTable.Row>
              );
            })}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
