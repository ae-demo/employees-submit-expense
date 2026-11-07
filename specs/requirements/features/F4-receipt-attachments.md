# Receipt attachments

## Purpose

Employees attach receipts to expenses, and reviewers view them.

Needs: F1.

## User Stories

- F4.1 As an employee, I attach one or more receipts to an expense line.
- F4.2 As an employee, I remove a receipt from an expense line while the claim is Draft or Submitted.
- F4.3 As a manager, I view the receipts on a claim's expense lines when reviewing it.
- F4.4 As a finance user, I view the receipts on an approved claim. *assumed*
- F4.5 As an employee, I view the receipts on my own claims. *assumed*

## Decisions

- Receipts attach to individual expense lines, not to the claim as a whole.
- Accepted receipt files are images and PDFs.
- A receipt is always optional; no rule requires one.
- Receipts can be added or removed while the claim is Draft or Submitted, and are fixed once it is decided.
- Employees enter expense details themselves; receipts are not read automatically.
- A maximum receipt file size applies. *assumed*

## Out of Scope

- Automatic extraction of amount, date or merchant from a receipt.