import ballerina/sql;

// P2: every submission, approval, rejection and export is recorded in the audit log.
// Call recordAudit inside the same transaction as the change it records.

type AuditAction "submit"|"approve"|"reject"|"export";

type AuditEvent record {|
    AuditAction action;
    # the employees.id of the person who acted
    string actorId;
    string? claimId = ();
    string? exportId = ();
    string detail = "";
|};

function recordAudit(AuditEvent event) returns error? {
    sql:ParameterizedQuery query = `INSERT INTO audit_log (actor_id, action, claim_id, export_id, detail)
        VALUES (${event.actorId}::uuid, ${event.action}, ${event.claimId}::uuid, ${event.exportId}::uuid, ${event.detail})`;
    _ = check db->execute(query);
}
