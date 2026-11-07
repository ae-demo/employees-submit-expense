// Generated from specs/design/components/expense-api/openapi.yaml by bal openapi (types only).
// The service itself lives in service.bal.

import ballerina/constraint;
import ballerina/http;

public type Category record {
    string id;
    string name;
    # maximum amount per expense line; null means no limit
    int? maximumCents;
};

public type ExportInput record {
    @constraint:Array {minLength: 1}
    string[] claimIds;
};

public type ExportPage record {
    int count;
    string? next?;
    string? previous?;
    Export[] data;
};

public type ExpenseLineInput record {
    string expenseDate;
    string categoryId;
    @constraint:Int {minValue: 1}
    int amountCents;
    string description;
};

public type ClaimRefusalUnprocessableEntity record {|
    *http:UnprocessableEntity;
    ClaimRefusal body;
|};

# A submit refused because of limits, missing lines or a missing manager.
public type ClaimRefusal record {
    *Error;
    LimitViolation[] violations?;
};

public type ClaimDetailOk record {|
    *http:Ok;
    ClaimDetail body;
|};

public type ClaimSummary record {
    string id;
    # for example EXP-1042
    string number;
    string employeeName;
    string description;
    "Draft"|"Submitted"|"Approved"|"Rejected"|"Exported" status;
    # sum of the claim's lines
    int totalCents;
    string? submittedOn?;
    string? decidedOn?;
};

public type CategoryInput record {
    string name;
    int? maximumCents?;
};

public type LimitViolation record {
    string lineId;
    # the expense line's description
    string description;
    string category;
    int amountCents;
    int maximumCents;
};

public type Export record {
    string id;
    string createdOn;
    string createdByName;
    int claimCount;
    int totalCents;
};

public type ClaimInput record {
    string description;
};

public type Receipt record {
    string id;
    string fileName;
    # an image type or application/pdf
    string contentType;
    # relative URI of the operation that returns the file for this caller
    string fileUrl;
};

public type PersonPage record {
    int count;
    string? next?;
    string? previous?;
    Person[] data;
};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type ErrorBadRequest record {|
    *http:BadRequest;
    Error body;
|};

public type ManagerAssignment record {
    # null removes the manager
    string? managerId?;
};

public type Rejection record {
    @constraint:String {minLength: 1}
    string reason;
};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type Me record {
    string id;
    string name;
    string email;
    # null until Finance assigns a manager
    string? managerName?;
};

public type ExpenseLine record {
    string id;
    string expenseDate;
    string category;
    int amountCents;
    string description;
    Receipt[] receipts;
};

public type ClaimDetail record {
    *ClaimSummary;
    string? rejectionReason?;
    ExpenseLine[] lines;
};

public type CategoryPage record {
    int count;
    string? next?;
    string? previous?;
    Category[] data;
};

public type ClaimPage record {
    int count;
    string? next?;
    string? previous?;
    ClaimSummary[] data;
};

public type Person record {
    string id;
    string name;
    string email;
    string? managerId?;
    string? managerName?;
};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};
