import expense_api.email;

import ballerina/log;

final email:Client emailClient = check new ({}, trimTrailingSlash(emailServiceBaseUrl));

function trimTrailingSlash(string url) returns string {
    string result = url.trim();
    while result.endsWith("/") {
        result = result.substring(0, result.length() - 1);
    }
    return result;
}

// Sends a notification after the change it reports is saved. A failed send is logged and
// reported as false; it never undoes or fails the change (decisions.md).
function sendNotification(string to, string subject, string body) returns boolean {
    email:EmailMessage|error sent = emailClient->/emails.post({to, subject, body});
    if sent is error {
        log:printError("notification email was not sent", 'error = sent);
        return false;
    }
    return true;
}
