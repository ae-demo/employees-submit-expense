import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/expense-api";

type Me = components["schemas"]["Me"];

// State lives in the page's own JS context: a full page load re-seeds it.
// Feature items add the claim, category, people and export handlers here.
// No scope checks: mock/authz/gateway.ts refuses what the contract refuses.
const me: Me = {
  id: "01a0ab00-0000-7000-8000-000000000001",
  name: "Maya Fernando",
  email: "maya@acme.example",
  managerName: "Ravi Perera",
};

export const handlers = [http.get("/api/me", () => HttpResponse.json(me))];
