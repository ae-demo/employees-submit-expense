import { useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertTitle, AppBreadcrumbs, Button, Card, CardContent, CardHeader, Chip, Grid, ListingTable, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import { Link as RouterLink } from "react-router-dom";
import { expenseApi } from "../api";
import { StatusChip, errorLines, isEditable, money, useMyClaim } from "./claimsShared";

function Field({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Grid size={{ xs: 12, md: 4 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Grid>
  );
}

export function ClaimDetailPage(): ReactElement {
  const { claim: claimId } = useParams();
  const navigate = useNavigate();
  const { state } = useMyClaim(claimId);
  const [error, setError] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (state.kind === "loading") {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Claim</PageTitle.Header>
        </PageTitle>
        <Typography variant="body2" color="text.secondary">
          Loading claim…
        </Typography>
      </PageContent>
    );
  }
  if (state.kind !== "ready") {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Claim</PageTitle.Header>
        </PageTitle>
        <Alert severity={state.kind === "notFound" ? "warning" : "error"}>
          {state.kind === "notFound" ? "This claim does not exist or is not yours." : "The claim could not be loaded."}
        </Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate("/my-claims")}>
          My claims
        </Button>
      </PageContent>
    );
  }

  const claim = state.value;
  const withdraw = async (): Promise<void> => {
    setBusy(true);
    setError([]);
    try {
      const { data, error: err } = await expenseApi.POST("/me/claims/{claimId}/withdraw", { params: { path: { claimId: claim.id } } });
      if (data) navigate("/my-claims");
      else setError(errorLines(err, "The claim could not be withdrawn."));
    } catch {
      setError(["The claim could not be withdrawn."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "claims", label: "My claims", onClick: () => navigate("/my-claims") },
          { key: "claim", label: claim.number },
        ]}
        sx={{ mb: 1 }}
      />
      <PageTitle>
        <PageTitle.Header>{`${claim.number}: ${claim.description}`}</PageTitle.Header>
        <PageTitle.Actions>
          {claim.status === "Submitted" && (
            <Button variant="outlined" disabled={busy} onClick={() => void withdraw()}>
              Withdraw
            </Button>
          )}
          {isEditable(claim.status) && (
            <Button variant="contained" component={RouterLink} to={`/claim-form/${claim.id}`}>
              {claim.status === "Rejected" ? "Correct and resubmit" : claim.status === "Draft" ? "Continue editing" : "Edit claim"}
            </Button>
          )}
        </PageTitle.Actions>
      </PageTitle>
      <Stack spacing={2}>
        <div>
          <StatusChip status={claim.status} />
        </div>
        {claim.status === "Rejected" && (
          <Alert severity="error">
            <AlertTitle>Rejected by your manager</AlertTitle>
            {claim.rejectionReason}
          </Alert>
        )}
        {error.length > 0 && (
          <Alert severity="error">
            {error.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </Alert>
        )}
        <Card variant="outlined">
          <CardHeader title="Claim" />
          <CardContent>
            <Grid container spacing={2}>
              <Field label="Total" value={money(claim.totalCents)} />
              <Field label="Submitted" value={claim.submittedOn ?? "Not submitted"} />
              <Field label="Decided" value={claim.decidedOn ?? "Waiting for your manager"} />
            </Grid>
          </CardContent>
        </Card>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">Expense lines</Typography>
          <Chip size="small" label={claim.lines.length} />
        </Stack>
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Date</ListingTable.Cell>
                <ListingTable.Cell>Category</ListingTable.Cell>
                <ListingTable.Cell>Description</ListingTable.Cell>
                <ListingTable.Cell align="right">Amount</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {claim.lines.length === 0 && (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={4}>
                    <ListingTable.EmptyState title="No expense lines" description="Lines added to this claim appear here." />
                  </ListingTable.Cell>
                </ListingTable.Row>
              )}
              {claim.lines.map((l) => (
                <ListingTable.Row key={l.id}>
                  <ListingTable.Cell>{l.expenseDate}</ListingTable.Cell>
                  <ListingTable.Cell>{l.category}</ListingTable.Cell>
                  <ListingTable.Cell>{l.description}</ListingTable.Cell>
                  <ListingTable.Cell align="right">{money(l.amountCents)}</ListingTable.Cell>
                </ListingTable.Row>
              ))}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      </Stack>
    </PageContent>
  );
}
