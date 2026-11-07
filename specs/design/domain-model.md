# Domain model

Employees submit claims made of expense lines, each in a category with an optional maximum and with optional receipts. Managers decide claims, and Finance exports approved claims in batches. Amounts are whole cents in one company currency.

```mermaid
erDiagram
    EMPLOYEE ||--o{ EMPLOYEE : "manages"
    EMPLOYEE ||--o{ CLAIM : "submits"
    EMPLOYEE ||--o{ EXPORT : "creates"
    CLAIM ||--|{ EXPENSE_LINE : "contains"
    CATEGORY ||--o{ EXPENSE_LINE : "classifies"
    EXPENSE_LINE ||--o{ RECEIPT : "has"
    EXPORT ||--o{ CLAIM : "includes"

    EMPLOYEE {
        uuid id PK
        string subject "identity provider subject"
        string name
        string email
        uuid managerId FK "null until Finance assigns one"
    }
    CLAIM {
        uuid id PK
        string number "EXP-1042"
        uuid employeeId FK
        string description
        string status "Draft, Submitted, Approved, Rejected, Exported"
        date submittedOn
        date decidedOn
        string rejectionReason
        uuid exportId FK "set once exported"
    }
    EXPENSE_LINE {
        uuid id PK
        uuid claimId FK
        uuid categoryId FK
        date expenseDate
        int amountCents
        string description
    }
    RECEIPT {
        uuid id PK
        uuid lineId FK
        string fileName
        string contentType "image or PDF"
        string objectKey "key in receipt storage"
    }
    CATEGORY {
        uuid id PK
        string name
        int maximumCents "null means no limit"
    }
    EXPORT {
        uuid id PK
        date createdOn
        uuid createdBy FK
        int claimCount
        int totalCents
    }
```

A claim's total is the sum of its lines and is never stored. An export's file is regenerated from its claims, so a re-download never changes a claim.