# Product-wide

Rules that apply to more than one feature.

## Requirements

- P1 Every user signs in through single sign-on. \[org default\] Applies to: all.
- P2 Every submission, approval, rejection and export is recorded in an audit log. Applies to: all. *assumed*
- P3 Amounts are in one company currency, stored in cents. Applies to: F1, F2, F3, F5. *assumed*

## Decisions

- Payroll export is a downloadable file; no payroll system is integrated.
- A manager approves claims of their direct reports. *assumed*