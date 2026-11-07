import ballerina/http;
import ballerina/log;

listener http:Listener ep0 = new (9090);

service http:InterceptableService / on ep0 {
    public function createInterceptors() returns AssertionInterceptor => new;

    # The signed-in person; creates their record on first sign-in
    resource function get me(http:RequestContext ctx, http:Request request) returns Me|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        CallerProfile profile = callerProfile(request, caller);
        Me|error me = ensurePerson(caller.userId, profile);
        if me is error {
            log:printError("resolving the caller's person record failed", 'error = me);
            return internalError();
        }
        return me;
    }
    # Remove an expense line from the caller's claim until it is decided
    resource function delete me/claims/[string claimId]/lines/[string lineId](http:RequestContext ctx) returns http:NoContent|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        error? removed = removeLine(caller.userId, claimId, lineId);
        if removed is error {
            if removed is NotFoundError {
                return notFound();
            }
            if removed is RuleError {
                return badRequest(removed);
            }
            return serverFailure(removed, "removing a line");
        }
        return http:NO_CONTENT;
    }

    // Not built yet: a later feature item implements this operation.
    resource function delete me/claims/[string claimId]/lines/[string lineId]/receipts/[string receiptId]() returns http:NoContent|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    # Every category with its maximum, for any signed-in person
    resource function get categories(http:RequestContext ctx, int 'limit = 20, int offset = 0) returns CategoryPage|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        CategoryPage|error page = listCategories('limit, offset);
        if page is error {
            log:printError("listing categories failed", 'error = page);
            return internalError();
        }
        return page;
    }
    // Not built yet: a later feature item implements this operation.
    resource function get claims("Draft"|"Submitted"|"Approved"|"Rejected"|"Exported"? status, int 'limit = 20, int offset = 0) returns ClaimPage|ErrorUnauthorized {
        return {count: 0, data: []};
    }
    // Not built yet: a later feature item implements this operation.
    resource function get claims/[string claimId]() returns ClaimDetail|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }
    // Not built yet: a later feature item implements this operation.
    resource function get claims/[string claimId]/lines/[string lineId]/receipts/[string receiptId]/file() returns byte[]|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }
    // Not built yet: a later feature item implements this operation.
    resource function get exports(int 'limit = 20, int offset = 0) returns ExportPage|ErrorUnauthorized {
        return {count: 0, data: []};
    }
    // Not built yet: a later feature item implements this operation.
    resource function get exports/[string exportId]/file() returns string|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }
    # The caller's claims, newest first
    resource function get me/claims(http:RequestContext ctx, "Draft"|"Submitted"|"Approved"|"Rejected"|"Exported"? status, int 'limit = 20, int offset = 0) returns ClaimPage|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimPage|error page = listClaims(caller.userId, status, 'limit, offset);
        if page is error {
            log:printError("listing claims failed", 'error = page);
            return internalError();
        }
        return page;
    }
    # One of the caller's claims with its lines
    resource function get me/claims/[string claimId](http:RequestContext ctx) returns ClaimDetail|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimDetail|error detail = getClaim(caller.userId, claimId);
        if detail is error {
            if detail is NotFoundError {
                return notFound();
            }
            return serverFailure(detail, "reading a claim");
        }
        return detail;
    }

    // Not built yet: a later feature item implements this operation.
    resource function get me/claims/[string claimId]/lines/[string lineId]/receipts/[string receiptId]/file() returns byte[]|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    # Claims of the caller's direct reports, oldest submission first; never drafts
    resource function get me/team/claims(http:RequestContext ctx, "Submitted"|"Approved"|"Rejected"|"Exported"? status, int 'limit = 20, int offset = 0) returns ClaimPage|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimPage|error page = listTeamClaims(caller.userId, status, 'limit, offset);
        if page is error {
            return serverFailure(page, "listing team claims");
        }
        return page;
    }

    # One claim of a direct report with its lines
    resource function get me/team/claims/[string claimId](http:RequestContext ctx) returns ClaimDetail|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimDetail|error detail = getTeamClaim(caller.userId, claimId);
        if detail is error {
            if detail is NotFoundError {
                return notFound();
            }
            return serverFailure(detail, "reading a team claim");
        }
        return detail;
    }

    // Not built yet: a later feature item implements this operation.
    resource function get me/team/claims/[string claimId]/lines/[string lineId]/receipts/[string receiptId]/file() returns byte[]|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    # Every employee who has signed in, with their manager
    resource function get people(int 'limit = 20, int offset = 0) returns PersonPage|http:InternalServerError {
        PersonPage|error page = listPeople('limit, offset);
        if page is error {
            return serverFailure(page, "listing people");
        }
        return page;
    }

    // Not built yet: a later feature item implements this operation.
    resource function post categories(@http:Payload CategoryInput payload) returns Category|ErrorBadRequest|ErrorUnauthorized {
        return notImplemented();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post exports(@http:Payload ExportInput payload) returns Export|ErrorBadRequest|ErrorUnauthorized {
        return notImplemented();
    }

    # Create a draft claim for the caller
    resource function post me/claims(http:RequestContext ctx, http:Request request, @http:Payload ClaimInput payload) returns ClaimDetailCreated|ErrorBadRequest|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        Me|error me = ensurePerson(caller.userId, callerProfile(request, caller));
        if me is error {
            log:printError("resolving the caller's person record failed", 'error = me);
            return internalError();
        }
        ClaimDetail|error detail = createClaim(me.id, payload);
        if detail is error {
            if detail is RuleError {
                return badRequest(detail);
            }
            return serverFailure(detail, "creating a claim");
        }
        ClaimDetailCreated created = {body: detail, headers: {"Location": "/me/claims/" + detail.id}};
        return created;
    }

    # Add an expense line to the caller's claim until it is decided
    resource function post me/claims/[string claimId]/lines(http:RequestContext ctx, @http:Payload ExpenseLineInput payload) returns ExpenseLineCreated|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ExpenseLine|error line = addLine(caller.userId, claimId, payload);
        if line is error {
            if line is NotFoundError {
                return notFound();
            }
            if line is RuleError {
                return badRequest(line);
            }
            return serverFailure(line, "adding a line");
        }
        ExpenseLineCreated created = {body: line};
        return created;
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/claims/[string claimId]/lines/[string lineId]/receipts(http:Request request) returns Receipt|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    # Submit the caller's draft or rejected claim to their manager
    resource function post me/claims/[string claimId]/submit(http:RequestContext ctx) returns ClaimDetailOk|ErrorUnauthorized|ErrorNotFound|ClaimRefusalUnprocessableEntity|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimDetail|error detail = submitClaim(caller.userId, claimId);
        if detail is RefusedError {
            ClaimRefusalUnprocessableEntity refused = {body: {code: 422, message: "Claim not submitted", description: detail.message()}};
            return refused;
        }
        if detail is error {
            if detail is NotFoundError {
                return notFound();
            }
            return serverFailure(detail, "submitting a claim");
        }
        ClaimDetailOk ok = {body: detail};
        return ok;
    }

    # Withdraw the caller's submitted claim back to Draft
    resource function post me/claims/[string claimId]/withdraw(http:RequestContext ctx) returns ClaimDetailOk|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimDetail|error detail = withdrawClaim(caller.userId, claimId);
        if detail is error {
            if detail is NotFoundError {
                return notFound();
            }
            if detail is RuleError {
                return badRequest(detail);
            }
            return serverFailure(detail, "withdrawing a claim");
        }
        ClaimDetailOk ok = {body: detail};
        return ok;
    }

    # Approve a direct report's submitted claim
    resource function post me/team/claims/[string claimId]/approve(http:RequestContext ctx) returns ClaimDetailOk|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimDetail|error detail = approveClaim(caller.userId, claimId);
        if detail is error {
            if detail is NotFoundError {
                return notFound();
            }
            if detail is RuleError {
                return badRequest(detail);
            }
            return serverFailure(detail, "approving a claim");
        }
        ClaimDetailOk ok = {body: detail};
        return ok;
    }

    # Reject a direct report's submitted claim with a reason
    resource function post me/team/claims/[string claimId]/reject(http:RequestContext ctx, @http:Payload Rejection payload) returns ClaimDetailOk|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimDetail|error detail = rejectClaim(caller.userId, claimId, payload.reason);
        if detail is error {
            if detail is NotFoundError {
                return notFound();
            }
            if detail is RuleError {
                return badRequest(detail);
            }
            return serverFailure(detail, "rejecting a claim");
        }
        ClaimDetailOk ok = {body: detail};
        return ok;
    }

    // Not built yet: a later feature item implements this operation.
    resource function put categories/[string categoryId](@http:Payload CategoryInput payload) returns Category|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    # Change the description of the caller's claim until it is decided
    resource function put me/claims/[string claimId](http:RequestContext ctx, @http:Payload ClaimInput payload) returns ClaimDetail|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ClaimDetail|error detail = updateClaim(caller.userId, claimId, payload);
        if detail is error {
            if detail is NotFoundError {
                return notFound();
            }
            if detail is RuleError {
                return badRequest(detail);
            }
            return serverFailure(detail, "updating a claim");
        }
        return detail;
    }

    # Change an expense line of the caller's claim until it is decided
    resource function put me/claims/[string claimId]/lines/[string lineId](http:RequestContext ctx, @http:Payload ExpenseLineInput payload) returns ExpenseLine|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return unauthorized();
        }
        ExpenseLine|error line = updateLine(caller.userId, claimId, lineId, payload);
        if line is error {
            if line is NotFoundError {
                return notFound();
            }
            if line is RuleError {
                return badRequest(line);
            }
            return serverFailure(line, "updating a line");
        }
        return line;
    }

    # Assign, change or remove an employee's manager
    resource function put people/[string personId]/manager(@http:Payload ManagerAssignment payload) returns Person|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        Person|error person = assignManager(personId, payload?.managerId);
        if person is error {
            if person is NotFoundError {
                return notFound();
            }
            if person is RuleError {
                return badRequest(person);
            }
            return serverFailure(person, "assigning a manager");
        }
        return person;
    }

}
