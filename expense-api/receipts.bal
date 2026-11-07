import ballerina/http;
import ballerina/mime;
import ballerina/sql;

// F4: receipt files on expense lines, stored in the receipts table. Receipts change only
// while the claim is Draft, Submitted or Rejected. Every lookup pairs the receipt with its
// line and claim, and the reach of the operation (own, team, every claim) decides which
// claims exist for the caller.

const int MAX_RECEIPT_BYTES = 10485760;

public type ReceiptCreated record {|
    *http:Created;
    Receipt body;
|};

type ReceiptRow record {|
    string id;
    string lineId;
    string fileName;
    string contentType;
|};

type ReceiptFile record {|
    string fileName;
    string contentType;
    byte[] content;
|};

function receiptUrl(string prefix, string claimId, string lineId, string receiptId) returns string {
    return prefix + "/" + claimId + "/lines/" + lineId + "/receipts/" + receiptId + "/file";
}

function loadReceipts(string claimId, string prefix) returns map<Receipt[]>|error {
    sql:ParameterizedQuery query = `SELECT r.id::text AS id, r.line_id::text AS "lineId",
            r.file_name AS "fileName", r.content_type AS "contentType"
        FROM receipts r JOIN expense_lines l ON l.id = r.line_id
        WHERE l.claim_id = ${claimId}::uuid ORDER BY r.file_name, r.id`;
    stream<ReceiptRow, sql:Error?> rows = db->query(query);
    map<Receipt[]> byLine = {};
    check from ReceiptRow row in rows
        do {
            Receipt receipt = {
                id: row.id,
                fileName: row.fileName,
                contentType: row.contentType,
                fileUrl: receiptUrl(prefix, claimId, row.lineId, row.id)
            };
            Receipt[]? existing = byLine[row.lineId];
            if existing is Receipt[] {
                existing.push(receipt);
            } else {
                byLine[row.lineId] = [receipt];
            }
        };
    return byLine;
}

// The file name is stored as a bare name: no path, no control characters or quotes.
function cleanFileName(string raw) returns string {
    string name = raw;
    int? slash = name.lastIndexOf("/");
    if slash is int {
        name = name.substring(slash + 1);
    }
    int? backslash = name.lastIndexOf("\\");
    if backslash is int {
        name = name.substring(backslash + 1);
    }
    name = re `[\u{00}-\u{1f}\u{7f}"]`.replaceAll(name, "").trim();
    if name.length() > 200 {
        name = name.substring(0, 200);
    }
    return name;
}

function startsWith(byte[] content, byte[] prefix, int offset = 0) returns boolean {
    if content.length() < offset + prefix.length() {
        return false;
    }
    foreach int i in 0 ..< prefix.length() {
        if content[offset + i] != prefix[i] {
            return false;
        }
    }
    return true;
}

// Accepts images and PDFs only; the file's first bytes must agree with the type it declares.
function validReceiptType(string declared, byte[] content) returns string? {
    string base = declared;
    int? semicolon = base.indexOf(";");
    if semicolon is int {
        base = base.substring(0, semicolon);
    }
    base = base.trim().toLowerAscii();
    match base {
        "application/pdf" => {
            return startsWith(content, [0x25, 0x50, 0x44, 0x46]) ? base : ();
        }
        "image/png" => {
            return startsWith(content, [0x89, 0x50, 0x4E, 0x47]) ? base : ();
        }
        "image/jpeg"|"image/jpg" => {
            return startsWith(content, [0xFF, 0xD8, 0xFF]) ? "image/jpeg" : ();
        }
        "image/gif" => {
            return startsWith(content, [0x47, 0x49, 0x46, 0x38]) ? base : ();
        }
        "image/webp" => {
            return startsWith(content, [0x52, 0x49, 0x46, 0x46]) && startsWith(content, [0x57, 0x45, 0x42, 0x50], 8) ? base : ();
        }
    }
    return ();
}

function readUpload(http:Request request) returns [string, string, byte[]]|error {
    mime:Entity[]|http:ClientError parts = request.getBodyParts();
    if parts is http:ClientError {
        return error RuleError("send the receipt as multipart/form-data with a part named file");
    }
    foreach mime:Entity part in parts {
        if part.getContentDisposition().name != "file" {
            continue;
        }
        byte[]|mime:ParserError content = part.getByteArray();
        if content is mime:ParserError {
            return error RuleError("the file could not be read");
        }
        if content.length() == 0 {
            return error RuleError("the file is empty");
        }
        if content.length() > MAX_RECEIPT_BYTES {
            return error RuleError("the file is larger than 10 MB");
        }
        string? kind = validReceiptType(part.getContentType(), content);
        if kind is () {
            return error RuleError("only images (PNG, JPEG, GIF, WebP) and PDF files are accepted");
        }
        string name = cleanFileName(part.getContentDisposition().fileName);
        if name == "" {
            return error RuleError("the file needs a name");
        }
        return [name, kind, content];
    }
    return error RuleError("the request has no part named file");
}

function uploadReceipt(string subject, string claimId, string lineId, http:Request request) returns Receipt|error {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    boolean belongs = check lineBelongs(claim.id, lineId);
    if !belongs {
        return error NotFoundError("no such line");
    }
    if !isEditable(claim.status) {
        return error RuleError("receipts on a " + claim.status + " claim are fixed");
    }
    [string, string, byte[]] [name, contentType, content] = check readUpload(request);
    // The status check repeats in the INSERT, so a decision made meanwhile stores nothing.
    sql:ParameterizedQuery insert = `INSERT INTO receipts (line_id, file_name, content_type, size_bytes, content)
        SELECT ${lineId}::uuid, ${name}, ${contentType}, ${content.length()}, ${content}
        WHERE EXISTS (SELECT 1 FROM claims WHERE id = ${claim.id}::uuid AND status IN ('Draft', 'Submitted', 'Rejected'))
        RETURNING id::text`;
    string|sql:Error id = db->queryRow(insert);
    if id is sql:NoRowsError {
        return error RuleError("the claim was decided before the receipt was stored");
    }
    if id is error {
        return id;
    }
    return {id, fileName: name, contentType, fileUrl: receiptUrl("/me/claims", claim.id, lineId, id)};
}

function removeReceipt(string subject, string claimId, string lineId, string receiptId) returns error? {
    OwnedClaim claim = check loadOwnedClaim(subject, claimId);
    boolean belongs = check lineBelongs(claim.id, lineId);
    if !belongs || !isUuid(receiptId) {
        return error NotFoundError("no such receipt");
    }
    int found = check db->queryRow(`SELECT count(*) FROM receipts WHERE id = ${receiptId}::uuid AND line_id = ${lineId}::uuid`);
    if found == 0 {
        return error NotFoundError("no such receipt");
    }
    if !isEditable(claim.status) {
        return error RuleError("receipts on a " + claim.status + " claim are fixed");
    }
    sql:ExecutionResult removed = check db->execute(`DELETE FROM receipts r USING expense_lines l, claims c
        WHERE r.id = ${receiptId}::uuid AND r.line_id = ${lineId}::uuid AND l.id = r.line_id
            AND c.id = l.claim_id AND c.id = ${claim.id}::uuid
            AND c.status IN ('Draft', 'Submitted', 'Rejected')`);
    if removed.affectedRowCount != 1 {
        return error RuleError("the claim was decided before the receipt was removed");
    }
}

// `scope` is the reach: it restricts which claims exist for the caller.
function readReceiptFile(sql:ParameterizedQuery scope, string claimId, string lineId, string receiptId) returns http:Response|error {
    if !isUuid(claimId) || !isUuid(lineId) || !isUuid(receiptId) {
        return error NotFoundError("no such receipt");
    }
    sql:ParameterizedQuery query = sql:queryConcat(
            `SELECT r.file_name AS "fileName", r.content_type AS "contentType", r.content AS content
            FROM receipts r JOIN expense_lines l ON l.id = r.line_id
            JOIN claims c ON c.id = l.claim_id JOIN employees e ON e.id = c.employee_id `, scope,
            ` AND c.id = ${claimId}::uuid AND l.id = ${lineId}::uuid AND r.id = ${receiptId}::uuid`);
    ReceiptFile|sql:Error file = db->queryRow(query);
    if file is sql:NoRowsError {
        return error NotFoundError("no such receipt");
    }
    if file is error {
        return file;
    }
    http:Response response = new;
    response.setBinaryPayload(file.content, file.contentType);
    response.setHeader("Content-Disposition", "attachment; filename=\"" + file.fileName + "\"");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, no-store");
    return response;
}

function downloadOwnReceipt(string subject, string claimId, string lineId, string receiptId) returns http:Response|error {
    return readReceiptFile(`WHERE e.subject = ${subject}`, claimId, lineId, receiptId);
}

function downloadTeamReceipt(string subject, string claimId, string lineId, string receiptId) returns http:Response|error {
    return readReceiptFile(`JOIN employees m ON m.id = e.manager_id
        WHERE m.subject = ${subject} AND e.id <> m.id AND c.status <> 'Draft'`, claimId, lineId, receiptId);
}

function downloadAnyReceipt(string claimId, string lineId, string receiptId) returns http:Response|error {
    return readReceiptFile(`WHERE true`, claimId, lineId, receiptId);
}
