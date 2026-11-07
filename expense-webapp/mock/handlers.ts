import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/expense-api";

type Me = components["schemas"]["Me"];
type Category = components["schemas"]["Category"];
type ClaimSummary = components["schemas"]["ClaimSummary"];
type ExpenseLine = components["schemas"]["ExpenseLine"];
type LineInput = components["schemas"]["ExpenseLineInput"];
type Person = components["schemas"]["Person"];
type Export = components["schemas"]["Export"];

// State lives in the page's own JS context: a full page load re-seeds it.
// Feature items add the claim, category, people and export handlers here.
// No scope checks: mock/authz/gateway.ts refuses what the contract refuses.
const me: Me = {
  id: "01a0ab00-0000-7000-8000-000000000001",
  name: "Maya Fernando",
  email: "maya@acme.example",
  managerName: "Ravi Perera",
};

const uid = (kind: string, n: number): string => `01a0ab00-0000-7000-${kind}-${String(n).padStart(12, "0")}`;

// Demo data from the prototype (categories c1..c4).
const categories: Category[] = [
  { id: uid("c000", 1), name: "Meals", maximumCents: 5000 },
  { id: uid("c000", 2), name: "Travel", maximumCents: 30000 },
  { id: uid("c000", 3), name: "Accommodation", maximumCents: 20000 },
  { id: uid("c000", 4), name: "Office supplies", maximumCents: null },
];

interface StoredClaim extends Omit<ClaimSummary, "totalCents"> {
  rejectionReason: string | null;
  lines: ExpenseLine[];
}

const line = (
  n: number, expenseDate: string, category: string, amountCents: number, description: string, receipt?: string,
): ExpenseLine => ({
  id: uid("d000", n), expenseDate, category, amountCents, description,
  receipts: receipt
    ? [{ id: uid("f000", n), fileName: receipt, contentType: receipt.endsWith(".pdf") ? "application/pdf" : "image/jpeg", fileUrl: "" }]
    : [],
});

// Maya's five claims, one per status (prototype claims cl1..cl5).
const claims: StoredClaim[] = [
  {
    id: uid("a000", 1), number: "EXP-1041", employeeName: me.name, description: "Client visit, Colombo", status: "Draft",
    submittedOn: null, decidedOn: null, rejectionReason: null,
    lines: [line(1, "2026-01-10", "Travel", 4200, "Taxi to client office", "taxi-0110.pdf"), line(2, "2026-01-10", "Meals", 3600, "Client lunch")],
  },
  {
    id: uid("a000", 2), number: "EXP-1042", employeeName: me.name, description: "Conference trip", status: "Submitted",
    submittedOn: "2026-01-12", decidedOn: null, rejectionReason: null,
    lines: [line(3, "2026-01-08", "Accommodation", 18000, "Hotel, one night", "hotel.pdf"), line(4, "2026-01-08", "Travel", 12500, "Return flight", "flight.pdf")],
  },
  {
    id: uid("a000", 3), number: "EXP-1038", employeeName: me.name, description: "Team lunch", status: "Rejected",
    submittedOn: "2026-01-07", decidedOn: "2026-01-12",
    rejectionReason: "The lunch was above the team lunch budget. Split it or ask for an exception.",
    lines: [line(5, "2026-01-06", "Meals", 4800, "Team lunch")],
  },
  {
    id: uid("a000", 4), number: "EXP-1030", employeeName: me.name, description: "Taxi in December", status: "Approved",
    submittedOn: "2025-12-22", decidedOn: "2026-01-05", rejectionReason: null,
    lines: [line(6, "2025-12-20", "Travel", 2750, "Taxi", "taxi.jpg")],
  },
  {
    id: uid("a000", 5), number: "EXP-1022", employeeName: me.name, description: "Airport transfers", status: "Exported",
    submittedOn: "2025-12-13", decidedOn: "2025-12-15", rejectionReason: null,
    lines: [line(7, "2025-12-12", "Travel", 6400, "Airport transfers", "transfer.pdf")],
  },
];

// Dan Weerasinghe's claims (prototype cl6, cl7): the other direct report of Ravi.
claims.push(
  {
    id: uid("a000", 6), number: "EXP-1044", employeeName: "Dan Weerasinghe", description: "Training books", status: "Submitted",
    submittedOn: "2026-01-09", decidedOn: null, rejectionReason: null,
    lines: [line(8, "2026-01-09", "Office supplies", 5900, "Training books", "books.pdf")],
  },
  {
    id: uid("a000", 7), number: "EXP-1035", employeeName: "Dan Weerasinghe", description: "Hotel in Kandy", status: "Approved",
    submittedOn: "2026-01-04", decidedOn: "2026-01-12", rejectionReason: null,
    lines: [line(9, "2026-01-02", "Accommodation", 19500, "Hotel in Kandy", "kandy.pdf")],
  },
);

// People (prototype employees e1..e5). Maya is the signed-in employee; Ravi is the signed-in manager.
const person = (n: number, name: string, email: string, managerId: string | null, managerName: string | null): Person => ({
  id: n === 1 ? me.id : uid("e000", n), name, email, managerId, managerName,
});
const RAVI = 3, PRIYA = 4;
const people: Person[] = [
  person(1, "Maya Fernando", "maya@acme.example", uid("e000", RAVI), "Ravi Perera"),
  person(2, "Dan Weerasinghe", "dan@acme.example", uid("e000", RAVI), "Ravi Perera"),
  person(3, "Ravi Perera", "ravi@acme.example", uid("e000", PRIYA), "Priya Nair"),
  person(4, "Priya Nair", "priya@acme.example", null, null),
  person(5, "Ana Silva", "ana@acme.example", uid("e000", PRIYA), "Priya Nair"),
];
// Ravi's team is whoever the people list says reports to him, so a reassignment moves claims.
const ravi = people[RAVI - 1];
const teamClaims = (): StoredClaim[] => {
  const names = people.filter((p) => p.managerId === ravi.id).map((p) => p.name);
  return claims.filter((c) => c.status !== "Draft" && names.includes(c.employeeName));
};
const today = (): string => new Date().toISOString().slice(0, 10);
const findTeam = (id: unknown): StoredClaim | undefined => teamClaims().find((c) => c.id === id);
const notTeam = () => err(404, "Not found", "The claim does not exist or is not from your team.");
const alreadyDecided = () => err(400, "Claim is decided", "Only a submitted claim can be decided.");

// Past exports (prototype x1: Ana exported Maya's EXP-1022). `claimIds` is the file's rows.
interface StoredExport extends Export {
  claimIds: string[];
}
const exportsData: StoredExport[] = [
  {
    id: uid("b000", 1), createdOn: "2025-12-31", createdByName: "Ana Silva", claimCount: 1, totalCents: 6400,
    claimIds: [uid("a000", 5)],
  },
];
let nextExport = 2;
const exportOf = ({ claimIds: _ids, ...rest }: StoredExport): Export => rest;
const csvCell = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

let nextClaim = 1050;
let nextLine = 100;

const total = (c: StoredClaim): number => c.lines.reduce((s, l) => s + l.amountCents, 0);
const summary = (c: StoredClaim): ClaimSummary => {
  const { lines: _lines, rejectionReason: _reason, ...rest } = c;
  return { ...rest, totalCents: total(c) };
};
const detail = (c: StoredClaim): components["schemas"]["ClaimDetail"] => ({
  ...summary(c), rejectionReason: c.rejectionReason, lines: c.lines,
});

const err = (status: number, message: string, description?: string, extra?: object) =>
  HttpResponse.json({ code: status, message, description, ...extra }, { status });
const notFound = () => err(404, "Not found", "The claim does not exist or is not yours.");
const decided = () => err(400, "Claim is decided", "Approved and exported claims can no longer be changed.");

const mine = (): StoredClaim[] => claims.filter((c) => c.employeeName === me.name);
const find = (id: unknown): StoredClaim | undefined => mine().find((c) => c.id === id);
const editable = (c: StoredClaim): boolean => c.status === "Draft" || c.status === "Submitted" || c.status === "Rejected";

function lineFrom(id: string, input: LineInput): ExpenseLine | null {
  const category = categories.find((c) => c.id === input.categoryId);
  if (!category) return null;
  return { id, expenseDate: input.expenseDate, category: category.name, amountCents: input.amountCents, description: input.description, receipts: [] };
}

export const handlers = [
  http.get("/api/me", () => HttpResponse.json(me)),

  http.get("/api/categories", () =>
    HttpResponse.json({ count: categories.length, next: null, previous: null, data: categories }),
  ),

  http.get("/api/me/claims", ({ request }) => {
    const status = new URL(request.url).searchParams.get("status");
    // Newest first: later claims are created at the end.
    const data = mine().filter((c) => !status || c.status === status).map(summary).reverse();
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.post("/api/me/claims", async ({ request }) => {
    const body = (await request.json()) as { description?: string };
    if (!body.description?.trim()) return err(400, "Description required", "Describe what the claim is for.");
    const claim: StoredClaim = {
      id: uid("a000", nextClaim), number: `EXP-${nextClaim}`, employeeName: me.name, description: body.description.trim(),
      status: "Draft", submittedOn: null, decidedOn: null, rejectionReason: null, lines: [],
    };
    nextClaim += 1;
    claims.push(claim);
    return HttpResponse.json(detail(claim), { status: 201 });
  }),

  http.get("/api/me/claims/:claimId", ({ params }) => {
    const c = find(params.claimId);
    return c ? HttpResponse.json(detail(c)) : notFound();
  }),

  http.put("/api/me/claims/:claimId", async ({ params, request }) => {
    const c = find(params.claimId);
    if (!c) return notFound();
    if (!editable(c)) return decided();
    const body = (await request.json()) as { description?: string };
    if (!body.description?.trim()) return err(400, "Description required", "Describe what the claim is for.");
    c.description = body.description.trim();
    return HttpResponse.json(detail(c));
  }),

  http.post("/api/me/claims/:claimId/lines", async ({ params, request }) => {
    const c = find(params.claimId);
    if (!c) return notFound();
    if (!editable(c)) return decided();
    const l = lineFrom(uid("d000", nextLine), (await request.json()) as LineInput);
    if (!l) return err(400, "Unknown category", "Choose a category from the list.");
    nextLine += 1;
    c.lines.push(l);
    return HttpResponse.json(l, { status: 201 });
  }),

  http.put("/api/me/claims/:claimId/lines/:lineId", async ({ params, request }) => {
    const c = find(params.claimId);
    if (!c) return notFound();
    if (!editable(c)) return decided();
    const idx = c.lines.findIndex((l) => l.id === params.lineId);
    if (idx < 0) return err(404, "Not found", "The line does not exist.");
    const l = lineFrom(c.lines[idx].id, (await request.json()) as LineInput);
    if (!l) return err(400, "Unknown category", "Choose a category from the list.");
    c.lines[idx] = l;
    return HttpResponse.json(l);
  }),

  http.delete("/api/me/claims/:claimId/lines/:lineId", ({ params }) => {
    const c = find(params.claimId);
    if (!c) return notFound();
    if (!editable(c)) return decided();
    const idx = c.lines.findIndex((l) => l.id === params.lineId);
    if (idx < 0) return err(404, "Not found", "The line does not exist.");
    c.lines.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/me/claims/:claimId/submit", ({ params }) => {
    const c = find(params.claimId);
    if (!c) return notFound();
    if (c.status !== "Draft" && c.status !== "Rejected") {
      return err(422, "Cannot submit", "Only a draft or rejected claim can be submitted.");
    }
    if (!me.managerName) {
      return err(422, "No manager assigned", "You have no manager assigned. Ask Finance to assign one before you submit.");
    }
    if (c.lines.length === 0) {
      return err(422, "No expense lines", "Add at least one expense line before submitting.");
    }
    const violations = c.lines.flatMap((l) => {
      const max = categories.find((k) => k.name === l.category)?.maximumCents;
      return max !== null && max !== undefined && l.amountCents > max
        ? [{ lineId: l.id, description: l.description, category: l.category, amountCents: l.amountCents, maximumCents: max }]
        : [];
    });
    if (violations.length > 0) {
      return err(422, "Over the limit", "A line is over its category maximum.", { violations });
    }
    c.status = "Submitted";
    c.submittedOn = new Date().toISOString().slice(0, 10);
    c.decidedOn = null;
    c.rejectionReason = null;
    return HttpResponse.json(detail(c));
  }),

  http.post("/api/me/claims/:claimId/withdraw", ({ params }) => {
    const c = find(params.claimId);
    if (!c) return notFound();
    if (c.status !== "Submitted") return err(400, "Cannot withdraw", "Only a submitted claim can be withdrawn.");
    c.status = "Draft";
    c.submittedOn = null;
    return HttpResponse.json(detail(c));
  }),

  http.get("/api/me/team/claims", ({ request }) => {
    const status = new URL(request.url).searchParams.get("status");
    const data = teamClaims()
      .filter((c) => !status || c.status === status)
      .sort((a, b) => (a.submittedOn ?? "").localeCompare(b.submittedOn ?? ""))
      .map(summary);
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.get("/api/me/team/claims/:claimId", ({ params }) => {
    const c = findTeam(params.claimId);
    return c ? HttpResponse.json(detail(c)) : notTeam();
  }),

  http.post("/api/me/team/claims/:claimId/approve", ({ params }) => {
    const c = findTeam(params.claimId);
    if (!c) return notTeam();
    if (c.status !== "Submitted") return alreadyDecided();
    c.status = "Approved";
    c.decidedOn = today();
    c.rejectionReason = null;
    return HttpResponse.json(detail(c));
  }),

  http.post("/api/me/team/claims/:claimId/reject", async ({ params, request }) => {
    const c = findTeam(params.claimId);
    if (!c) return notTeam();
    const body = (await request.json()) as { reason?: string };
    if (!body.reason?.trim()) return err(400, "Reason required", "Give the employee a reason for the rejection.");
    if (c.status !== "Submitted") return alreadyDecided();
    c.status = "Rejected";
    c.decidedOn = today();
    c.rejectionReason = body.reason.trim();
    return HttpResponse.json(detail(c));
  }),

  http.get("/api/people", () => HttpResponse.json({ count: people.length, next: null, previous: null, data: people })),

  http.put("/api/people/:personId/manager", async ({ params, request }) => {
    const p = people.find((x) => x.id === params.personId);
    if (!p) return err(404, "Not found", "The employee does not exist.");
    const body = (await request.json()) as { managerId?: string | null };
    const manager = body.managerId ? people.find((x) => x.id === body.managerId) : undefined;
    if (body.managerId && !manager) return err(400, "Unknown manager", "Choose a manager from the list.");
    if (manager && manager.id === p.id) return err(400, "Invalid manager", "An employee cannot be their own manager.");
    p.managerId = manager?.id ?? null;
    p.managerName = manager?.name ?? null;
    if (p.id === me.id) me.managerName = p.managerName;
    return HttpResponse.json(p);
  }),

  http.get("/api/claims", ({ request }) => {
    const status = new URL(request.url).searchParams.get("status");
    const data = claims.filter((c) => !status || c.status === status).map(summary);
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.get("/api/claims/:claimId", ({ params }) => {
    const c = claims.find((x) => x.id === params.claimId);
    return c ? HttpResponse.json(detail(c)) : err(404, "Not found", "The claim does not exist.");
  }),

  http.get("/api/exports", () => {
    const data = exportsData.map(exportOf).reverse();
    return HttpResponse.json({ count: data.length, next: null, previous: null, data });
  }),

  http.post("/api/exports", async ({ request }) => {
    const body = (await request.json()) as { claimIds?: string[] };
    const ids = body.claimIds ?? [];
    if (ids.length === 0) return err(400, "Nothing selected", "Choose at least one approved claim to export.");
    const chosen = ids.map((id) => claims.find((c) => c.id === id));
    if (chosen.some((c) => !c || c.status !== "Approved")) {
      return err(400, "Not exportable", "Only approved claims that are not yet exported can be exported.");
    }
    const picked = chosen as StoredClaim[];
    const created: StoredExport = {
      id: uid("b000", nextExport), createdOn: today(), createdByName: "Ana Silva", claimCount: picked.length,
      totalCents: picked.reduce((s, c) => s + total(c), 0), claimIds: picked.map((c) => c.id),
    };
    nextExport += 1;
    picked.forEach((c) => {
      c.status = "Exported";
    });
    exportsData.push(created);
    return HttpResponse.json(exportOf(created), { status: 201 });
  }),

  http.get("/api/exports/:exportId/file", ({ params }) => {
    const x = exportsData.find((e) => e.id === params.exportId);
    if (!x) return err(404, "Not found", "The export does not exist.");
    const rows = x.claimIds.flatMap((id) => {
      const c = claims.find((k) => k.id === id);
      return c ? [[c.employeeName, c.number, (total(c) / 100).toFixed(2), c.decidedOn ?? ""].map(csvCell).join(",")] : [];
    });
    return new HttpResponse(["Employee,Claim,Total,Approved", ...rows].join("\n") + "\n", {
      headers: { "Content-Type": "text/csv" },
    });
  }),
];
