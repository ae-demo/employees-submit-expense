# Submit expense claims

## Purpose

Employees create, submit and track expense claims.

## User Stories

- F1.1 As an employee, I create a claim and add several expense lines to it, each with a date, category, amount and description.
- F1.2 As an employee, I save a claim as a draft and come back to finish it later.
- F1.3 As an employee, I submit a claim to my manager.
- F1.4 As an employee, I edit a submitted claim until my manager decides it.
- F1.5 As an employee, I withdraw a submitted claim until my manager decides it.
- F1.6 As an employee, I see my claims in one list with each claim's status.
- F1.7 As an employee, I see why a claim was rejected. *assumed*
- F1.8 As an employee, I resubmit a rejected claim after correcting it. *assumed*

## Decisions

- A claim moves through the statuses Draft, Submitted, Approved, Rejected and Exported.
- A claim has one or more expense lines; the claim total is the sum of its lines.
- A claim cannot be submitted with no expense lines. *assumed*
- Editing a submitted claim keeps it Submitted, and the manager sees the updated version. *assumed*
- A withdrawn claim returns to Draft. *assumed*
- An employee with no manager assigned cannot submit a claim and is told to ask Finance to assign one. *assumed*

## Out of Scope

- Receipts on expense lines (F4) and policy checks on submit (F5) are their own features.