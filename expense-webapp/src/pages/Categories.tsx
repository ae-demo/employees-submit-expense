import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import {
  Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, ListingTable,
  PageContent, PageTitle, Stack, TextField, Typography,
} from "@wso2/oxygen-ui";
import { expenseApi } from "../api";
import { money, errorLines, type Category } from "./claimsShared";

type Editing = Category | "new";

export function CategoriesPage(): ReactElement {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [name, setName] = useState("");
  const [maximum, setMaximum] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [maxError, setMaxError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await expenseApi.GET("/categories", { params: { query: { limit: 100 } } });
        if (data) setCategories(data.data);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  const replace = (c: Category): void =>
    setCategories((all) => (all ?? []).map((x) => (x.id === c.id ? c : x)));

  const open = (target: Editing): void => {
    setEditing(target);
    setName(target === "new" ? "" : target.name);
    setMaximum(target === "new" || target.maximumCents == null ? "" : (target.maximumCents / 100).toFixed(2));
    setNameError(null);
    setMaxError(null);
    setFormError(null);
  };

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editing) return;
    const trimmed = name.trim();
    const raw = maximum.trim();
    const amount = raw === "" ? null : Number(raw);
    const nErr = trimmed === "" ? "Enter a name" : null;
    const mErr = amount !== null && (!Number.isFinite(amount) || amount <= 0) ? "Enter an amount above zero" : null;
    setNameError(nErr);
    setMaxError(mErr);
    setFormError(null);
    if (nErr || mErr) return;
    const body = { name: trimmed, maximumCents: amount === null ? null : Math.round(amount * 100) };
    setBusy(true);
    try {
      if (editing === "new") {
        const { data, error } = await expenseApi.POST("/categories", { body });
        if (data) {
          setCategories((all) => [...(all ?? []), data]);
          setEditing(null);
        } else setFormError(errorLines(error, "The category could not be saved.").join(" "));
      } else {
        const { data, error } = await expenseApi.PUT("/categories/{categoryId}", {
          params: { path: { categoryId: editing.id } },
          body,
        });
        if (data) {
          replace(data);
          setEditing(null);
        } else setFormError(errorLines(error, "The category could not be saved.").join(" "));
      }
    } catch {
      setFormError("The category could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const removeMaximum = async (c: Category): Promise<void> => {
    setBusy(true);
    setRowError(null);
    try {
      const { data, error } = await expenseApi.PUT("/categories/{categoryId}", {
        params: { path: { categoryId: c.id } },
        body: { name: c.name, maximumCents: null },
      });
      if (data) replace(data);
      else setRowError(errorLines(error, `The maximum of ${c.name} could not be removed.`).join(" "));
    } catch {
      setRowError(`The maximum of ${c.name} could not be removed.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Expense limits</PageTitle.Header>
      </PageTitle>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">Categories</Typography>
              {categories && <Chip size="small" label={categories.length} />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              The maximum applies to each expense line. A claim with a line over its maximum cannot be submitted.
            </Typography>
          </Stack>
          <Button variant="contained" onClick={() => open("new")}>
            Add category
          </Button>
        </Stack>
        {failed && <Alert severity="error">The categories could not be loaded.</Alert>}
        {rowError && <Alert severity="error">{rowError}</Alert>}
        <ListingTable.Container>
          <ListingTable>
            <ListingTable.Head>
              <ListingTable.Row>
                <ListingTable.Cell>Category</ListingTable.Cell>
                <ListingTable.Cell align="right">Maximum per line</ListingTable.Cell>
                <ListingTable.Cell />
              </ListingTable.Row>
            </ListingTable.Head>
            <ListingTable.Body>
              {categories === null && !failed && (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={3} align="center">
                    <CircularProgress size={20} aria-label="Loading categories" />
                  </ListingTable.Cell>
                </ListingTable.Row>
              )}
              {categories?.length === 0 && (
                <ListingTable.Row>
                  <ListingTable.Cell colSpan={3}>
                    <ListingTable.EmptyState
                      title="No categories"
                      description="Add a category so employees can classify their expenses."
                    />
                  </ListingTable.Cell>
                </ListingTable.Row>
              )}
              {(categories ?? []).map((c) => (
                <ListingTable.Row key={c.id}>
                  <ListingTable.Cell>{c.name}</ListingTable.Cell>
                  <ListingTable.Cell align="right">
                    {c.maximumCents == null ? "No maximum" : money(c.maximumCents)}
                  </ListingTable.Cell>
                  <ListingTable.Cell align="right">
                    <ListingTable.RowActions visibility="always">
                      <Button size="small" variant="text" onClick={() => open(c)}>
                        Edit
                      </Button>
                      {c.maximumCents != null && (
                        <Button size="small" variant="text" disabled={busy} onClick={() => void removeMaximum(c)}>
                          Remove maximum
                        </Button>
                      )}
                    </ListingTable.RowActions>
                  </ListingTable.Cell>
                </ListingTable.Row>
              ))}
            </ListingTable.Body>
          </ListingTable>
        </ListingTable.Container>
      </Stack>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <form onSubmit={(e) => void save(e)} noValidate>
          <DialogTitle>{editing && editing !== "new" ? `Edit ${editing.name}` : "Add category"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={nameError !== null}
                helperText={nameError ?? " "}
              />
              <TextField
                label="Maximum per line (leave empty for no maximum)"
                type="number"
                value={maximum}
                onChange={(e) => setMaximum(e.target.value)}
                error={maxError !== null}
                helperText={maxError ?? "In dollars, for example 50.00."}
                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
              />
            </Stack>
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
