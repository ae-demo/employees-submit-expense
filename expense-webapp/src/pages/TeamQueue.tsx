import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Chip, CircularProgress, Grid, ListingTable, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import { CircleCheck, Inbox } from "@wso2/oxygen-ui-icons-react";
import { expenseApi } from "../api";
import { StatTile, errorLines, money, useTeamClaims } from "./claimsShared";

export function TeamQueuePage(): ReactElement {
  const navigate = useNavigate();
  const { claims, failed, reload } = useTeamClaims();
  const [error, setError] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const waiting = (claims ?? [])
    .filter((c) => c.status === "Submitted")
    .sort((a, b) => (a.submittedOn ?? "").localeCompare(b.submittedOn ?? ""));
  const decided = (claims ?? []).filter((c) => c.status !== "Submitted").length;

  const approve = async (claimId: string): Promise<void> => {
    setBusy(claimId);
    setError([]);
    try {
      const { data, error: err } = await expenseApi.POST("/me/team/claims/{claimId}/approve", { params: { path: { claimId } } });
      if (data) await reload();
      else setError(errorLines(err, "The claim could not be approved."));
    } catch {
      setError(["The claim could not be approved."]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Team approvals</PageTitle.Header>
      </PageTitle>
      {failed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Your team's claims could not be loaded. Try again in a moment.
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
          <StatTile label="Awaiting you" value={waiting.length} hint="claims to decide" icon={<Inbox size={16} />} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTile label="Decided" value={decided} hint="claims from your team" icon={<CircleCheck size={16} />} />
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Submitted claims</Typography>
        <Chip size="small" label={waiting.length} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Oldest first. Open a claim to see its lines and receipts, or reject it with a reason.
      </Typography>
      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Employee</ListingTable.Cell>
              <ListingTable.Cell>Claim</ListingTable.Cell>
              <ListingTable.Cell>Description</ListingTable.Cell>
              <ListingTable.Cell>Submitted</ListingTable.Cell>
              <ListingTable.Cell align="right">Total</ListingTable.Cell>
              <ListingTable.Cell />
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {claims === null && !failed && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={6} align="center">
                  <CircularProgress size={20} aria-label="Loading claims" />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {claims !== null && waiting.length === 0 && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={6}>
                  <ListingTable.EmptyState title="Nothing to approve" description="Claims from your team appear here when they are submitted." />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {waiting.map((c) => (
              <ListingTable.Row key={c.id} clickable onClick={() => navigate(`/team-review/${c.id}`)}>
                <ListingTable.Cell>{c.employeeName}</ListingTable.Cell>
                <ListingTable.Cell>{c.number}</ListingTable.Cell>
                <ListingTable.Cell>{c.description}</ListingTable.Cell>
                <ListingTable.Cell>{c.submittedOn}</ListingTable.Cell>
                <ListingTable.Cell align="right">{money(c.totalCents)}</ListingTable.Cell>
                <ListingTable.Cell align="right" onClick={(e) => e.stopPropagation()}>
                  <ListingTable.RowActions visibility="always">
                    <Button size="small" variant="text" disabled={busy === c.id} onClick={() => void approve(c.id)}>
                      Approve
                    </Button>
                  </ListingTable.RowActions>
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
