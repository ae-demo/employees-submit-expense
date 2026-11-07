import ballerina/http;
import ballerina/jwt;
import ballerina/sql;

type CallerProfile record {|
    # the person's display name from the token; "" when it carries none
    string name;
    # the display name to use when a record is first created
    string fallbackName;
    string email;
|};

type MeRow record {|
    string id;
    string name;
    string email;
    string? managerName;
|};

// Reads name and email from the assertion the interceptor has already verified.
// It decodes only; it is never a substitute for the verification.
function callerProfile(http:Request request, GatewayCaller caller) returns CallerProfile {
    string name = "";
    string email = "";
    string|http:HeaderNotFoundError raw = request.getHeader(assertionHeaderName);
    if raw is string {
        string token = raw.trim();
        if token.length() > 7 && token.substring(0, 7).toLowerAscii() == "bearer " {
            token = token.substring(7).trim();
        }
        [jwt:Header, jwt:Payload]|jwt:Error decoded = jwt:decode(token);
        if decoded is [jwt:Header, jwt:Payload] {
            jwt:Payload payload = decoded[1];
            email = claim(payload, "email").trim();
            name = claim(payload, "name").trim();
            if name == "" {
                name = (claim(payload, "given_name") + " " + claim(payload, "family_name")).trim();
            }
        }
    }
    string fallbackName = name != "" ? name : (caller.username != "" ? caller.username : (email != "" ? email : caller.userId));
    return {name, fallbackName, email};
}

// Creates the person's record on first sign-in, refreshes name and email when the token
// carries them, and returns the person. The manager stays null until Finance assigns one.
function ensurePerson(string subject, CallerProfile profile) returns Me|error {
    sql:ParameterizedQuery upsert = `INSERT INTO employees (subject, name, email)
        VALUES (${subject}, ${profile.fallbackName}, ${profile.email})
        ON CONFLICT (subject) DO UPDATE SET
            name = CASE WHEN ${profile.name}::text <> '' THEN ${profile.name}::text ELSE employees.name END,
            email = CASE WHEN ${profile.email}::text <> '' THEN ${profile.email}::text ELSE employees.email END
        RETURNING id::text`;
    string personId = check db->queryRow(upsert);
    sql:ParameterizedQuery selectMe = `SELECT e.id::text AS id, e.name AS name, e.email AS email,
            m.name AS "managerName"
        FROM employees e LEFT JOIN employees m ON m.id = e.manager_id
        WHERE e.id = ${personId}::uuid`;
    MeRow row = check db->queryRow(selectMe);
    Me me = {id: row.id, name: row.name, email: row.email, managerName: row.managerName};
    return me;
}
