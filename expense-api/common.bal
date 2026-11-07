import ballerina/http;

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
