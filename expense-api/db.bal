import ballerina/lang.'int as langint;
import ballerina/log;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

final postgresql:Client db = check new (
    host = dbHost,
    username = dbUser,
    password = dbPassword,
    database = dbName,
    port = check langint:fromString(dbPortText)
);

// Runs before the listener starts, so an unreachable database fails the service fast.
final () dbReady = check initSchema();

function initSchema() returns error? {
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS employees (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subject text NOT NULL UNIQUE,
        name text NOT NULL,
        email text NOT NULL DEFAULT '',
        manager_id uuid REFERENCES employees (id),
        created_at timestamptz NOT NULL DEFAULT now()
    )`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        maximum_cents bigint CHECK (maximum_cents IS NULL OR maximum_cents >= 0)
    )`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS exports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_on date NOT NULL DEFAULT current_date,
        created_by uuid NOT NULL REFERENCES employees (id),
        claim_count integer NOT NULL,
        total_cents bigint NOT NULL
    )`);
    _ = check db->execute(`CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 1001`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS claims (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        number text NOT NULL UNIQUE DEFAULT ('EXP-' || nextval('claim_number_seq')),
        employee_id uuid NOT NULL REFERENCES employees (id),
        description text NOT NULL,
        status text NOT NULL DEFAULT 'Draft'
            CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected', 'Exported')),
        submitted_on date,
        decided_on date,
        rejection_reason text,
        export_id uuid REFERENCES exports (id),
        created_at timestamptz NOT NULL DEFAULT now()
    )`);
    _ = check db->execute(`CREATE INDEX IF NOT EXISTS claims_employee_idx ON claims (employee_id)`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS expense_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id uuid NOT NULL REFERENCES claims (id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories (id),
        expense_date date NOT NULL,
        amount_cents bigint NOT NULL CHECK (amount_cents > 0),
        description text NOT NULL
    )`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS receipts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        line_id uuid NOT NULL REFERENCES expense_lines (id) ON DELETE CASCADE,
        file_name text NOT NULL,
        content_type text NOT NULL,
        size_bytes integer NOT NULL CHECK (size_bytes <= 10485760),
        content bytea NOT NULL
    )`);
    _ = check db->execute(`CREATE TABLE IF NOT EXISTS audit_log (
        id bigserial PRIMARY KEY,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        actor_id uuid REFERENCES employees (id),
        action text NOT NULL,
        claim_id uuid,
        export_id uuid,
        detail text NOT NULL DEFAULT ''
    )`);
    log:printInfo("expense database schema is ready");
}
