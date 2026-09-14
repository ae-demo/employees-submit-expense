# Employees Submit Expense — PRD

## Problem Statement

Employees who pay for business expenses out of pocket today rely on ad-hoc
methods — email threads, spreadsheets, or paper forms — to get reimbursed.
Managers lack a single place to review and approve these claims, and finance
has to manually chase down which claims were approved before they can be paid
out through payroll. This is slow, error-prone, and gives nobody a clear
record of what has been claimed, approved, or paid.

## Solution

A web application where employees submit expense claims, their manager
reviews and approves or rejects each one, and finance exports the approved
claims into a file it can feed into payroll — giving every claim a clear,
auditable path from submission to payout.

## Actors

- **Employee** — submits expense claims, tracks their status, and can edit or
withdraw a claim while it is still pending.
- **Manager** — reviews the claims submitted by the employees assigned to
them, and approves or rejects each one.
- **Finance** — reviews approved claims and exports them as a file for
payroll; marks claims as exported once handled.
- **Admin** — assigns each employee to their approving manager.

## User Stories

1. As an Employee, I want to submit an expense claim with an amount, category,
date, and description, so that I can request reimbursement.
2. As an Employee, I want to optionally attach a receipt file to a claim, so
that I have documentation backing the expense.
3. As an Employee, I want to view the status of all my submitted claims
(pending, approved, rejected), so that I know where each one stands.
4. As an Employee, I want to edit or withdraw a claim while it is still
pending, so that I can fix mistakes or cancel a claim before it is
reviewed.
5. As an Employee, I want to be notified when my claim is approved or
rejected, so that I know the outcome without checking the app.
6. As a Manager, I want to see a list of pending claims from the employees
assigned to me, so that I can review them.
7. As a Manager, I want to approve or reject a claim, optionally with a
comment, so that the employee understands the decision.
8. As a Finance user, I want to see all approved claims that have not yet
been exported, so that I can prepare a payroll run.
9. As a Finance user, I want to export approved, un-exported claims as a
downloadable file, so that I can load them into our payroll system.
10. As a Finance user, I want exported claims marked as exported, so that
they are not included in a future export.
11. As an Admin, I want to assign each employee to a fixed approving manager,
so that claims route to the correct reviewer.

## Product Decisions

- **Sign-in**: every user signs in via SSO through Thunder, the platform IDP.
- **Approval workflow**: a claim needs a single decision from the employee's
assigned manager — approve or reject. There is no additional sign-off
tier.
- **Manager assignment**: each employee has exactly one fixed approving
manager, set by an Admin.
- **Receipts**: attaching a receipt to a claim is optional, never required to
submit.
- **Receipt storage**: receipt files are stored in the organization's `aws-s3`
registered external resource.
- **Payroll export**: finance exports approved claims as a downloadable file
(CSV); there is no direct integration with a named payroll provider.
- **Notifications**: approval/rejection notifications are sent by email via
the organization's `resend` registered external resource.
- **Expense categories**: claims use a fixed starter set of categories —
Travel, Meals, Lodging, Supplies, Other.
- **Currency**: all claims are submitted and reported in a single company
currency; there is no multi-currency conversion.
- **Claim editing**: an employee may edit or withdraw a claim only while it
is still pending; once a manager decides, it is locked.

## Out of Scope

- Multi-level or threshold-based approval chains.
- Direct integration with a named payroll provider's API.
- Multi-currency claims or currency conversion.
- Actual payment/reimbursement processing — the product stops at exporting
approved claims for payroll to act on.
- Reporting/analytics dashboards beyond the claim lists each actor needs to
do their job.
- Mobile native apps.

## Open Questions

1. What exact columns/format does finance's payroll system expect in the
exported file? Using a generic CSV (employee, amount, category, date,
description) until finance specifies otherwise.

## Further Notes

None.

