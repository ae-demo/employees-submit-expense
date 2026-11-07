import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerina/time;

// F1: the caller's own claims. Every query pairs the claim id with the owner's subject,
// so a claim that is not the caller's does not exist for the caller.

type ClaimStatus "Draft"|"Submitted"|"Approved"|"Rejected"|"Exported";

type NotFoundError distinct error;

// The request breaks a rule (400).
type RuleError distinct error;

// A submit that is refused (422).
type RefusedError distinct error;

public type ClaimDetailCreated record {|
    *http:Created;
    ClaimDetail body;
|};

public type ExpenseLineCreated record {|
    *http:Created;
    ExpenseLine body;
|};

type SummaryRow record {|
    string id;
    string number;
    string employeeName;
    string description;
    string status;
    int totalCents;
    string? submittedOn;
    string? decidedOn;
    string? rejectionReason;
|};

type OwnedClaim record {|
    string id;
    string employeeId;
    string number;
    string status;
|};

type LineRow record {|
    string id;
    string expenseDate;
    string category;
    int amountCents;
    string description;
|};

type ManagerRow record {|
    string name;
    string email;
|};

function isUuid(string value) returns boolean {
    return re `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`.isFullMatch(value);
}

function toStatus(string status) returns ClaimStatus|error {
    match status {
        "Draft" => {
            return "Draft";
        }
        "Submitted" => {
            return "Submitted";
        }
        "Approved" => {
            return "Approved";
        }
        "Rejected" => {
            return "Rejected";
        }
        "Exported" => {
            return "Exported";
        }
    }
    return error("unknown claim status " + status);
}

function isEditable(string status) returns boolean {
    return status == "Draft" || status == "Submitted" || status == "Rejected";
}

function summaryFrom(SummaryRow row) returns ClaimSummary|error {
    ClaimStatus status = check toStatus(row.status);
    ClaimSummary summary = {
        id: row.id,
        number: row.number,
        employeeName: row.employeeName,
        description: row.description,
        status,
        totalCents: row.totalCents,
        submittedOn: row.submittedOn,
        decidedOn: row.decidedOn
    };
    return summary;
}

function summarySelect() returns sql:ParameterizedQuery {
    return `SELECT c.id::text AS id, c.number AS number, e.name AS "employeeName",
            c.description AS description, c.status AS status,
            COALESCE((SELECT sum(l.amount_cents) FROM expense_lines l WHERE l.claim_id = c.id), 0)::bigint AS "totalCents",
            to_char(c.submitted_on, 'YYYY-MM-DD') AS "submittedOn",
            to_char(c.decided_on, 'YYYY-MM-DD') AS "decidedOn",
            c.rejection_reason AS "rejectionReason"
        FROM claims c JOIN employees e ON e.id = c.employee_id`;
}

function loadOwnedClaim(string subject, string claimId) returns OwnedClaim|error {
    if !isUuid(claimId) {
        return error NotFoundError("no such claim");
    }
    sql:ParameterizedQuery query = `SELECT c.id::text AS id, c.employee_id::text AS "employeeId",
            c.number AS number, c.status AS status
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.id = ${claimId}::uuid AND e.subject = ${subject}`;
    OwnedClaim|sql:Error row = db->queryRow(query);
    if row is sql:NoRowsError {
        return error NotFoundError("no such claim");
    }
    return row;
}

function loadLines(string claimId, string prefix = "/me/claims") returns ExpenseLine[]|error {
    map<Receipt[]> receiptsByLine = check loadReceipts(claimId, prefix);
    sql:ParameterizedQuery query = `SELECT l.id::text AS id, to_char(l.expense_date, 'YYYY-MM-DD') AS "expenseDate",
            k.name AS category, l.amount_cents AS "amountCents", l.description AS description
        FROM expense_lines l JOIN categories k ON k.id = l.category_id
        WHERE l.claim_id = ${claimId}::uuid ORDER BY l.expense_date, l.id`;
    stream<LineRow, sql:Error?> rows = db->query(query);
    ExpenseLine[] lines = [];
    check from LineRow row in rows
        do {
            lines.push({
                id: row.id,
                expenseDate: row.expenseDate,
                category: row.category,
                amountCents: row.amountCents,
                description: row.description,
                receipts: receiptsByLine[row.id] ?: []
            });
        };
    return lines;
}

function loadDetail(string claimId, string prefix = "/me/claims") returns ClaimDetail|error {
    sql:ParameterizedQuery query = sql:queryConcat(summarySelect(), ` WHERE c.id = ${claimId}::uuid`);
    SummaryRow row = check db->queryRow(query);
    ClaimSummary summary = check summaryFrom(row);
    ExpenseLine[] lines = check loadLines(claimId, prefix);
    ClaimDetail detail = {
        id: summary.id,
        number: summary.number,
        employeeName: summary.employeeName,
        description: summary.description,
        status: summary.status,
        totalCents: summary.totalCents,
        submittedOn: row.submittedOn,
        decidedOn: row.decidedOn,
        rejectionReason: row.rejectionReason,
        lines
    };
    return detail;
}

function validateDescription(string text) returns string|error {
    string trimmed = text.trim();
    if trimmed == "" {
        return error RuleError("a description is required");
    }
    return trimmed;
}

function createClaim(string employeeId, ClaimInput input) returns ClaimDetail|error {
    string description = check validateDescription(input.description);
    sql:ParameterizedQuery insert = `INSERT INTO claims (employee_id, description)
        VALUES (${employeeId}::uuid, ${description}) RETURNING id::text`;
    string claimId = check db->queryRow(insert);
    return loadDetail(claimId);
}

function listClaims(string subject, string? status, int 'limit, int offset) returns ClaimPage|error {
    int pageSize = 'limit < 1 ? 20 : ('limit > 100 ? 100 : 'limit);
    int startAt = offset < 0 ? 0 : offset;
    sql:ParameterizedQuery filter = ` WHERE e.subject = ${subject}`;
    if status is string {
        filter = sql:queryConcat(filter, ` AND c.status = ${status}`);
    }
    sql:ParameterizedQuery countQuery = sql:queryConcat(
            `SELECT count(*) FROM claims c JOIN employees e ON e.id = c.employee_id`, filter);
    int total = check db->queryRow(countQuery);
    sql:ParameterizedQuery pageQuery = sql:queryConcat(summarySelect(), filter,
            ` ORDER BY c.created_at DESC, c.id LIMIT ${pageSize} OFFSET ${startAt}`);
    stream<SummaryRow, sql:Error?> rows = db->query(pageQuery);
    ClaimSummary[] data = [];
    check from SummaryRow row in rows
        do {
            ClaimSummary summary = check summaryFrom(row);
            data.push(summary);
        };
    return {
        count: total,
        next: startAt + pageSize < total ? pageLink("/me/claims", status, pageSize, startAt + pageSize) : (),
        previous: startAt > 0 ? pageLink("/me/claims", status, pageSize, startAt > pageSize ? startAt - pageSize : 0) : (),
        data
    };
}

function pageLink(string path, string? status, int pageSize, int startAt) returns string {
    string statusPart = status is string ? "&status=" + status : "";
    return path + "?limit=" + pageSize.toString() + "&offset=" + startAt.toString() + statusPart;
}

function getClaim(string subject, string claimId) returns ClaimDetail|error {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    return loadDetail(claim.id);
}

function updateClaim(string subject, string claimId, ClaimInput input) returns ClaimDetail|error {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    if !isEditable(claim.status) {
        return error RuleError("a " + claim.status + " claim cannot be edited");
    }
    string description = check validateDescription(input.description);
    _ = check db->execute(`UPDATE claims SET description = ${description} WHERE id = ${claim.id}::uuid`);
    return loadDetail(claim.id);
}

function validateLine(ExpenseLineInput input) returns [string, string, int, string]|error {
    string description = check validateDescription(input.description);
    if !isUuid(input.categoryId) {
        return error RuleError("the category does not exist");
    }
    error? positive = requirePositiveCents(input.amountCents);
    if positive is error {
        return error RuleError(positive.message());
    }
    string date = input.expenseDate.trim();
    if !re `\d{4}-\d{2}-\d{2}`.isFullMatch(date) {
        return error RuleError("the date must be written YYYY-MM-DD");
    }
    int|error year = int:fromString(date.substring(0, 4));
    int|error month = int:fromString(date.substring(5, 7));
    int|error day = int:fromString(date.substring(8, 10));
    if year !is int || month !is int || day !is int {
        return error RuleError("the date must be written YYYY-MM-DD");
    }
    time:Date parsed = {year, month, day};
    time:Error? invalid = time:dateValidate(parsed);
    if invalid is time:Error {
        return error RuleError("the date is not a real date");
    }
    sql:ParameterizedQuery exists = `SELECT count(*) FROM categories WHERE id = ${input.categoryId}::uuid`;
    int found = check db->queryRow(exists);
    if found == 0 {
        return error RuleError("the category does not exist");
    }
    return [date, input.categoryId, input.amountCents, description];
}

function addLine(string subject, string claimId, ExpenseLineInput input) returns ExpenseLine|error {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    if !isEditable(claim.status) {
        return error RuleError("a " + claim.status + " claim cannot be edited");
    }
    [string, string, int, string] [date, categoryId, cents, description] = check validateLine(input);
    sql:ParameterizedQuery insert = `INSERT INTO expense_lines (claim_id, category_id, expense_date, amount_cents, description)
        VALUES (${claim.id}::uuid, ${categoryId}::uuid, ${date}::date, ${cents}, ${description}) RETURNING id::text`;
    string lineId = check db->queryRow(insert);
    return loadLine(claim.id, lineId);
}

function loadLine(string claimId, string lineId) returns ExpenseLine|error {
    ExpenseLine[] lines = check loadLines(claimId);
    foreach ExpenseLine line in lines {
        if line.id == lineId {
            return line;
        }
    }
    return error NotFoundError("no such line");
}

function lineBelongs(string claimId, string lineId) returns boolean|error {
    if !isUuid(lineId) {
        return false;
    }
    sql:ParameterizedQuery query = `SELECT count(*) FROM expense_lines WHERE id = ${lineId}::uuid AND claim_id = ${claimId}::uuid`;
    int found = check db->queryRow(query);
    return found > 0;
}

function updateLine(string subject, string claimId, string lineId, ExpenseLineInput input) returns ExpenseLine|error {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    boolean|error belongs = lineBelongs(claim.id, lineId);
    if belongs is error {
        return belongs;
    }
    if !belongs {
        return error NotFoundError("no such line");
    }
    if !isEditable(claim.status) {
        return error RuleError("a " + claim.status + " claim cannot be edited");
    }
    [string, string, int, string] [date, categoryId, cents, description] = check validateLine(input);
    _ = check db->execute(`UPDATE expense_lines SET category_id = ${categoryId}::uuid, expense_date = ${date}::date,
        amount_cents = ${cents}, description = ${description}
        WHERE id = ${lineId}::uuid AND claim_id = ${claim.id}::uuid`);
    return loadLine(claim.id, lineId);
}

function removeLine(string subject, string claimId, string lineId) returns error? {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    boolean|error belongs = lineBelongs(claim.id, lineId);
    if belongs is error {
        return belongs;
    }
    if !belongs {
        return error NotFoundError("no such line");
    }
    if !isEditable(claim.status) {
        return error RuleError("a " + claim.status + " claim cannot be edited");
    }
    if claim.status == "Submitted" {
        int remaining = check db->queryRow(`SELECT count(*) FROM expense_lines WHERE claim_id = ${claim.id}::uuid`);
        if remaining <= 1 {
            return error RuleError("a submitted claim needs at least one line; withdraw it instead");
        }
    }
    _ = check db->execute(`DELETE FROM expense_lines WHERE id = ${lineId}::uuid AND claim_id = ${claim.id}::uuid`);
}

function submitClaim(string subject, string claimId) returns ClaimDetail|error {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    if claim.status != "Draft" && claim.status != "Rejected" {
        return error RefusedError("only a draft or rejected claim can be submitted; this claim is " + claim.status);
    }
    int lineCount = check db->queryRow(`SELECT count(*) FROM expense_lines WHERE claim_id = ${claim.id}::uuid`);
    if lineCount == 0 {
        return error RefusedError("a claim needs at least one expense line before it is submitted");
    }
    sql:ParameterizedQuery managerQuery = `SELECT m.name AS name, m.email AS email
        FROM employees e JOIN employees m ON m.id = e.manager_id WHERE e.id = ${claim.employeeId}::uuid`;
    ManagerRow|sql:Error manager = db->queryRow(managerQuery);
    if manager is sql:NoRowsError {
        return error RefusedError("you have no manager assigned; ask Finance to assign one before you submit");
    }
    if manager is error {
        return manager;
    }
    transaction {
        sql:ExecutionResult changed = check db->execute(`UPDATE claims SET status = 'Submitted',
            submitted_on = current_date, decided_on = NULL, rejection_reason = NULL
            WHERE id = ${claim.id}::uuid AND status IN ('Draft', 'Rejected')`);
        check requireOneRow(changed);
        check recordAudit({action: "submit", actorId: claim.employeeId, claimId: claim.id, detail: "submitted " + claim.number});
        check commit;
    }
    ClaimDetail detail = check loadDetail(claim.id);
    if manager.email.trim() == "" {
        log:printWarn("manager has no email address; notification skipped", claim = claim.number);
    } else {
        string body = detail.employeeName + " submitted claim " + claim.number + " (" + detail.description
            + ") for $" + formatCents(detail.totalCents) + ". Please review it.";
        boolean _ = sendNotification(manager.email, "Expense claim " + claim.number + " is waiting for your decision", body);
    }
    return detail;
}

function withdrawClaim(string subject, string claimId) returns ClaimDetail|error {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    if claim.status != "Submitted" {
        return error RuleError("only a submitted claim can be withdrawn; this claim is " + claim.status);
    }
    sql:ExecutionResult changed = check db->execute(`UPDATE claims SET status = 'Draft', submitted_on = NULL
        WHERE id = ${claim.id}::uuid AND status = 'Submitted'`);
    if changed.affectedRowCount != 1 {
        return error RuleError("the claim was decided before it could be withdrawn");
    }
    return loadDetail(claim.id);
}

function listCategories(int 'limit, int offset) returns CategoryPage|error {
    int pageSize = 'limit < 1 ? 20 : ('limit > 100 ? 100 : 'limit);
    int startAt = offset < 0 ? 0 : offset;
    int total = check db->queryRow(`SELECT count(*) FROM categories`);
    stream<Category, sql:Error?> rows = db->query(`SELECT id::text AS id, name AS name, maximum_cents AS "maximumCents"
        FROM categories ORDER BY name LIMIT ${pageSize} OFFSET ${startAt}`);
    Category[] data = [];
    check from Category row in rows
        do {
            data.push(row);
        };
    return {
        count: total,
        next: startAt + pageSize < total ? pageLink("/categories", (), pageSize, startAt + pageSize) : (),
        previous: startAt > 0 ? pageLink("/categories", (), pageSize, startAt > pageSize ? startAt - pageSize : 0) : (),
        data
    };
}

// Seeds a starting set of categories, without a maximum, when none exist.
function seedCategories(() ready) returns error? {
    int existing = check db->queryRow(`SELECT count(*) FROM categories`);
    if existing > 0 {
        return;
    }
    foreach string name in ["Travel", "Meals", "Accommodation", "Office supplies", "Other"] {
        _ = check db->execute(`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`);
    }
    log:printInfo("seeded the starting expense categories");
}

final () categoriesSeeded = check seedCategories(dbReady);

// An error here leaves the enclosing transaction block, which rolls it back.
function requireOneRow(sql:ExecutionResult result) returns error? {
    if result.affectedRowCount != 1 {
        return error RefusedError("the claim changed while it was being submitted");
    }
}
