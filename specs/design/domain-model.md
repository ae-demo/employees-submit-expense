# Domain Model

The core entities behind expense claim submission, approval, and payroll
export.

```mermaid
erDiagram
    EMPLOYEE ||--o{ EXPENSE_CLAIM : submits
    EMPLOYEE ||--o| EMPLOYEE : "managed by"
    EXPENSE_CLAIM ||--o| RECEIPT : has
    EXPENSE_CLAIM ||--o{ EXPORT_BATCH : "included in"

    EMPLOYEE {
        string id
        string name
        string email
        string role
        string managerId
    }
    EXPENSE_CLAIM {
        string id
        string employeeId
        decimal amount
        string category
        date expenseDate
        string description
        string status
        string decisionComment
        string decidedBy
        datetime decidedAt
        boolean exported
        datetime createdAt
    }
    RECEIPT {
        string id
        string claimId
        string fileUrl
        string fileName
    }
    EXPORT_BATCH {
        string id
        string exportedBy
        datetime exportedAt
        string fileUrl
    }
```

- **EMPLOYEE** — every signed-in user (employee, manager, finance, admin);
`role` distinguishes the actor, `managerId` links an employee to their
fixed approving manager.
- **EXPENSE\_CLAIM** — one reimbursement request; `status` is one of
`pending`, `approved`, `rejected`; `exported` flags whether it has been
included in a payroll export.
- **RECEIPT** — the optional attached file for a claim, stored via `aws-s3`.
- **EXPORT\_BATCH** — one payroll export run finance produced, recording which
file was generated and when.

