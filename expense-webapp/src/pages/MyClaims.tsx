import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, CardContent, Chip, CircularProgress, Grid, ListingTable, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import { Clock, CircleCheck, FileText } from "@wso2/oxygen-ui-icons-react";
import { expenseApi } from "../api";
import { StatusChip, money, type ClaimSummary } from "./claimsShared";

function Tile({ label, value, hint, icon }: { label: string; value: number; hint: string; icon: ReactElement }): ReactElement {
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

export function MyClaimsPage(): ReactElement {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await expenseApi.GET("/me/claims", { params: { query: { limit: 100 } } });
        if (data) setClaims(data.data);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  const count = (s: ClaimSummary["status"]): number => (claims ?? []).filter((c) => c.status === s).length;

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My claims</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="contained" onClick={() => navigate("/claim-form/new")}>
            New claim
          </Button>
        </PageTitle.Actions>
      </PageTitle>
      {failed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Your claims could not be loaded. Try again in a moment.
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Tile label="Drafts" value={count("Draft")} hint="not yet submitted" icon={<FileText size={16} />} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Tile label="Awaiting decision" value={count("Submitted")} hint="with your manager" icon={<Clock size={16} />} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Tile label="Approved" value={count("Approved")} hint="waiting for payroll export" icon={<CircleCheck size={16} />} />
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Claims</Typography>
        <Chip size="small" label={claims?.length ?? 0} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Open a claim to see its status, lines and receipts.
      </Typography>
      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Claim</ListingTable.Cell>
              <ListingTable.Cell>Description</ListingTable.Cell>
              <ListingTable.Cell align="right">Total</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {claims === null && !failed && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={4} align="center">
                  <CircularProgress size={20} aria-label="Loading claims" />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {claims?.length === 0 && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={4}>
                  <ListingTable.EmptyState title="No claims yet" description="Create a claim to be reimbursed for work expenses." />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {(claims ?? []).map((c) => (
              <ListingTable.Row key={c.id} clickable onClick={() => navigate(`/claim-detail/${c.id}`)}>
                <ListingTable.Cell>{c.number}</ListingTable.Cell>
                <ListingTable.Cell>{c.description}</ListingTable.Cell>
                <ListingTable.Cell align="right">{money(c.totalCents)}</ListingTable.Cell>
                <ListingTable.Cell>
                  <StatusChip status={c.status} />
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
