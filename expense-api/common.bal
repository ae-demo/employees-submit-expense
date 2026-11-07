import ballerina/http;
import ballerina/log;

function unauthorized() returns ErrorUnauthorized {
    return {body: {code: 401, message: "Unauthorized", description: "no verified caller on this request"}};
}

function notFound() returns ErrorNotFound {
    return {body: {code: 404, message: "Not found", description: "the record does not exist or is not the caller's"}};
}

function notImplemented() returns ErrorBadRequest {
    return {body: {code: 400, message: "Not available", description: "this operation is not built yet"}};
}

function internalError() returns http:InternalServerError {
    return {body: {code: 500, message: "Internal error"}};
}

function badRequest(error failure) returns ErrorBadRequest {
    return {body: {code: 400, message: "Request refused", description: failure.message()}};
}

// An unexpected failure is a 500 with no detail; the cause is logged.
function serverFailure(error failure, string action) returns http:InternalServerError {
    log:printError(action + " failed", 'error = failure);
    return internalError();
}
