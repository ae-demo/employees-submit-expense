import ballerina/os;

// Every setting reads an environment variable the platform wires and has a default,
// so the service starts with none set.
configurable string dbHost = envOr("EXPENSE_DB_HOST", "localhost");
configurable string dbPortText = envOr("EXPENSE_DB_PORT", "5432");
configurable string dbName = envOr("EXPENSE_DB_DBNAME", "expense");
configurable string dbUser = envOr("EXPENSE_DB_USER", "postgres");
configurable string dbPassword = envOr("EXPENSE_DB_PASSWORD", "postgres");
configurable string emailServiceBaseUrl = envOr("EMAIL_SERVICE_BASE_URL", "http://localhost:8080/v1");
configurable string assertionHeaderName = firstSet(
        [os:getEnv("GATEWAY_ASSERTION_HEADER"), os:getEnv("USER_TOKEN_HEADER")], DEFAULT_FORWARDED_TOKEN_HEADER);

function envOr(string name, string fallback) returns string {
    string value = os:getEnv(name);
    return value.trim() == "" ? fallback : value.trim();
}

function firstSet(string[] values, string fallback) returns string {
    foreach string value in values {
        if value.trim() != "" {
            return value.trim();
        }
    }
    return fallback;
}
