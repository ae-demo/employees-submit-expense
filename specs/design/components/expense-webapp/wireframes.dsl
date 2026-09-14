screen MyClaims "An employee's submitted claims and their status"
  navbar "Expense Tracker | My Claims -> MyClaims"
  sidebar "My Claims -> MyClaims | Submit Claim -> SubmitClaim"
  row
    heading "My Claims"
    right
    button "Submit Claim" primary -> SubmitClaim
  table "Date | Category | Amount | Status | " -> ClaimDetail
    row "2026-09-01 | Travel | 120.00 | Pending | "
    row "2026-08-20 | Meals | 42.50 | Approved | "
    row "2026-08-15 | Supplies | 18.00 | Rejected | "

screen SubmitClaim "Submit a new expense claim"
  navbar "Expense Tracker | My Claims -> MyClaims"
  sidebar "My Claims -> MyClaims | Submit Claim -> SubmitClaim"
  heading "Submit Claim"
  input "Amount"
  select "Category (Travel, Meals, Lodging, Supplies, Other)"
  input "Expense date"
  textarea "Description"
  input "Receipt file (optional)"
  row
    right
    button "Cancel" -> MyClaims
    button "Submit" primary -> MyClaims

screen ClaimDetail "Details and outcome of one expense claim"
  navbar "Expense Tracker | My Claims -> MyClaims"
  sidebar "My Claims -> MyClaims | Submit Claim -> SubmitClaim"
  heading "Claim Detail"
  text "Category: Travel"
  text "Amount: 120.00"
  text "Expense date: 2026-09-01"
  text "Description: Client site visit"
  badge "Pending" warning
  text "Decision comment: —"
  row
    button "Edit" -> SubmitClaim
    button "Withdraw" danger

screen ApprovalQueue "A manager's pending claims from their direct reports"
  navbar "Expense Tracker | Approvals -> ApprovalQueue"
  sidebar "Approvals -> ApprovalQueue"
  heading "Approval Queue"
  table "Employee | Date | Category | Amount | " -> ReviewClaim
    row "Jane Doe | 2026-09-01 | Travel | 120.00 | "
    row "Sam Lee | 2026-08-28 | Meals | 35.00 | "

screen ReviewClaim "A manager reviews and decides one claim"
  navbar "Expense Tracker | Approvals -> ApprovalQueue"
  sidebar "Approvals -> ApprovalQueue"
  heading "Review Claim"
  text "Employee: Jane Doe"
  text "Category: Travel"
  text "Amount: 120.00"
  text "Description: Client site visit"
  image "Receipt"
  textarea "Comment (optional)"
  row
    right
    button "Reject" danger -> ApprovalQueue
    button "Approve" primary -> ApprovalQueue

screen ExportQueue "Finance reviews approved claims and exports them for payroll"
  navbar "Expense Tracker | Export -> ExportQueue"
  sidebar "Export -> ExportQueue"
  row
    heading "Approved Claims — Ready to Export"
    right
    button "Generate Export" primary -> ExportHistory
  table "Employee | Date | Category | Amount | "
    row "Jane Doe | 2026-09-01 | Travel | 120.00 | "
    row "Sam Lee | 2026-08-28 | Meals | 35.00 | "

screen ExportHistory "Past payroll export batches"
  navbar "Expense Tracker | Export -> ExportQueue"
  sidebar "Export -> ExportQueue"
  heading "Export History"
  table "Date | Exported By | File | "
    row "2026-09-10 | Finance User | expenses-2026-09-10.csv | "

screen ManagerAssignments "Admin assigns each employee to their approving manager"
  navbar "Expense Tracker | Assignments -> ManagerAssignments"
  sidebar "Assignments -> ManagerAssignments"
  heading "Manager Assignments"
  table "Employee | Current Manager | "
    row "Jane Doe | Sam Lee | "
    row "Sam Lee | — | "
  select "Change manager for selected employee"
  row
    right
    button "Save" primary

flow "Submit and track claims"
  role "Employee"
  description "An employee submits a claim, optionally attaches a receipt, and tracks its status"
  MyClaims
  SubmitClaim
  ClaimDetail

flow "Approval queue"
  role "Manager"
  description "A manager reviews pending claims from their direct reports and decides each one"
  ApprovalQueue
  ReviewClaim

flow "Payroll export"
  role "Finance"
  description "Finance reviews approved claims and exports them as a file for payroll"
  ExportQueue
  ExportHistory

flow "Manager assignments"
  role "Admin"
  description "An admin assigns each employee to their fixed approving manager"
  ManagerAssignments
