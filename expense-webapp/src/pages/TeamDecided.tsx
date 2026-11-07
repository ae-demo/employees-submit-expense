import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Chip, CircularProgress, ListingTable, PageContent, PageTitle, Stack, Typography } from "@wso2/oxygen-ui";
import { StatusChip, money, useTeamClaims } from "./claimsShared";

export function TeamDecidedPage(): ReactElement {
  const navigate = useNavigate();
  const { claims, failed } = useTeamClaims();
  const done = (claims ?? [])
    .filter((c) => c.status !== "Submitted")
    .sort((a, b) => (b.decidedOn ?? "").localeCompare(a.decidedOn ?? ""));

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Decided claims</PageTitle.Header>
      </PageTitle>
      {failed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Your team's claims could not be loaded. Try again in a moment.
        </Alert>
      )}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Claims you have decided</Typography>
        <Chip size="small" label={done.length} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Decisions are final; a rejected claim can be resubmitted by the employee.
      </Typography>
      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Employee</ListingTable.Cell>
              <ListingTable.Cell>Claim</ListingTable.Cell>
              <ListingTable.Cell>Decided</ListingTable.Cell>
              <ListingTable.Cell align="right">Total</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {claims === null && !failed && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5} align="center">
                  <CircularProgress size={20} aria-label="Loading claims" />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {claims !== null && done.length === 0 && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5}>
                  <ListingTable.EmptyState title="No decisions yet" description="Claims you approve or reject appear here." />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {done.map((c) => (
              <ListingTable.Row key={c.id} clickable onClick={() => navigate(`/team-review/${c.id}`)}>
                <ListingTable.Cell>{c.employeeName}</ListingTable.Cell>
                <ListingTable.Cell>{c.number}</ListingTable.Cell>
                <ListingTable.Cell>{c.decidedOn}</ListingTable.Cell>
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
