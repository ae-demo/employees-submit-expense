import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/expense-api";

type Me = components["schemas"]["Me"];
type Category = components["schemas"]["Category"];
type ClaimSummary = components["schemas"]["ClaimSummary"];
type ExpenseLine = components["schemas"]["ExpenseLine"];
type LineInput = components["schemas"]["ExpenseLineInput"];

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

const line = (n: number, expenseDate: string, category: string, amountCents: number, description: string): ExpenseLine => ({
  id: uid("d000", n), expenseDate, category, amountCents, description, receipts: [],
});

// Maya's five claims, one per status (prototype claims cl1..cl5).
const claims: StoredClaim[] = [
  {
    id: uid("a000", 1), number: "EXP-1041", employeeName: me.name, description: "Client visit, Colombo", status: "Draft",
    submittedOn: null, decidedOn: null, rejectionReason: null,
    lines: [line(1, "2026-01-10", "Travel", 4200, "Taxi to client office"), line(2, "2026-01-10", "Meals", 3600, "Client lunch")],
  },
  {
    id: uid("a000", 2), number: "EXP-1042", employeeName: me.name, description: "Conference trip", status: "Submitted",
    submittedOn: "2026-01-12", decidedOn: null, rejectionReason: null,
    lines: [line(3, "2026-01-08", "Accommodation", 18000, "Hotel, one night"), line(4, "2026-01-08", "Travel", 12500, "Return flight")],
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
    lines: [line(6, "2025-12-20", "Travel", 2750, "Taxi")],
  },
  {
    id: uid("a000", 5), number: "EXP-1022", employeeName: me.name, description: "Airport transfers", status: "Exported",
    submittedOn: "2025-12-13", decidedOn: "2025-12-15", rejectionReason: null,
    lines: [line(7, "2025-12-12", "Travel", 6400, "Airport transfers")],
  },
];

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

const find = (id: unknown): StoredClaim | undefined => claims.find((c) => c.id === id);
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
    const data = claims.filter((c) => !status || c.status === status).map(summary).reverse();
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
];
