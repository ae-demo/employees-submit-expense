import { useState, type ReactNode } from "react";
import {
  Alert, AppShell, Badge, Breadcrumbs, Button, Detail, Dialog, EmptyState, Field, Form, Heading, Screen,
  Section, Stack, Stat, StatGroup, Table, Text, ValidationSummary, defineApp, useCollection, useDisplayState,
  useNav, useParams, useRole, useToday,
} from "@wso2/prototype-kit";

type ToneName = "default" | "info" | "success" | "warning" | "error";

interface Employee { id: string; name: string; email: string; manager: string }
interface Category { id: string; name: string; maximum: number | null }
interface Claim {
  id: string; number: string; employee: string; description: string; status: string;
  submittedOn: string; decidedOn: string; rejectionReason: string; exportId: string;
}
interface Line { id: string; claimId: string; date: string; category: string; amountCents: number; description: string; receipt: string }
interface Export { id: string; createdOn: string; by: string; count: number; totalCents: number; file: string }

const ME = "Maya Fernando";
const MANAGER = "Ravi Perera";
const FINANCE = "Ana Silva";
const NO_MANAGER = "Not assigned";

const employees: Employee[] = [
  { id: "e1", name: "Maya Fernando", email: "maya@acme.example", manager: "Ravi Perera" },
  { id: "e2", name: "Dan Weerasinghe", email: "dan@acme.example", manager: "Ravi Perera" },
  { id: "e3", name: "Ravi Perera", email: "ravi@acme.example", manager: "Priya Nair" },
  { id: "e4", name: "Priya Nair", email: "priya@acme.example", manager: "Not assigned" },
  { id: "e5", name: "Ana Silva", email: "ana@acme.example", manager: "Priya Nair" },
];

const categories: Category[] = [
  { id: "c1", name: "Meals", maximum: 5000 },
  { id: "c2", name: "Travel", maximum: 30000 },
  { id: "c3", name: "Accommodation", maximum: 20000 },
  { id: "c4", name: "Office supplies", maximum: null },
];

const claims: Claim[] = [
  { id: "cl1", number: "EXP-1041", employee: "Maya Fernando", description: "Client visit, Colombo", status: "Draft", submittedOn: "", decidedOn: "", rejectionReason: "", exportId: "" },
  { id: "cl2", number: "EXP-1042", employee: "Maya Fernando", description: "Conference trip", status: "Submitted", submittedOn: "2026-01-12", decidedOn: "", rejectionReason: "", exportId: "" },
  { id: "cl3", number: "EXP-1038", employee: "Maya Fernando", description: "Team lunch", status: "Rejected", submittedOn: "2026-01-07", decidedOn: "2026-01-12", rejectionReason: "The lunch was above the team lunch budget. Split it or ask for an exception.", exportId: "" },
  { id: "cl4", number: "EXP-1030", employee: "Maya Fernando", description: "Taxi in December", status: "Approved", submittedOn: "2025-12-22", decidedOn: "2026-01-05", rejectionReason: "", exportId: "" },
  { id: "cl5", number: "EXP-1022", employee: "Maya Fernando", description: "Airport transfers", status: "Exported", submittedOn: "2025-12-13", decidedOn: "2025-12-15", rejectionReason: "", exportId: "x1" },
  { id: "cl6", number: "EXP-1044", employee: "Dan Weerasinghe", description: "Training books", status: "Submitted", submittedOn: "2026-01-09", decidedOn: "", rejectionReason: "", exportId: "" },
  { id: "cl7", number: "EXP-1035", employee: "Dan Weerasinghe", description: "Hotel in Kandy", status: "Approved", submittedOn: "2026-01-04", decidedOn: "2026-01-12", rejectionReason: "", exportId: "" },
];

const lines: Line[] = [
  { id: "l1", claimId: "cl1", date: "2026-01-10", category: "Travel", amountCents: 4200, description: "Taxi to client office", receipt: "taxi-0110.pdf" },
  { id: "l2", claimId: "cl1", date: "2026-01-10", category: "Meals", amountCents: 3600, description: "Client lunch", receipt: "" },
  { id: "l3", claimId: "cl2", date: "2026-01-08", category: "Accommodation", amountCents: 18000, description: "Hotel, one night", receipt: "hotel.pdf" },
  { id: "l4", claimId: "cl2", date: "2026-01-08", category: "Travel", amountCents: 12500, description: "Return flight", receipt: "flight.pdf" },
  { id: "l5", claimId: "cl3", date: "2026-01-06", category: "Meals", amountCents: 4800, description: "Team lunch", receipt: "" },
  { id: "l6", claimId: "cl4", date: "2025-12-20", category: "Travel", amountCents: 2750, description: "Taxi", receipt: "taxi.jpg" },
  { id: "l7", claimId: "cl5", date: "2025-12-12", category: "Travel", amountCents: 6400, description: "Airport transfers", receipt: "transfer.pdf" },
  { id: "l8", claimId: "cl6", date: "2026-01-09", category: "Office supplies", amountCents: 5900, description: "Training books", receipt: "books.pdf" },
  { id: "l9", claimId: "cl7", date: "2026-01-02", category: "Accommodation", amountCents: 19500, description: "Hotel in Kandy", receipt: "kandy.pdf" },
];

const exportsData: Export[] = [
  { id: "x1", createdOn: "2025-12-31", by: "Ana Silva", count: 1, totalCents: 6400, file: "claims-2025-12-31.csv" },
];

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const totalOf = (all: readonly Line[], claimId: string) =>
  all.filter((l) => l.claimId === claimId).reduce((sum, l) => sum + l.amountCents, 0);
const tone = (status: string): ToneName =>
  status === "Approved" ? "success" : status === "Rejected" ? "error" : status === "Submitted" ? "warning" : status === "Exported" ? "info" : "default";

function Shell({ children }: { children: ReactNode }) {
  const role = useRole();
  const user =
    role === "Manager" ? { name: MANAGER, email: "ravi@acme.example" }
    : role === "FinanceOfficer" ? { name: FINANCE, email: "ana@acme.example" }
    : { name: ME, email: "maya@acme.example" };
  return (
    <AppShell
      id="shell"
      user={user}
      nav={[
        { id: "nav.my-claims", label: "My claims", to: "screen.my-claims" },
        { id: "nav.team-queue", label: "Team approvals", to: "screen.team-queue" },
        { id: "nav.team-decided", label: "Decided claims", to: "screen.team-decided" },
        { id: "nav.export", label: "Payroll export", to: "screen.export" },
        { id: "nav.export-history", label: "Export history", to: "screen.export-history" },
        { id: "nav.categories", label: "Expense limits", to: "screen.categories" },
        { id: "nav.people", label: "People", to: "screen.people" },
      ]}
      account="screen.account"
      signOut="screen.signed-out"
    >
      {children}
    </AppShell>
  );
}

function ReadLines({ id, items }: { id: string; items: readonly Line[] }) {
  return (
    <Table
      id={id}
      columns={["Date", "Category", "Description", "Receipt", { label: "Amount", kind: "number" }]}
      rows={items.map((l) => ({
        id: `${id}.${l.id}`,
        cells: [l.date, l.category, l.description, l.receipt === "" ? "No receipt" : l.receipt, money(l.amountCents)],
      }))}
      empty={<EmptyState id={`${id}.empty`} title="No expense lines" text="Lines added to this claim appear here." />}
    />
  );
}

function MyClaims() {
  const state = useDisplayState();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const mine = state === "state.empty" ? [] : all.items.filter((c) => c.employee === ME);
  const count = (s: string) => mine.filter((c) => c.status === s).length;
  return (
    <Shell>
      <Heading id="heading.my-claims" text="My claims" />
      <StatGroup>
        <Stat id="stat.drafts" label="Drafts" value={String(count("Draft"))} hint="not yet submitted" icon="FileText" />
        <Stat id="stat.waiting" label="Awaiting decision" value={String(count("Submitted"))} hint="with your manager" icon="Clock" tone="warning" />
        <Stat id="stat.approved" label="Approved" value={String(count("Approved"))} hint="waiting for payroll export" icon="CircleCheck" tone="success" />
      </StatGroup>
      <Section
        id="section.claims"
        title="Claims"
        count={mine.length}
        subtitle="Open a claim to see its status, lines and receipts."
        actions={<Button id="btn.new-claim" label="New claim" emphasis="primary" to="screen.claim-form" params={{ claim: "new" }} />}
      >
        <Table
          id="table.claims"
          columns={["Claim", "Description", { label: "Total", kind: "number" }, { label: "Status", kind: "status" }]}
          rows={mine.map((c) => ({
            id: `claim.${c.id}`,
            cells: [c.number, c.description, money(totalOf(lineItems.items, c.id))],
            status: { text: c.status, tone: tone(c.status) },
            to: "screen.claim-detail",
            params: { claim: c.id },
          }))}
          empty={<EmptyState id="empty.claims" title="No claims yet" text="Create a claim to be reimbursed for work expenses." />}
        />
      </Section>
    </Shell>
  );
}

function ClaimForm() {
  const { claim: cid } = useParams();
  const state = useDisplayState();
  const navigate = useNav();
  const today = useToday();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const cats = useCollection<Category>("categories");
  const [attachTo, setAttachTo] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const isNew = cid === "new";
  const claim = isNew
    ? undefined
    : (cid ? all.get(cid) : undefined) ?? all.items.find((c) => c.employee === ME && c.status === "Draft");
  const mine = claim ? lineItems.items.filter((l) => l.claimId === claim.id) : [];
  const editable = claim !== undefined && (claim.status === "Draft" || claim.status === "Submitted" || claim.status === "Rejected");
  const limits = cats.items
    .filter((c) => c.maximum !== null)
    .map((c) => `${c.name} ${money(c.maximum ?? 0)}`)
    .join(", ");
  const shown =
    state === "state.validation-error" && issues.length === 0
      ? ["Taxi to client office (Travel): $450.00 is over the $300.00 maximum."]
      : issues;

  const submit = () => {
    if (!claim) return;
    const found: string[] = [];
    if (mine.length === 0) found.push("Add at least one expense line before submitting.");
    for (const l of mine) {
      const max = cats.items.find((c) => c.name === l.category)?.maximum;
      if (max !== null && max !== undefined && l.amountCents > max) {
        found.push(`${l.description} (${l.category}): ${money(l.amountCents)} is over the ${money(max)} maximum.`);
      }
    }
    setIssues(found);
    if (found.length === 0) {
      all.update(claim.id, { status: "Submitted", submittedOn: today, rejectionReason: "" });
      navigate.go("screen.claim-detail", { claim: claim.id });
    }
  };

  if (!claim) {
    return (
      <Shell>
        <Breadcrumbs id="crumbs.form" items={[{ id: "crumb.claims", label: "My claims", to: "screen.my-claims" }, { id: "crumb.new", label: "New claim" }]} />
        <Heading id="heading.new-claim" text="New claim" />
        <Form
          id="form.new-claim"
          title="Claim details"
          onSubmit={(values) => {
            const id = all.create({
              number: `EXP-${1050 + all.items.length}`, employee: ME, description: values.description ?? "",
              status: "Draft", submittedOn: "", decidedOn: "", rejectionReason: "", exportId: "",
            });
            navigate.go("screen.claim-form", { claim: id });
          }}
          actions={<Button id="btn.create-claim" label="Save draft" emphasis="primary" submit />}
        >
          <Field
            id="field.description"
            name="description"
            label="Description"
            required
            placeholder="What are these expenses for?"
            error={state === "state.validation-error" ? "Describe what the claim is for" : undefined}
          />
        </Form>
      </Shell>
    );
  }

  return (
    <Shell>
      <Breadcrumbs id="crumbs.form" items={[{ id: "crumb.claims", label: "My claims", to: "screen.my-claims" }, { id: "crumb.claim", label: claim.number }]} />
      <Heading id="heading.edit-claim" text={`Edit ${claim.number}`} />
      {claim.status === "Rejected" && (
        <Alert id="alert.rejected" tone="error" title="Rejected by your manager" text={claim.rejectionReason} />
      )}
      {!editable && (
        <Alert id="alert.locked" tone="info" title="This claim is decided" text="Approved and exported claims can no longer be changed." />
      )}
      {shown.length > 0 && <ValidationSummary id="summary.submit" issues={shown} />}
      <Form
        id="form.details"
        title="Claim details"
        onSubmit={(values) => all.update(claim.id, { description: values.description ?? claim.description })}
        actions={editable ? <Button id="btn.save-details" label="Save details" submit /> : undefined}
      >
        <Field id="field.description" name="description" label="Description" required defaultValue={claim.description} />
      </Form>
      <Section
        id="section.lines"
        title="Expense lines"
        count={mine.length}
        subtitle={`Total ${money(totalOf(lineItems.items, claim.id))}. Maximum per line: ${limits}.`}
        actions={editable ? <Button id="btn.submit" label={claim.status === "Submitted" ? "Save and keep submitted" : "Submit to manager"} emphasis="primary" onPress={submit} /> : undefined}
      >
        <Table
          id="table.lines"
          columns={["Date", "Category", "Description", "Receipt", { label: "Amount", kind: "number" }]}
          rows={mine.map((l) => ({
            id: `line.${l.id}`,
            cells: [l.date, l.category, l.description, l.receipt === "" ? "No receipt" : l.receipt, money(l.amountCents)],
            actions: editable
              ? [
                  l.receipt === ""
                    ? { id: `line.${l.id}.attach`, label: "Attach receipt", onPress: () => setAttachTo(l.id) }
                    : { id: `line.${l.id}.detach`, label: "Remove receipt", onPress: () => lineItems.update(l.id, { receipt: "" }) },
                  { id: `line.${l.id}.remove`, label: "Remove line", emphasis: "danger" as const, onPress: () => lineItems.remove(l.id) },
                ]
              : [],
          }))}
          empty={<EmptyState id="empty.lines" title="No expense lines" text="Add the first expense below." />}
        />
      </Section>
      {editable && (
        <Form
          id="form.add-line"
          title="Add an expense line"
          onSubmit={(values) =>
            lineItems.create({
              claimId: claim.id,
              date: values.date ?? today,
              category: values.category ?? "Meals",
              amountCents: Math.round(Number(values.amount ?? "0") * 100),
              description: values.description ?? "",
              receipt: values.receipt ?? "",
            })
          }
          actions={<Button id="btn.add-line" label="Add line" submit />}
        >
          <Field id="field.date" name="date" label="Date" type="date" defaultValue={today} required />
          <Field id="field.category" name="category" label="Category" type="select" options={cats.items.map((c) => c.name)} defaultValue="Meals" required />
          <Field id="field.amount" name="amount" label="Amount" type="number" required />
          <Field id="field.line-description" name="description" label="Description" required />
          <Field id="field.receipt" name="receipt" label="Receipt file (optional)" placeholder="receipt.pdf" />
          <Text id="text.receipt-help" text="Receipts are images or PDFs, up to 10 MB." />
        </Form>
      )}
      <Dialog id="dialog.attach" title="Attach a receipt" open={attachTo !== null} onClose={() => setAttachTo(null)}>
        <Form
          id="form.attach"
          onSubmit={(values) => {
            if (attachTo !== null) lineItems.update(attachTo, { receipt: values.receipt ?? "" });
            setAttachTo(null);
          }}
          actions={<Button id="btn.attach" label="Attach" emphasis="primary" submit />}
        >
          <Field id="field.attach-receipt" name="receipt" label="Receipt file" placeholder="receipt.pdf" required />
        </Form>
      </Dialog>
    </Shell>
  );
}

function ClaimDetail() {
  const { claim: cid } = useParams();
  const navigate = useNav();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const claim = (cid ? all.get(cid) : undefined) ?? all.items.find((c) => c.employee === ME)!;
  const mine = lineItems.items.filter((l) => l.claimId === claim.id);
  const canEdit = claim.status === "Draft" || claim.status === "Submitted" || claim.status === "Rejected";
  const actions = (
    <Stack direction="row">
      {canEdit && (
        <Button
          id="btn.edit"
          label={claim.status === "Rejected" ? "Correct and resubmit" : claim.status === "Draft" ? "Continue editing" : "Edit claim"}
          emphasis="primary"
          to="screen.claim-form"
          params={{ claim: claim.id }}
        />
      )}
      {claim.status === "Submitted" && (
        <Button
          id="btn.withdraw"
          label="Withdraw"
          onPress={() => {
            all.update(claim.id, { status: "Draft", submittedOn: "" });
            navigate.go("screen.my-claims");
          }}
        />
      )}
    </Stack>
  );
  return (
    <Shell>
      <Breadcrumbs id="crumbs.detail" items={[{ id: "crumb.claims", label: "My claims", to: "screen.my-claims" }, { id: "crumb.claim", label: claim.number }]} />
      <Heading id="heading.claim" text={`${claim.number}: ${claim.description}`} actions={actions} />
      <Badge id="badge.status" label={claim.status} tone={tone(claim.status)} />
      {claim.status === "Rejected" && (
        <Alert id="alert.rejected" tone="error" title="Rejected by your manager" text={claim.rejectionReason} />
      )}
      <Detail
        id="detail.claim"
        fields={[
          { label: "Total", value: money(totalOf(lineItems.items, claim.id)) },
          { label: "Submitted", value: claim.submittedOn === "" ? "Not submitted" : claim.submittedOn },
          { label: "Decided", value: claim.decidedOn === "" ? "Waiting for your manager" : claim.decidedOn },
        ]}
      />
      <Section id="section.lines" title="Expense lines" count={mine.length}>
        <ReadLines id="table.claim-lines" items={mine} />
      </Section>
    </Shell>
  );
}

function TeamQueue() {
  const state = useDisplayState();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const people = useCollection<Employee>("employees");
  const team = people.items.filter((e) => e.manager === MANAGER).map((e) => e.name);
  const waiting = state === "state.empty"
    ? []
    : all.items.filter((c) => c.status === "Submitted" && team.includes(c.employee)).sort((a, b) => a.submittedOn.localeCompare(b.submittedOn));
  const decided = all.items.filter((c) => (c.status === "Approved" || c.status === "Rejected" || c.status === "Exported") && team.includes(c.employee)).length;
  return (
    <Shell>
      <Heading id="heading.team-queue" text="Team approvals" />
      <StatGroup>
        <Stat id="stat.waiting" label="Awaiting you" value={String(waiting.length)} hint="claims to decide" icon="Inbox" tone="warning" />
        <Stat id="stat.decided" label="Decided" value={String(decided)} hint="claims from your team" icon="CircleCheck" tone="success" />
      </StatGroup>
      <Section id="section.queue" title="Submitted claims" count={waiting.length} subtitle="Oldest first. Open a claim to see its lines and receipts, or reject it with a reason.">
        <Table
          id="table.queue"
          columns={["Employee", "Claim", "Description", "Submitted", { label: "Total", kind: "number" }]}
          rows={waiting.map((c) => ({
            id: `queue.${c.id}`,
            cells: [c.employee, c.number, c.description, c.submittedOn, money(totalOf(lineItems.items, c.id))],
            to: "screen.team-review",
            params: { claim: c.id },
            actions: [{ id: `queue.${c.id}.approve`, label: "Approve", onPress: () => all.update(c.id, { status: "Approved", decidedOn: "2026-01-15" }) }],
          }))}
          empty={<EmptyState id="empty.queue" title="Nothing to approve" text="Claims from your team appear here when they are submitted." />}
        />
      </Section>
    </Shell>
  );
}

function TeamReview() {
  const { claim: cid } = useParams();
  const state = useDisplayState();
  const navigate = useNav();
  const today = useToday();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const people = useCollection<Employee>("employees");
  const [rejecting, setRejecting] = useState(false);
  const team = people.items.filter((e) => e.manager === MANAGER).map((e) => e.name);
  const claim =
    (cid ? all.get(cid) : undefined) ??
    all.items.find((c) => c.status === "Submitted" && team.includes(c.employee)) ??
    all.items.find((c) => team.includes(c.employee))!;
  const mine = lineItems.items.filter((l) => l.claimId === claim.id);
  const open = claim.status === "Submitted";
  return (
    <Shell>
      <Breadcrumbs id="crumbs.review" items={[{ id: "crumb.queue", label: "Team approvals", to: "screen.team-queue" }, { id: "crumb.claim", label: claim.number }]} />
      <Heading
        id="heading.review"
        text={`${claim.number}: ${claim.description}`}
        actions={
          open ? (
            <Stack direction="row">
              <Button
                id="btn.approve"
                label="Approve"
                emphasis="primary"
                onPress={() => {
                  all.update(claim.id, { status: "Approved", decidedOn: today });
                  navigate.go("screen.team-queue");
                }}
              />
              <Button id="btn.reject" label="Reject" emphasis="danger" onPress={() => setRejecting(true)} />
            </Stack>
          ) : undefined
        }
      />
      <Badge id="badge.status" label={claim.status} tone={tone(claim.status)} />
      {!open && <Alert id="alert.decided" tone="info" title="Already decided" text="A decided claim can no longer be changed." />}
      <Detail
        id="detail.review"
        fields={[
          { label: "Employee", value: claim.employee },
          { label: "Submitted", value: claim.submittedOn === "" ? "Not submitted" : claim.submittedOn },
          { label: "Total", value: money(totalOf(lineItems.items, claim.id)) },
        ]}
      />
      <Section id="section.lines" title="Expense lines" count={mine.length}>
        <ReadLines id="table.review-lines" items={mine} />
      </Section>
      <Dialog id="dialog.reject" title={`Reject ${claim.number}`} open={rejecting} onClose={() => setRejecting(false)}>
        <Form
          id="form.reject"
          onSubmit={(values) => {
            all.update(claim.id, { status: "Rejected", decidedOn: today, rejectionReason: values.reason ?? "" });
            setRejecting(false);
            navigate.go("screen.team-queue");
          }}
          actions={<Button id="btn.reject-confirm" label="Reject claim" emphasis="danger" submit />}
        >
          <Field
            id="field.reason"
            name="reason"
            label="Reason"
            type="textarea"
            required
            error={state === "state.validation-error" ? "Give the employee a reason" : undefined}
          />
        </Form>
      </Dialog>
    </Shell>
  );
}

function TeamDecided() {
  const state = useDisplayState();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const people = useCollection<Employee>("employees");
  const team = people.items.filter((e) => e.manager === MANAGER).map((e) => e.name);
  const done = state === "state.empty"
    ? []
    : all.items.filter((c) => (c.status === "Approved" || c.status === "Rejected" || c.status === "Exported") && team.includes(c.employee));
  return (
    <Shell>
      <Heading id="heading.decided" text="Decided claims" />
      <Section id="section.decided" title="Claims you have decided" count={done.length} subtitle="Decisions are final; a rejected claim can be resubmitted by the employee.">
        <Table
          id="table.decided"
          columns={["Employee", "Claim", "Decided", { label: "Total", kind: "number" }, { label: "Status", kind: "status" }]}
          rows={done.map((c) => ({
            id: `decided.${c.id}`,
            cells: [c.employee, c.number, c.decidedOn, money(totalOf(lineItems.items, c.id))],
            status: { text: c.status, tone: tone(c.status) },
            to: "screen.team-review",
            params: { claim: c.id },
          }))}
          empty={<EmptyState id="empty.decided" title="No decisions yet" text="Claims you approve or reject appear here." />}
        />
      </Section>
    </Shell>
  );
}

function PayrollExport() {
  const state = useDisplayState();
  const navigate = useNav();
  const today = useToday();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const exportItems = useCollection<Export>("exports");
  const [selected, setSelected] = useState<string[]>([]);
  const approved = state === "state.empty" ? [] : all.items.filter((c) => c.status === "Approved");
  const chosen = approved.filter((c) => selected.includes(c.id));
  const chosenTotal = chosen.reduce((sum, c) => sum + totalOf(lineItems.items, c.id), 0);
  const doExport = () => {
    const id = exportItems.create({ createdOn: today, by: FINANCE, count: chosen.length, totalCents: chosenTotal, file: `claims-${today}.csv` });
    chosen.forEach((c) => all.update(c.id, { status: "Exported", exportId: id }));
    setSelected([]);
    navigate.go("screen.export-history");
  };
  return (
    <Shell>
      <Heading id="heading.export" text="Payroll export" />
      <StatGroup>
        <Stat id="stat.ready" label="Ready to export" value={String(approved.length)} hint="approved, not yet exported" icon="Receipt" tone="warning" />
        <Stat id="stat.selected" label="Selected" value={String(chosen.length)} hint={money(chosenTotal)} icon="ListChecks" />
      </StatGroup>
      <Section
        id="section.approved"
        title="Approved claims"
        count={approved.length}
        subtitle="Select claims to include. Exported claims are marked Exported and leave this list."
        actions={<Button id="btn.export" label={`Export ${chosen.length} selected`} emphasis="primary" disabled={chosen.length === 0} onPress={doExport} />}
      >
        <Table
          id="table.approved"
          columns={["Employee", "Claim", "Description", "Approved", { label: "Total", kind: "number" }, { label: "Selection", kind: "status" }]}
          rows={approved.map((c) => {
            const on = selected.includes(c.id);
            return {
              id: `approved.${c.id}`,
              cells: [c.employee, c.number, c.description, c.decidedOn, money(totalOf(lineItems.items, c.id))],
              status: { text: on ? "Selected" : "Not selected", tone: on ? ("info" as const) : ("default" as const) },
              to: "screen.finance-claim",
              params: { claim: c.id },
              actions: [
                {
                  id: `approved.${c.id}.toggle`,
                  label: on ? "Unselect" : "Select",
                  onPress: () => setSelected(on ? selected.filter((x) => x !== c.id) : [...selected, c.id]),
                },
              ],
            };
          })}
          empty={<EmptyState id="empty.approved" title="Nothing to export" text="Approved claims appear here until they are exported." />}
        />
      </Section>
    </Shell>
  );
}

function ExportHistory() {
  const state = useDisplayState();
  const exportItems = useCollection<Export>("exports");
  const [download, setDownload] = useState<Export | null>(null);
  const past = state === "state.empty" ? [] : exportItems.items;
  return (
    <Shell>
      <Heading id="heading.history" text="Export history" />
      <Section id="section.history" title="Past exports" count={past.length} subtitle="Download any export again; downloading never changes a claim.">
        <Table
          id="table.history"
          columns={["Created", "By", { label: "Claims", kind: "number" }, { label: "Total", kind: "number" }]}
          rows={past.map((x) => ({
            id: `export.${x.id}`,
            cells: [x.createdOn, x.by, String(x.count), money(x.totalCents)],
            actions: [{ id: `export.${x.id}.download`, label: "Download", onPress: () => setDownload(x) }],
          }))}
          empty={<EmptyState id="empty.history" title="No exports yet" text="Exports you create appear here." actions={<Button id="btn.to-export" label="Go to payroll export" to="screen.export" />} />}
        />
      </Section>
      <Dialog id="dialog.download" title="Download export" open={download !== null} onClose={() => setDownload(null)}>
        <Text id="text.download" text={download === null ? "" : `${download.file}: ${download.count} claim${download.count === 1 ? "" : "s"}, ${money(download.totalCents)} in total. One row per claim: employee, claim number, total, approval date.`} />
        <Button id="btn.download-close" label="Close" onPress={() => setDownload(null)} />
      </Dialog>
    </Shell>
  );
}

function FinanceClaim() {
  const { claim: cid } = useParams();
  const all = useCollection<Claim>("claims");
  const lineItems = useCollection<Line>("lines");
  const claim = (cid ? all.get(cid) : undefined) ?? all.items.find((c) => c.status === "Approved") ?? all.items[0]!;
  const mine = lineItems.items.filter((l) => l.claimId === claim.id);
  return (
    <Shell>
      <Breadcrumbs id="crumbs.finance" items={[{ id: "crumb.export", label: "Payroll export", to: "screen.export" }, { id: "crumb.claim", label: claim.number }]} />
      <Heading id="heading.finance-claim" text={`${claim.number}: ${claim.description}`} />
      <Badge id="badge.status" label={claim.status} tone={tone(claim.status)} />
      <Detail
        id="detail.finance-claim"
        fields={[
          { label: "Employee", value: claim.employee },
          { label: "Approved", value: claim.decidedOn === "" ? "Not decided" : claim.decidedOn },
          { label: "Total", value: money(totalOf(lineItems.items, claim.id)) },
        ]}
      />
      <Section id="section.lines" title="Expense lines and receipts" count={mine.length}>
        <ReadLines id="table.finance-lines" items={mine} />
      </Section>
    </Shell>
  );
}

function Categories() {
  const state = useDisplayState();
  const cats = useCollection<Category>("categories");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const current = editing !== null && editing !== "new" ? editing : undefined;
  const save = (values: Record<string, string>) => {
    const raw = (values.maximum ?? "").trim();
    const maximum = raw === "" ? null : Math.round(Number(raw) * 100);
    const name = values.name ?? "";
    if (current) cats.update(current.id, { name, maximum });
    else cats.create({ name, maximum });
    setEditing(null);
  };
  const items = state === "state.empty" ? [] : cats.items;
  return (
    <Shell>
      <Heading id="heading.categories" text="Expense limits" />
      <Section
        id="section.categories"
        title="Categories"
        count={items.length}
        subtitle="The maximum applies to each expense line. A claim with a line over its maximum cannot be submitted."
        actions={<Button id="btn.add-category" label="Add category" emphasis="primary" onPress={() => setEditing("new")} />}
      >
        <Table
          id="table.categories"
          columns={["Category", { label: "Maximum per line", kind: "number" }]}
          rows={items.map((c) => ({
            id: `category.${c.id}`,
            cells: [c.name, c.maximum === null ? "No maximum" : money(c.maximum)],
            actions: [
              { id: `category.${c.id}.edit`, label: "Edit", onPress: () => setEditing(c) },
              ...(c.maximum === null ? [] : [{ id: `category.${c.id}.clear`, label: "Remove maximum", onPress: () => cats.update(c.id, { maximum: null }) }]),
            ],
          }))}
          empty={<EmptyState id="empty.categories" title="No categories" text="Add a category so employees can classify their expenses." />}
        />
      </Section>
      <Dialog id="dialog.category" title={current ? `Edit ${current.name}` : "Add category"} open={editing !== null} onClose={() => setEditing(null)}>
        <Form id="form.category" onSubmit={save} actions={<Button id="btn.save-category" label="Save" emphasis="primary" submit />}>
          <Field id="field.category-name" name="name" label="Name" required defaultValue={current?.name ?? ""} />
          <Field
            id="field.category-max"
            name="maximum"
            label="Maximum per line (leave empty for no maximum)"
            type="number"
            defaultValue={current && current.maximum !== null ? String(current.maximum / 100) : ""}
            error={state === "state.validation-error" ? "Enter an amount above zero" : undefined}
          />
        </Form>
      </Dialog>
    </Shell>
  );
}

function People() {
  const state = useDisplayState();
  const people = useCollection<Employee>("employees");
  const [editing, setEditing] = useState<Employee | null>(null);
  const items = state === "state.empty" ? [] : people.items;
  const unassigned = people.items.filter((e) => e.manager === NO_MANAGER).length;
  return (
    <Shell>
      <Heading id="heading.people" text="People" />
      <StatGroup>
        <Stat id="stat.people" label="People" value={String(people.items.length)} hint="have signed in" icon="Users" />
        <Stat id="stat.unassigned" label="Without a manager" value={String(unassigned)} hint="cannot submit claims" icon="TriangleAlert" tone="warning" />
      </StatGroup>
      <Section id="section.people" title="Employees" count={items.length} subtitle="Claims go to the employee's manager. People appear here after their first sign-in.">
        <Table
          id="table.people"
          columns={["Name", "Email", "Manager"]}
          rows={items.map((e) => ({
            id: `person.${e.id}`,
            cells: [e.name, e.email, e.manager],
            actions: [{ id: `person.${e.id}.assign`, label: "Change manager", onPress: () => setEditing(e) }],
          }))}
          empty={<EmptyState id="empty.people" title="Nobody yet" text="People appear after they sign in for the first time." />}
        />
      </Section>
      <Dialog id="dialog.manager" title={editing ? `Manager for ${editing.name}` : "Manager"} open={editing !== null} onClose={() => setEditing(null)}>
        <Form
          id="form.manager"
          onSubmit={(values) => {
            if (editing) people.update(editing.id, { manager: values.manager ?? NO_MANAGER });
            setEditing(null);
          }}
          actions={<Button id="btn.save-manager" label="Save" emphasis="primary" submit />}
        >
          <Field
            id="field.manager"
            name="manager"
            label="Manager"
            type="select"
            options={[NO_MANAGER, ...people.items.filter((e) => e.id !== editing?.id).map((e) => e.name)]}
            defaultValue={editing?.manager ?? NO_MANAGER}
            required
            error={state === "state.validation-error" ? "Choose a manager" : undefined}
          />
        </Form>
      </Dialog>
    </Shell>
  );
}

function Account() {
  const role = useRole();
  const name = role === "Manager" ? MANAGER : role === "FinanceOfficer" ? FINANCE : ME;
  const email = employees.find((e) => e.name === name)?.email ?? "";
  return (
    <Shell>
      <Heading id="heading.account" text="Account" />
      <Detail
        id="detail.account"
        fields={[
          { label: "Name", value: name },
          { label: "Email", value: email },
          { label: "Signed in as", value: role === "FinanceOfficer" ? "Finance" : role },
        ]}
      />
    </Shell>
  );
}

function SignedOut() {
  return (
    <Screen>
      <Heading id="heading.signed-out" text="You are signed out" />
      <Button id="btn.sign-in" label="Sign in" emphasis="primary" to="screen.account" />
    </Screen>
  );
}

export default defineApp({
  screens: {
    "screen.my-claims": MyClaims,
    "screen.claim-form": ClaimForm,
    "screen.claim-detail": ClaimDetail,
    "screen.team-queue": TeamQueue,
    "screen.team-review": TeamReview,
    "screen.team-decided": TeamDecided,
    "screen.export": PayrollExport,
    "screen.export-history": ExportHistory,
    "screen.finance-claim": FinanceClaim,
    "screen.categories": Categories,
    "screen.people": People,
    "screen.account": Account,
    "screen.signed-out": SignedOut,
  },
  data: { employees, categories, claims, lines, exports: exportsData },
});
