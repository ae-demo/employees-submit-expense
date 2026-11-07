import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/expense-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// The 401 rule lives in src/authz/client.ts; this module adds nothing of its own.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

// Same-origin: nginx proxies /api to the expense-api sibling and strips the prefix.
export const expenseApi = createClient<paths>({ baseUrl: "/api" });
expenseApi.use(authMiddleware);
