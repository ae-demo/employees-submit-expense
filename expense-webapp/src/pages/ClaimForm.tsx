import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert, AlertTitle, AppBreadcrumbs, Button, Card, CardContent, CardHeader, Chip, ListingTable, MenuItem,
  PageContent, PageTitle, Stack, TextField, Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import { StatusChip, errorLines, isEditable, money, useMyClaim, type Category, type ClaimDetail } from "./claimsShared";

const today = (): string => new Date().toISOString().slice(0, 10);

type Line = ClaimDetail["lines"][number];

function Issues({ lines }: { lines: string[] }): ReactElement | null {
  if (lines.length === 0) return null;
  return (
    <Alert severity="error">
      <AlertTitle>{lines.length > 1 ? "This claim cannot be submitted yet" : "Something needs attention"}</AlertTitle>
      {lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </Alert>
  );
}

/** First step: a claim needs only a description to be saved as a draft. */
function NewClaim(): ReactElement {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (description.trim() === "") return setIssues(["Describe what the claim is for"]);
    setBusy(true);
    try {
      const { data, error } = await expenseApi.POST("/me/claims", { body: { description: description.trim() } });
      if (data) navigate(`/claim-form/${data.id}`);
      else setIssues(errorLines(error, "The claim could not be saved."));
    } catch {
      setIssues(["The claim could not be saved."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[{ key: "claims", label: "My claims", onClick: () => navigate("/my-claims") }, { key: "new", label: "New claim" }]}
        sx={{ mb: 1 }}
      />
      <PageTitle>
        <PageTitle.Header>New claim</PageTitle.Header>
      </PageTitle>
      <Card variant="outlined" component="form" onSubmit={(e: FormEvent) => void save(e)}>
        <CardHeader title="Claim details" />
        <CardContent>
          <Stack spacing={2}>
            <Issues lines={issues} />
            <TextField
              label="Description"
              required
              placeholder="What are these expenses for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button type="submit" variant="contained" disabled={busy}>
                Save draft
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </PageContent>
  );
}

function LineForm({
  claimId, categories, editing, onDone, onCancel,
}: {
  claimId: string;
  categories: Category[];
  editing: Line | null;
  onDone: () => Promise<void>;
  onCancel: () => void;
}): ReactElement {
  const initialCategory = editing ? (categories.find((c) => c.name === editing.category)?.id ?? "") : "";
  const [date, setDate] = useState(editing?.expenseDate ?? today());
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [amount, setAmount] = useState(editing ? (editing.amountCents / 100).toFixed(2) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    const found: string[] = [];
    if (!date) found.push("Choose the date of the expense");
    if (!categoryId) found.push("Choose a category");
    if (!Number.isFinite(cents) || cents < 1) found.push("Enter an amount greater than zero");
    if (description.trim() === "") found.push("Describe the expense");
    setIssues(found);
    if (found.length > 0) return;
    setBusy(true);
    const body = { expenseDate: date, categoryId, amountCents: cents, description: description.trim() };
    try {
      const params = { path: { claimId, lineId: editing?.id ?? "" } };
      const { error, response } = editing
        ? await expenseApi.PUT("/me/claims/{claimId}/lines/{lineId}", { params, body })
        : await expenseApi.POST("/me/claims/{claimId}/lines", { params: { path: { claimId } }, body });
      if (response.ok) {
        await onDone();
        if (!editing) {
          setAmount("");
          setDescription("");
        }
      } else setIssues(errorLines(error, "The line could not be saved."));
    } catch {
      setIssues(["The line could not be saved."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined" component="form" onSubmit={(e: FormEvent) => void save(e)}>
      <CardHeader title={editing ? "Edit expense line" : "Add an expense line"} />
      <CardContent>
        <Stack spacing={2}>
          <Issues lines={issues} />
          <TextField
            label="Date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField select label="Category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Amount"
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
          />
          <TextField label="Description" required value={description} onChange={(e) => setDescription(e.target.value)} />
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            {editing && (
              <Button variant="outlined" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="outlined" disabled={busy}>
              {editing ? "Save line" : "Add line"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EditClaim({ claimId }: { claimId: string }): ReactElement {
  const navigate = useNavigate();
  const { state, reload, set } = useMyClaim(claimId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [editing, setEditing] = useState<Line | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await expenseApi.GET("/categories", { params: { query: { limit: 100 } } });
        if (data) setCategories(data.data);
      } catch {
        setIssues(["Categories could not be loaded."]);
      }
    })();
  }, []);

  if (state.kind !== "ready") {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Edit claim</PageTitle.Header>
        </PageTitle>
        {state.kind === "loading" ? (
          <Typography variant="body2" color="text.secondary">
            Loading claim…
          </Typography>
        ) : (
          <Alert severity={state.kind === "notFound" ? "warning" : "error"}>
            {state.kind === "notFound" ? "This claim does not exist or is not yours." : "The claim could not be loaded."}
          </Alert>
        )}
      </PageContent>
    );
  }

  const claim = state.value;
  const editable = isEditable(claim.status);
  const limits = categories
    .filter((c) => c.maximumCents !== null && c.maximumCents !== undefined)
    .map((c) => `${c.name} ${money(c.maximumCents ?? 0)}`)
    .join(", ");

  const run = async (fn: () => Promise<{ ok: boolean; error?: unknown }>, fallback: string): Promise<boolean> => {
    setBusy(true);
    setIssues([]);
    try {
      const r = await fn();
      if (!r.ok) setIssues(errorLines(r.error, fallback));
      return r.ok;
    } catch {
      setIssues([fallback]);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const next = (description ?? claim.description).trim();
    if (next === "") return setIssues(["Describe what the claim is for"]);
    await run(async () => {
      const { data, error } = await expenseApi.PUT("/me/claims/{claimId}", { params: { path: { claimId } }, body: { description: next } });
      if (data) {
        set(data);
        setDescription(null);
        setSaved(true);
      }
      return { ok: !!data, error };
    }, "The details could not be saved.");
  };

  const submit = async (): Promise<void> => {
    if (claim.status === "Submitted") return navigate(`/claim-detail/${claimId}`);
    const ok = await run(async () => {
      const { data, error } = await expenseApi.POST("/me/claims/{claimId}/submit", { params: { path: { claimId } } });
      return { ok: !!data, error };
    }, "The claim could not be submitted.");
    if (ok) navigate(`/claim-detail/${claimId}`);
  };

  const removeLine = async (lineId: string): Promise<void> => {
    const ok = await run(async () => {
      const { response, error } = await expenseApi.DELETE("/me/claims/{claimId}/lines/{lineId}", { params: { path: { claimId, lineId } } });
      return { ok: response.ok, error };
    }, "The line could not be removed.");
    if (ok) {
      if (editing?.id === lineId) setEditing(null);
      await reload();
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
        <PageTitle.Header>{`Edit ${claim.number}`}</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="outlined" component={RouterLink} to={`/claim-detail/${claimId}`}>
            View claim
          </Button>
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
        {!editable && (
          <Alert severity="info">
            <AlertTitle>This claim is decided</AlertTitle>
            Approved and exported claims can no longer be changed.
          </Alert>
        )}
        <Issues lines={issues} />
        {saved && issues.length === 0 && <Alert severity="success">Details saved.</Alert>}
        <Card variant="outlined" component="form" onSubmit={(e: FormEvent) => void saveDetails(e)}>
          <CardHeader title="Claim details" />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Description"
                required
                disabled={!editable}
                value={description ?? claim.description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {editable && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button type="submit" variant="outlined" disabled={busy}>
                    Save details
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">Expense lines</Typography>
              <Chip size="small" label={claim.lines.length} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {`Total ${money(claim.totalCents)}.${limits ? ` Maximum per line: ${limits}.` : ""}`}
            </Typography>
          </Stack>
          {editable && (
            <Button variant="contained" disabled={busy} onClick={() => void submit()}>
              {claim.status === "Submitted" ? "Save and keep submitted" : "Submit to manager"}
            </Button>
          )}
        </Stack>
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Date</ListingTable.Cell>
                <ListingTable.Cell>Category</ListingTable.Cell>
                <ListingTable.Cell>Description</ListingTable.Cell>
                <ListingTable.Cell align="right">Amount</ListingTable.Cell>
                <ListingTable.Cell />
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {claim.lines.length === 0 && (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={5}>
                    <ListingTable.EmptyState title="No expense lines" description="Add the first expense below." />
                  </ListingTable.Cell>
                </ListingTable.Row>
              )}
              {claim.lines.map((l) => (
                <ListingTable.Row key={l.id}>
                  <ListingTable.Cell>{l.expenseDate}</ListingTable.Cell>
                  <ListingTable.Cell>{l.category}</ListingTable.Cell>
                  <ListingTable.Cell>{l.description}</ListingTable.Cell>
                  <ListingTable.Cell align="right">{money(l.amountCents)}</ListingTable.Cell>
                  <ListingTable.Cell>
                    {editable && (
                      <ListingTable.RowActions visibility="always">
                        <Button size="small" variant="text" onClick={() => setEditing(l)}>
                          Edit line
                        </Button>
                        <Button size="small" variant="text" color="error" disabled={busy} onClick={() => void removeLine(l.id)}>
                          Remove line
                        </Button>
                      </ListingTable.RowActions>
                    )}
                  </ListingTable.Cell>
                </ListingTable.Row>
              ))}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
        {editable && (
          <LineForm
            key={editing?.id ?? "new"}
            claimId={claimId}
            categories={categories}
            editing={editing}
            onCancel={() => setEditing(null)}
            onDone={async () => {
              setEditing(null);
              await reload();
            }}
          />
        )}
      </Stack>
    </PageContent>
  );
}

export function ClaimFormPage(): ReactElement {
  const { claim } = useParams();
  if (!claim || claim === "new") return <NewClaim />;
  return <EditClaim claimId={claim} />;
}
