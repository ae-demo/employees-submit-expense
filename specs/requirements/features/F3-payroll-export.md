# Payroll export

## Purpose

Finance exports approved claims to a downloadable file for payroll.

Needs: F2.

## User Stories

- F3.1 As a finance user, I see a list of approved claims not yet exported.
- F3.2 As a finance user, I select claims from that list and export them to a downloadable file.
- F3.3 As a finance user, I see exported claims marked Exported and left out of later exports.
- F3.4 As a finance user, I see a history of past exports and re-download any of them.
- F3.5 As an employee, I see my claim become Exported once finance has exported it. *assumed*

## Decisions

- The export file has one row per claim: employee, claim ID, total and approval date.
- The export file is a CSV. *assumed*
- A claim is exported at most once; re-downloading a past export does not change any claim.
- Only approved claims can be exported.

## Out of Scope

- Pushing the export to a payroll system.
- Per-line (category-level) rows in the export.