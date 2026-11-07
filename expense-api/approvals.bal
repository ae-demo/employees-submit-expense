import ballerina/log;
import ballerina/sql;

// F2: a manager reads and decides the claims of their direct reports; Finance assigns managers.
// Every team query joins the claim's employee to the caller by manager_id, so a claim that
// is not a direct report's does not exist for the caller (404).

type TeamClaim record {|
    string id;
    string number;
    string status;
    string description;
    string employeeId;
    string employeeEmail;
    string managerId;
|};

type PersonRow record {|
    string id;
    string name;
    string email;
    string? managerId;
    string? managerName;
|};

function teamFilter(string subject) returns sql:ParameterizedQuery {
    return ` WHERE m.subject = ${subject} AND e.id <> m.id AND c.status <> 'Draft'`;
}

function listTeamClaims(string subject, string? status, int 'limit, int offset) returns ClaimPage|error {
    int pageSize = 'limit < 1 ? 20 : ('limit > 100 ? 100 : 'limit);
    int startAt = offset < 0 ? 0 : offset;
    sql:ParameterizedQuery filter = teamFilter(subject);
    if status is string {
        filter = sql:queryConcat(filter, ` AND c.status = ${status}`);
    }
    sql:ParameterizedQuery countQuery = sql:queryConcat(
            `SELECT count(*) FROM claims c JOIN employees e ON e.id = c.employee_id
            JOIN employees m ON m.id = e.manager_id`, filter);
    int total = check db->queryRow(countQuery);
    sql:ParameterizedQuery pageQuery = sql:queryConcat(
            summarySelect(), ` JOIN employees m ON m.id = e.manager_id`, filter,
            ` ORDER BY c.submitted_on ASC NULLS LAST, c.created_at ASC, c.id LIMIT ${pageSize} OFFSET ${startAt}`);
    stream<SummaryRow, sql:Error?> rows = db->query(pageQuery);
    ClaimSummary[] data = [];
    check from SummaryRow row in rows
        do {
            ClaimSummary summary = check summaryFrom(row);
            data.push(summary);
        };
    return {
        count: total,
        next: startAt + pageSize < total ? pageLink("/me/team/claims", status, pageSize, startAt + pageSize) : (),
        previous: startAt > 0 ? pageLink("/me/team/claims", status, pageSize, startAt > pageSize ? startAt - pageSize : 0) : (),
        data
    };
}

function loadTeamClaim(string subject, string claimId) returns TeamClaim|error {
    if !isUuid(claimId) {
        return error NotFoundError("no such claim");
    }
    sql:ParameterizedQuery query = `SELECT c.id::text AS id, c.number AS number, c.status AS status,
            c.description AS description, e.id::text AS "employeeId", e.email AS "employeeEmail",
            m.id::text AS "managerId"
        FROM claims c JOIN employees e ON e.id = c.employee_id
        JOIN employees m ON m.id = e.manager_id
        WHERE c.id = ${claimId}::uuid AND m.subject = ${subject} AND e.id <> m.id AND c.status <> 'Draft'`;
    TeamClaim|sql:Error row = db->queryRow(query);
    if row is sql:NoRowsError {
        return error NotFoundError("no such claim");
    }
    return row;
}

function getTeamClaim(string subject, string claimId) returns ClaimDetail|error {
    TeamClaim claim = check loadTeamClaim(subject, claimId);
    return loadDetail(claim.id, "/me/team/claims");
}

function approveClaim(string subject, string claimId) returns ClaimDetail|error {
    TeamClaim claim = check loadTeamClaim(subject, claimId);
    return decideClaim(claim, "approve", ());
}

function rejectClaim(string subject, string claimId, string reason) returns ClaimDetail|error {
    string trimmed = reason.trim();
    if trimmed == "" {
        return error RuleError("a reason is required to reject a claim");
    }
    TeamClaim claim = check loadTeamClaim(subject, claimId);
    return decideClaim(claim, "reject", trimmed);
}

// One decision per claim, and only from Submitted: the UPDATE repeats the status check so a
// concurrent decision leaves nothing to change, and the audit entry commits with the change.
function decideClaim(TeamClaim claim, "approve"|"reject" action, string? reason) returns ClaimDetail|error {
    if claim.status != "Submitted" {
        return error RuleError("only a submitted claim can be decided; this claim is " + claim.status);
    }
    boolean approving = action == "approve";
    string newStatus = approving ? "Approved" : "Rejected";
    string detailText = approving ? "approved " + claim.number : "rejected " + claim.number + ": " + (reason ?: "");
    transaction {
        sql:ExecutionResult changed = check db->execute(`UPDATE claims SET status = ${newStatus},
            decided_on = current_date, rejection_reason = ${reason}
            WHERE id = ${claim.id}::uuid AND status = 'Submitted'`);
        check requireOneDecision(changed);
        check recordAudit({action, actorId: claim.managerId, claimId: claim.id, detail: detailText});
        check commit;
    }
    ClaimDetail detail = check loadDetail(claim.id, "/me/team/claims");
    if claim.employeeEmail.trim() == "" {
        log:printWarn("employee has no email address; notification skipped", claim = claim.number);
    } else if approving {
        boolean _ = sendNotification(claim.employeeEmail, "Expense claim " + claim.number + " was approved",
                "Your claim " + claim.number + " (" + claim.description + ") for $"
                + formatCents(detail.totalCents) + " was approved.");
    } else {
        boolean _ = sendNotification(claim.employeeEmail, "Expense claim " + claim.number + " was rejected",
                "Your claim " + claim.number + " (" + claim.description + ") for $"
                + formatCents(detail.totalCents) + " was rejected. Reason: " + (reason ?: ""));
    }
    return detail;
}

// An error here leaves the enclosing transaction block, which rolls it back.
function requireOneDecision(sql:ExecutionResult result) returns error? {
    if result.affectedRowCount != 1 {
        return error RuleError("the claim was already decided");
    }
}

function personSelect() returns sql:ParameterizedQuery {
    return `SELECT e.id::text AS id, e.name AS name, e.email AS email,
            e.manager_id::text AS "managerId", m.name AS "managerName"
        FROM employees e LEFT JOIN employees m ON m.id = e.manager_id`;
}

function personFrom(PersonRow row) returns Person {
    Person person = {id: row.id, name: row.name, email: row.email, managerId: row.managerId, managerName: row.managerName};
    return person;
}

function listPeople(int 'limit, int offset) returns PersonPage|error {
    int pageSize = 'limit < 1 ? 20 : ('limit > 100 ? 100 : 'limit);
    int startAt = offset < 0 ? 0 : offset;
    int total = check db->queryRow(`SELECT count(*) FROM employees`);
    sql:ParameterizedQuery pageQuery = sql:queryConcat(personSelect(),
            ` ORDER BY lower(e.name), e.id LIMIT ${pageSize} OFFSET ${startAt}`);
    stream<PersonRow, sql:Error?> rows = db->query(pageQuery);
    Person[] data = [];
    check from PersonRow row in rows
        do {
            data.push(personFrom(row));
        };
    return {
        count: total,
        next: startAt + pageSize < total ? pageLink("/people", (), pageSize, startAt + pageSize) : (),
        previous: startAt > 0 ? pageLink("/people", (), pageSize, startAt > pageSize ? startAt - pageSize : 0) : (),
        data
    };
}

function assignManager(string personId, string? managerId) returns Person|error {
    if !isUuid(personId) {
        return error NotFoundError("no such person");
    }
    int found = check db->queryRow(`SELECT count(*) FROM employees WHERE id = ${personId}::uuid`);
    if found == 0 {
        return error NotFoundError("no such person");
    }
    if managerId is string {
        if !isUuid(managerId) {
            return error RuleError("the manager does not exist");
        }
        if managerId.toLowerAscii() == personId.toLowerAscii() {
            return error RuleError("a person cannot be their own manager");
        }
        int managerFound = check db->queryRow(`SELECT count(*) FROM employees WHERE id = ${managerId}::uuid`);
        if managerFound == 0 {
            return error RuleError("the manager does not exist");
        }
    }
    _ = check db->execute(`UPDATE employees SET manager_id = ${managerId}::uuid WHERE id = ${personId}::uuid`);
    sql:ParameterizedQuery query = sql:queryConcat(personSelect(), ` WHERE e.id = ${personId}::uuid`);
    PersonRow row = check db->queryRow(query);
    return personFrom(row);
}
