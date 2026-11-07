import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, AlertTitle, AppBreadcrumbs, Button, Card, CardContent, CardHeader, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, ListingTable, PageContent, PageTitle, Stack, TextField, Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import { ReceiptLinks } from "./receipts";
import { StatusChip, errorLines, money, useTeamClaim } from "./claimsShared";

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

export function TeamReviewPage(): ReactElement {
  const { claim: claimId } = useParams();
  const navigate = useNavigate();
  const { state } = useTeamClaim(claimId);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [error, setError] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (state.kind !== "ready") {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Review claim</PageTitle.Header>
        </PageTitle>
        {state.kind === "loading" ? (
          <Typography variant="body2" color="text.secondary">
            Loading claim…
          </Typography>
        ) : (
          <>
            <Alert severity={state.kind === "notFound" ? "warning" : "error"}>
              {state.kind === "notFound" ? "This claim does not exist or is not from your team." : "The claim could not be loaded."}
            </Alert>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate("/team-queue")}>
              Team approvals
            </Button>
          </>
        )}
      </PageContent>
    );
  }

  const claim = state.value;
  const open = claim.status === "Submitted";

  const approve = async (): Promise<void> => {
    setBusy(true);
    setError([]);
    try {
      const { data, error: err } = await expenseApi.POST("/me/team/claims/{claimId}/approve", { params: { path: { claimId: claim.id } } });
      if (data) navigate("/team-queue");
      else setError(errorLines(err, "The claim could not be approved."));
    } catch {
      setError(["The claim could not be approved."]);
    } finally {
      setBusy(false);
    }
  };

  const reject = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (reason.trim() === "") return setReasonError("Give the employee a reason");
    setBusy(true);
    setReasonError(null);
    try {
      const { data, error: err } = await expenseApi.POST("/me/team/claims/{claimId}/reject", {
        params: { path: { claimId: claim.id } },
        body: { reason: reason.trim() },
      });
      if (data) navigate("/team-queue");
      else setReasonError(errorLines(err, "The claim could not be rejected.").join(" "));
    } catch {
      setReasonError("The claim could not be rejected.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "queue", label: "Team approvals", onClick: () => navigate("/team-queue") },
          { key: "claim", label: claim.number },
        ]}
        sx={{ mb: 1 }}
      />
      <PageTitle>
        <PageTitle.Header>{`${claim.number}: ${claim.description}`}</PageTitle.Header>
        <PageTitle.Actions>
          {open && (
            <>
              <Button variant="contained" color="error" disabled={busy} onClick={() => setRejecting(true)}>
                Reject
              </Button>
              <Button variant="contained" disabled={busy} onClick={() => void approve()}>
                Approve
              </Button>
            </>
          )}
        </PageTitle.Actions>
      </PageTitle>
      <Stack spacing={2}>
        <div>
          <StatusChip status={claim.status} />
        </div>
        {!open && (
          <Alert severity="info">
            <AlertTitle>Already decided</AlertTitle>A decided claim can no longer be changed.
          </Alert>
        )}
        {claim.status === "Rejected" && claim.rejectionReason && (
          <Alert severity="error">
            <AlertTitle>Rejection reason</AlertTitle>
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
              <Field label="Employee" value={claim.employeeName} />
              <Field label="Submitted" value={claim.submittedOn ?? "Not submitted"} />
              <Field label="Total" value={money(claim.totalCents)} />
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
                <ListingTable.Cell>Receipt</ListingTable.Cell>
                <ListingTable.Cell align="right">Amount</ListingTable.Cell>
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {claim.lines.length === 0 && (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={5}>
                    <ListingTable.EmptyState title="No expense lines" description="Lines added to this claim appear here." />
                  </ListingTable.Cell>
                </ListingTable.Row>
              )}
              {claim.lines.map((l) => (
                <ListingTable.Row key={l.id}>
                  <ListingTable.Cell>{l.expenseDate}</ListingTable.Cell>
                  <ListingTable.Cell>{l.category}</ListingTable.Cell>
                  <ListingTable.Cell>{l.description}</ListingTable.Cell>
                  <ListingTable.Cell><ReceiptLinks scope="team" claimId={claim.id} lineId={l.id} receipts={l.receipts} /></ListingTable.Cell>
                  <ListingTable.Cell align="right">{money(l.amountCents)}</ListingTable.Cell>
                </ListingTable.Row>
              ))}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      </Stack>
      <Dialog open={rejecting} onClose={() => setRejecting(false)} fullWidth maxWidth="sm">
        <form onSubmit={(e) => void reject(e)} noValidate>
          <DialogTitle>{`Reject ${claim.number}`}</DialogTitle>
          <DialogContent>
            <TextField
              label="Reason"
              required
              multiline
              minRows={3}
              fullWidth
              autoFocus
              sx={{ mt: 1 }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={reasonError !== null}
              helperText={reasonError ?? " "}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="error" disabled={busy}>
              Reject claim
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </PageContent>
  );
}
