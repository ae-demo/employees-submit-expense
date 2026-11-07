import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import {
  Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, ListingTable, MenuItem,
  PageContent, PageTitle, Stack, TextField, Typography,
} from "@wso2/oxygen-ui";
import { TriangleAlert, Users } from "@wso2/oxygen-ui-icons-react";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { StatTile, errorLines } from "./claimsShared";

type Person = components["schemas"]["Person"];
const NONE = "none";

export function PeoplePage(): ReactElement {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [managerId, setManagerId] = useState(NONE);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await expenseApi.GET("/people", { params: { query: { limit: 100 } } });
        if (data) setPeople(data.data);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  const unassigned = (people ?? []).filter((p) => !p.managerId).length;

  const open = (p: Person): void => {
    setEditing(p);
    setManagerId(p.managerId ?? NONE);
    setFormError(null);
  };

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      const { data, error } = await expenseApi.PUT("/people/{personId}/manager", {
        params: { path: { personId: editing.id } },
        body: { managerId: managerId === NONE ? null : managerId },
      });
      if (data) {
        setPeople((all) => (all ?? []).map((p) => (p.id === data.id ? data : p)));
        setEditing(null);
      } else setFormError(errorLines(error, "The manager could not be saved.").join(" "));
    } catch {
      setFormError("The manager could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>People</PageTitle.Header>
      </PageTitle>
      {failed && (
        <Alert severity="error" sx={{ mb: 2 }}>
          People could not be loaded. Try again in a moment.
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTile label="People" value={people?.length ?? 0} hint="have signed in" icon={<Users size={16} />} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTile label="Without a manager" value={unassigned} hint="cannot submit claims" icon={<TriangleAlert size={16} />} />
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6">Employees</Typography>
        <Chip size="small" label={people?.length ?? 0} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Claims go to the employee's manager. People appear here after their first sign-in.
      </Typography>
      <ListingTable.Container>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Name</ListingTable.Cell>
              <ListingTable.Cell>Email</ListingTable.Cell>
              <ListingTable.Cell>Manager</ListingTable.Cell>
              <ListingTable.Cell />
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {people === null && !failed && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={4} align="center">
                  <CircularProgress size={20} aria-label="Loading people" />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {people?.length === 0 && (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={4}>
                  <ListingTable.EmptyState title="Nobody yet" description="People appear after they sign in for the first time." />
                </ListingTable.Cell>
              </ListingTable.Row>
            )}
            {(people ?? []).map((p) => (
              <ListingTable.Row key={p.id}>
                <ListingTable.Cell>{p.name}</ListingTable.Cell>
                <ListingTable.Cell>{p.email}</ListingTable.Cell>
                <ListingTable.Cell>{p.managerName ?? "Not assigned"}</ListingTable.Cell>
                <ListingTable.Cell align="right">
                  <ListingTable.RowActions visibility="always">
                    <Button size="small" variant="text" onClick={() => open(p)}>
                      Change manager
                    </Button>
                  </ListingTable.RowActions>
                </ListingTable.Cell>
              </ListingTable.Row>
            ))}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <form onSubmit={(e) => void save(e)}>
          <DialogTitle>{editing ? `Manager for ${editing.name}` : "Manager"}</DialogTitle>
          <DialogContent>
            <TextField
              select
              label="Manager"
              required
              fullWidth
              sx={{ mt: 1 }}
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              error={formError !== null}
              helperText={formError ?? " "}
            >
              <MenuItem value={NONE}>Not assigned</MenuItem>
              {(people ?? [])
                .filter((p) => p.id !== editing?.id)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </PageContent>
  );
}
