# Expense policy limits

## Purpose

Caps and category rules that are checked when a claim is submitted.

Needs: F1.

## User Stories

- F5.1 As a finance user, I set a maximum amount for each expense category.
- F5.2 As a finance user, I change or remove a category's maximum.
- F5.3 As an employee, I am told which line breaks which limit when I try to submit, and the claim is not submitted until I fix it.
- F5.4 As an employee, I see the maximum for a category when I add an expense line. *assumed*

## Decisions

- The only rule type is a maximum amount per expense line.
- One policy applies to every employee; limits do not vary by role or grade.
- Finance users manage the limits in the app.
- A claim that breaks a limit cannot be submitted.
- Limits are checked on submit; changing a limit does not affect claims already submitted. *assumed*
- A category with no maximum has no limit. *assumed*
- Finance creates the expense categories, each with an optional maximum. *assumed*
- An expense line whose amount equals the maximum is allowed. *assumed*

## Out of Scope

- Limits per role, grade or employee.
- Per-claim or per-day totals, allowed-category lists and required-receipt rules.
- Flagging a limit breach for the manager instead of blocking submission.