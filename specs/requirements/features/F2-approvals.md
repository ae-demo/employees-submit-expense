# Approvals

## Purpose

Managers review and approve or reject their team's submitted claims.

Needs: F1.

## User Stories

- F2.1 As a manager, I see my team's submitted claims in one list, oldest first.
- F2.2 As a manager, I open a claim and see its expense lines and total.
- F2.3 As a manager, I approve a claim.
- F2.4 As a manager, I reject a claim with a reason.
- F2.5 As a manager, I receive an email when a claim from my team is submitted.
- F2.6 As an employee, I receive an email when my claim is approved or rejected. *assumed*
- F2.7 As a manager, I see claims I have already decided. *assumed*

## Decisions

- Every claim needs approval from the employee's manager; there is no auto-approval.
- A manager approves or rejects a claim as a whole, not line by line.
- A rejection requires a reason.
- While a manager is away, claims wait; there are no deputies.
- Email notification uses a transactional email service.
- A decided claim can no longer be changed by the manager. *assumed*

## Out of Scope

- Approval chains beyond the employee's manager.
- Partial approval of individual expense lines.
- Deputies or delegation.