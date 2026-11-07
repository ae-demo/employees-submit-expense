Feature: F3 Payroll export

  @story-F3.1
  Rule: Finance sees only approved claims that are not yet exported

    Scenario: The export list
      Given there is one claim each Submitted, Approved, Rejected and Exported
      When Ana from Finance opens the payroll export
      Then she sees only the Approved claim

  @story-F3.2 @story-F3.3 @story-F3.5
  Rule: Exporting marks the chosen claims Exported and leaves them out of later exports

    Scenario: Exporting one claim of two
      Given Maya's claim "Taxi in December" for "$27.50" and Dan's claim "Hotel in Kandy" for "$195.00" are Approved
      When Ana selects "Taxi in December" and exports it
      Then the claim "Taxi in December" is Exported and Maya sees it as Exported
      And the export list still shows "Hotel in Kandy" as Approved and not "Taxi in December"

    @negative
    Scenario: An export needs at least one claim
      Given Dan's claim "Hotel in Kandy" is Approved
      When Ana tries to export with nothing selected
      Then no export is created and "Hotel in Kandy" is still Approved

    @negative
    Scenario: A claim that is not approved cannot be exported
      Given Maya's claim "Conference trip" is Submitted
      When Ana tries to export "Conference trip"
      Then "Conference trip" is still Submitted

  @story-F3.4
  Rule: Past exports can be downloaded again without changing anything

    Scenario: Downloading an export twice
      Given Ana exported "Taxi in December" for "$27.50"
      When Ana downloads that export twice
      Then both files have one row for "Maya Fernando", claim "EXP-1030", total "$27.50" and the approval date
      And no claim changed status

    @negative
    Scenario: Employees cannot reach exports
      Given Maya is signed in as an employee
      When Maya tries to open the export history
      Then she sees no exports
