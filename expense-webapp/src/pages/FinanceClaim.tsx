import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, AppBreadcrumbs, Button, Card, CardContent, CardHeader, Chip, Grid, ListingTable, PageContent, PageTitle, Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import { ReceiptLinks } from "./receipts";
import { StatusChip, money, type ClaimDetail, type LoadState } from "./claimsShared";

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

export function FinanceClaimPage(): ReactElement {
  const { claim: claimId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState<ClaimDetail>>({ kind: "loading" });

  useEffect(() => {
    setState({ kind: "loading" });
    if (!claimId) return setState({ kind: "notFound" });
    void (async () => {
      try {
        const { data, response } = await expenseApi.GET("/claims/{claimId}", { params: { path: { claimId } } });
        if (data) setState({ kind: "ready", value: data });
        else setState({ kind: response.status === 404 || response.status === 400 ? "notFound" : "failed" });
      } catch {
        setState({ kind: "failed" });
      }
    })();
  }, [claimId]);

  if (state.kind !== "ready") {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Approved claim</PageTitle.Header>
        </PageTitle>
        {state.kind === "loading" ? (
          <Typography variant="body2" color="text.secondary">
            Loading claim…
          </Typography>
        ) : (
          <>
            <Alert severity={state.kind === "notFound" ? "warning" : "error"}>
              {state.kind === "notFound" ? "This claim does not exist." : "The claim could not be loaded."}
            </Alert>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate("/export")}>
              Payroll export
            </Button>
          </>
        )}
      </PageContent>
    );
  }

  const claim = state.value;
  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "export", label: "Payroll export", onClick: () => navigate("/export") },
          { key: "claim", label: claim.number },
        ]}
        sx={{ mb: 1 }}
      />
      <PageTitle>
        <PageTitle.Header>{`${claim.number}: ${claim.description}`}</PageTitle.Header>
      </PageTitle>
      <Stack spacing={2}>
        <div>
          <StatusChip status={claim.status} />
        </div>
        <Card variant="outlined">
          <CardHeader title="Claim" />
          <CardContent>
            <Grid container spacing={2}>
              <Field label="Employee" value={claim.employeeName} />
              <Field label="Approved" value={claim.decidedOn ?? "Not decided"} />
              <Field label="Total" value={money(claim.totalCents)} />
            </Grid>
          </CardContent>
        </Card>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6">Expense lines and receipts</Typography>
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
                  <ListingTable.Cell><ReceiptLinks scope="all" claimId={claim.id} lineId={l.id} receipts={l.receipts} /></ListingTable.Cell>
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
