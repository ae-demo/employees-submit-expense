# Employee expense claims

## Problem Statement

Employees need to be reimbursed for money they spend on work, managers need to review those claims, and finance needs approved claims in payroll. Without one place to do this, claims are chased by hand and re-keyed into payroll.

## Solution

A web app where employees submit expense claims with receipts, managers approve or reject them against expense policy limits, and finance exports approved claims to payroll as a downloadable file.

## Actors

- Employee — submits and tracks their own expense claims.
- Manager — reviews and decides claims from their team.
- Finance — exports approved claims for payroll.

## Features

- F1 [Submit expense claims](features/F1-submit-expense-claims.md)
- F2 [Approvals](features/F2-approvals.md)
- F3 [Payroll export](features/F3-payroll-export.md)
- F4 [Receipt attachments](features/F4-receipt-attachments.md)
- F5 [Expense policy limits](features/F5-expense-policy-limits.md)

## Product-wide

See [Product-wide](product-wide.md).

## Out of Scope

- Direct integration with a payroll system; export is a downloadable file.

## Open Questions

1. Is there a payroll file format finance must match, or is a simple CSV enough?

