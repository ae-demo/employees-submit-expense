import ballerina/http;
import ballerina/sql;

// F3: Finance reads every claim and exports approved claims for payroll.
// An export marks its claims Exported in one transaction with its audit entry; the CSV is
// regenerated from the claims on every download, so a download never changes a claim.

public type ExportCreated record {|
    *http:Created;
    Export body;
|};

type ExportRow record {|
    string id;
    string createdOn;
    string createdByName;
    int claimCount;
    int totalCents;
|};

type CsvRow record {|
    string employeeName;
    string number;
    int totalCents;
    string? decidedOn;
|};

function listAllClaims(string? status, int 'limit, int offset) returns ClaimPage|error {
    int pageSize = 'limit < 1 ? 20 : ('limit > 100 ? 100 : 'limit);
    int startAt = offset < 0 ? 0 : offset;
    sql:ParameterizedQuery filter = ` WHERE true`;
    if status is string {
        filter = sql:queryConcat(filter, ` AND c.status = ${status}`);
    }
    sql:ParameterizedQuery countQuery = sql:queryConcat(`SELECT count(*) FROM claims c`, filter);
    int total = check db->queryRow(countQuery);
    sql:ParameterizedQuery pageQuery = sql:queryConcat(summarySelect(), filter,
            ` ORDER BY c.decided_on ASC NULLS LAST, c.created_at ASC, c.id LIMIT ${pageSize} OFFSET ${startAt}`);
    stream<SummaryRow, sql:Error?> rows = db->query(pageQuery);
    ClaimSummary[] data = [];
    check from SummaryRow row in rows
        do {
            ClaimSummary summary = check summaryFrom(row);
            data.push(summary);
        };
    return {
        count: total,
        next: startAt + pageSize < total ? pageLink("/claims", status, pageSize, startAt + pageSize) : (),
        previous: startAt > 0 ? pageLink("/claims", status, pageSize, startAt > pageSize ? startAt - pageSize : 0) : (),
        data
    };
}

function getAnyClaim(string claimId) returns ClaimDetail|error {
    if !isUuid(claimId) {
        return error NotFoundError("no such claim");
    }
    int found = check db->queryRow(`SELECT count(*) FROM claims WHERE id = ${claimId}::uuid`);
    if found == 0 {
        return error NotFoundError("no such claim");
    }
    return loadDetail(claimId, "/claims");
}

function exportSelect() returns sql:ParameterizedQuery {
    return `SELECT x.id::text AS id, to_char(x.created_on, 'YYYY-MM-DD') AS "createdOn",
            e.name AS "createdByName", x.claim_count AS "claimCount", x.total_cents AS "totalCents"
        FROM exports x JOIN employees e ON e.id = x.created_by`;
}

function listExports(int 'limit, int offset) returns ExportPage|error {
    int pageSize = 'limit < 1 ? 20 : ('limit > 100 ? 100 : 'limit);
    int startAt = offset < 0 ? 0 : offset;
    int total = check db->queryRow(`SELECT count(*) FROM exports`);
    sql:ParameterizedQuery pageQuery = sql:queryConcat(exportSelect(),
            ` ORDER BY x.created_at DESC, x.id LIMIT ${pageSize} OFFSET ${startAt}`);
    stream<ExportRow, sql:Error?> rows = db->query(pageQuery);
    Export[] data = [];
    check from ExportRow row in rows
        do {
            Export item = {id: row.id, createdOn: row.createdOn, createdByName: row.createdByName,
                claimCount: row.claimCount, totalCents: row.totalCents};
            data.push(item);
        };
    return {
        count: total,
        next: startAt + pageSize < total ? pageLink("/exports", (), pageSize, startAt + pageSize) : (),
        previous: startAt > 0 ? pageLink("/exports", (), pageSize, startAt > pageSize ? startAt - pageSize : 0) : (),
        data
    };
}

function loadExport(string exportId) returns Export|error {
    sql:ParameterizedQuery query = sql:queryConcat(exportSelect(), ` WHERE x.id = ${exportId}::uuid`);
    ExportRow|sql:Error row = db->queryRow(query);
    if row is sql:NoRowsError {
        return error NotFoundError("no such export");
    }
    ExportRow found = check row;
    Export item = {id: found.id, createdOn: found.createdOn, createdByName: found.createdByName,
        claimCount: found.claimCount, totalCents: found.totalCents};
    return item;
}

// Marks the chosen claims Exported, at most once each. Any claim that is missing, not
// Approved or already exported refuses the whole request and nothing changes.
function createExport(string actorId, string[] claimIds) returns Export|error {
    map<string> unique = {};
    foreach string rawId in claimIds {
        string id = rawId.trim().toLowerAscii();
        if !isUuid(id) {
            return error RuleError("a selected claim does not exist");
        }
        unique[id] = id;
    }
    string[] ids = unique.toArray();
    if ids.length() == 0 {
        return error RuleError("select at least one claim to export");
    }
    string exportId = "";
    transaction {
        string created = check db->queryRow(`INSERT INTO exports (created_by, claim_count, total_cents)
            VALUES (${actorId}::uuid, ${ids.length()}, 0) RETURNING id::text`);
        string numbers = "";
        foreach string id in ids {
            // the status and export_id checks in the UPDATE make a double export impossible
            string|sql:Error number = db->queryRow(`UPDATE claims SET status = 'Exported', export_id = ${created}::uuid
                WHERE id = ${id}::uuid AND status = 'Approved' AND export_id IS NULL
                RETURNING number`);
            string claimNumber = check exportedNumber(number);
            numbers = numbers == "" ? claimNumber : numbers + ", " + claimNumber;
        }
        _ = check db->execute(`UPDATE exports SET total_cents = COALESCE((
                SELECT sum(l.amount_cents) FROM expense_lines l JOIN claims c ON c.id = l.claim_id
                WHERE c.export_id = ${created}::uuid), 0) WHERE id = ${created}::uuid`);
        check recordAudit({action: "export", actorId, exportId: created,
            detail: "exported " + ids.length().toString() + " claim(s): " + numbers});
        check commit;
        exportId = created;
    }
    return loadExport(exportId);
}

// Names come from identity tokens; a leading formula character is neutralised for spreadsheets.
function csvField(string value) returns string {
    string text = value;
    if text.length() > 0 && ["=", "+", "-", "@", "\t", "\r"].indexOf(text.substring(0, 1)) is int {
        text = "'" + text;
    }
    if re `[",\r\n]`.find(text) is () {
        return text;
    }
    return "\"" + re `"`.replaceAll(text, "\"\"") + "\"";
}

function exportCsv(string exportId) returns string|error {
    if !isUuid(exportId) {
        return error NotFoundError("no such export");
    }
    int found = check db->queryRow(`SELECT count(*) FROM exports WHERE id = ${exportId}::uuid`);
    if found == 0 {
        return error NotFoundError("no such export");
    }
    sql:ParameterizedQuery query = `SELECT e.name AS "employeeName", c.number AS number,
            COALESCE((SELECT sum(l.amount_cents) FROM expense_lines l WHERE l.claim_id = c.id), 0)::bigint AS "totalCents",
            to_char(c.decided_on, 'YYYY-MM-DD') AS "decidedOn"
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.export_id = ${exportId}::uuid ORDER BY c.number`;
    stream<CsvRow, sql:Error?> rows = db->query(query);
    string[] lines = ["employee,claim number,total,approval date"];
    check from CsvRow row in rows
        do {
            lines.push(csvField(row.employeeName) + "," + csvField(row.number) + ","
                + formatCents(row.totalCents) + "," + (row.decidedOn ?: ""));
        };
    return string:'join("\r\n", ...lines) + "\r\n";
}

// An error here leaves the enclosing transaction block, which rolls it back.
function exportedNumber(string|sql:Error number) returns string|error {
    if number is sql:NoRowsError {
        return error RuleError("only Approved claims that are not yet exported can be exported");
    }
    return number;
}
