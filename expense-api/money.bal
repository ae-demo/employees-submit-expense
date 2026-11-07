// P3: every amount is whole cents in one company currency. Later features use these
// helpers and never carry money as a float.

# Converts a decimal dollar amount (for example 12.34) to whole cents.
#
# + dollars - the amount in dollars; at most two decimal places
# + return - the amount in cents, or an error when it has sub-cent precision
function dollarsToCents(decimal dollars) returns int|error {
    decimal scaled = dollars * 100d;
    if scaled != scaled.round() {
        return error("an amount has at most two decimal places");
    }
    return <int>scaled;
}

# Formats cents as dollars and cents with two decimals, for example 1234 as "12.34".
#
# + cents - the amount in cents
# + return - the dollars-and-cents text
function formatCents(int cents) returns string {
    int absolute = cents < 0 ? -cents : cents;
    int remainder = absolute % 100;
    string fraction = remainder < 10 ? "0" + remainder.toString() : remainder.toString();
    string sign = cents < 0 ? "-" : "";
    return sign + (absolute / 100).toString() + "." + fraction;
}

# Checks that an expense line amount is a positive number of cents.
#
# + cents - the amount in cents
# + return - an error when the amount is zero or negative
function requirePositiveCents(int cents) returns error? {
    if cents < 1 {
        return error("an amount must be at least one cent");
    }
}
