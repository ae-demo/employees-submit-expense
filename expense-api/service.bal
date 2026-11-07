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

    // Not built yet: a later feature item implements this operation.
    resource function delete me/claims/[string claimId]/lines/[string lineId]() returns http:NoContent|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function delete me/claims/[string claimId]/lines/[string lineId]/receipts/[string receiptId]() returns http:NoContent|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function get categories(int 'limit = 20, int offset = 0) returns CategoryPage|ErrorUnauthorized {
        return {count: 0, data: []};
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

    // Not built yet: a later feature item implements this operation.
    resource function get me/claims("Draft"|"Submitted"|"Approved"|"Rejected"|"Exported"? status, int 'limit = 20, int offset = 0) returns ClaimPage|ErrorUnauthorized {
        return {count: 0, data: []};
    }

    // Not built yet: a later feature item implements this operation.
    resource function get me/claims/[string claimId]() returns ClaimDetail|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function get me/claims/[string claimId]/lines/[string lineId]/receipts/[string receiptId]/file() returns byte[]|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function get me/team/claims("Submitted"|"Approved"|"Rejected"|"Exported"? status, int 'limit = 20, int offset = 0) returns ClaimPage|ErrorUnauthorized {
        return {count: 0, data: []};
    }

    // Not built yet: a later feature item implements this operation.
    resource function get me/team/claims/[string claimId]() returns ClaimDetail|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function get me/team/claims/[string claimId]/lines/[string lineId]/receipts/[string receiptId]/file() returns byte[]|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function get people(int 'limit = 20, int offset = 0) returns PersonPage|ErrorUnauthorized {
        return {count: 0, data: []};
    }

    // Not built yet: a later feature item implements this operation.
    resource function post categories(@http:Payload CategoryInput payload) returns Category|ErrorBadRequest|ErrorUnauthorized {
        return notImplemented();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post exports(@http:Payload ExportInput payload) returns Export|ErrorBadRequest|ErrorUnauthorized {
        return notImplemented();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/claims(@http:Payload ClaimInput payload) returns ClaimDetail|ErrorBadRequest|ErrorUnauthorized {
        return notImplemented();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/claims/[string claimId]/lines(@http:Payload ExpenseLineInput payload) returns ExpenseLine|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/claims/[string claimId]/lines/[string lineId]/receipts(http:Request request) returns Receipt|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/claims/[string claimId]/submit() returns ClaimDetailOk|ErrorUnauthorized|ErrorNotFound|ClaimRefusalUnprocessableEntity {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/claims/[string claimId]/withdraw() returns ClaimDetailOk|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/team/claims/[string claimId]/approve() returns ClaimDetailOk|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function post me/team/claims/[string claimId]/reject(@http:Payload Rejection payload) returns ClaimDetailOk|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function put categories/[string categoryId](@http:Payload CategoryInput payload) returns Category|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function put me/claims/[string claimId](@http:Payload ClaimInput payload) returns ClaimDetail|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function put me/claims/[string claimId]/lines/[string lineId](@http:Payload ExpenseLineInput payload) returns ExpenseLine|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

    // Not built yet: a later feature item implements this operation.
    resource function put people/[string personId]/manager(@http:Payload ManagerAssignment payload) returns Person|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound {
        return notFound();
    }

}
