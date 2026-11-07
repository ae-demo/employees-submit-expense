import ballerina/http;
import ballerina/sql;

// Category management (Finance) and the submit-time maximum check. Amounts are whole cents.

public type CategoryCreated record {|
    *http:Created;
    Category body;
|};

function validateCategory(CategoryInput input) returns [string, int?]|error {
    string name = input.name.trim();
    if name == "" {
        return error RuleError("the category name is required");
    }
    if name.length() > 100 {
        return error RuleError("the category name is too long");
    }
    int? maximum = input?.maximumCents;
    if maximum is int && maximum < 0 {
        return error RuleError("the maximum must be zero or more cents");
    }
    return [name, maximum];
}

function isDuplicateName(error failure) returns boolean {
    return failure is sql:DatabaseError && failure.message().includes("categories_name_key");
}

function createCategory(CategoryInput input) returns Category|error {
    [string, int?] [name, maximum] = check validateCategory(input);
    sql:ParameterizedQuery insert = `INSERT INTO categories (name, maximum_cents) VALUES (${name}, ${maximum})
        RETURNING id::text AS id, name AS name, maximum_cents AS "maximumCents"`;
    Category|error created = db->queryRow(insert);
    if created is error && isDuplicateName(created) {
        return error RuleError("a category with this name already exists");
    }
    return created;
}

// A full replace: a missing or null maximum removes the limit.
function updateCategory(string categoryId, CategoryInput input) returns Category|error {
    if !isUuid(categoryId) {
        return error NotFoundError("no such category");
    }
    [string, int?] [name, maximum] = check validateCategory(input);
    sql:ParameterizedQuery update = `UPDATE categories SET name = ${name}, maximum_cents = ${maximum}
        WHERE id = ${categoryId}::uuid
        RETURNING id::text AS id, name AS name, maximum_cents AS "maximumCents"`;
    Category|error updated = db->queryRow(update);
    if updated is sql:NoRowsError {
        return error NotFoundError("no such category");
    }
    if updated is error && isDuplicateName(updated) {
        return error RuleError("a category with this name already exists");
    }
    return updated;
}

// Every line over its category maximum; a line equal to the maximum is allowed.
function checkLimits(string claimId) returns error? {
    stream<LimitViolation, sql:Error?> rows = db->query(`SELECT l.id::text AS "lineId", l.description AS description,
        k.name AS category, l.amount_cents AS "amountCents", k.maximum_cents AS "maximumCents"
        FROM expense_lines l JOIN categories k ON k.id = l.category_id
        WHERE l.claim_id = ${claimId}::uuid AND k.maximum_cents IS NOT NULL AND l.amount_cents > k.maximum_cents
        ORDER BY l.expense_date, l.id`);
    LimitViolation[] violations = check from LimitViolation row in rows
        select row;
    if violations.length() > 0 {
        string[] parts = from LimitViolation v in violations
            select "\"" + v.description + "\" is $" + formatCents(v.amountCents) + ", over the $" + formatCents(v.maximumCents) + " maximum for " + v.category;
        return error LimitError(string:'join("; ", ...parts), violations = violations);
    }
}
