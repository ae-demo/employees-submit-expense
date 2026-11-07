Feature: F5 Expense policy limits

  @story-F5.1 @story-F5.2
  Rule: Finance sets, changes and removes the maximum of each category

    Scenario: Setting a maximum
      Given the category "Meals" has no maximum
      When Ana from Finance sets the maximum of "Meals" to "$50.00"
      Then the limits list shows "Meals" with "$50.00"

    Scenario: Removing a maximum
      Given the category "Travel" has a maximum of "$300.00"
      When Ana removes the maximum of "Travel"
      Then the limits list shows "Travel" with no maximum

    @negative
    Scenario: Employees cannot change limits
      Given Maya is signed in as an employee
      When Maya tries to change the maximum of "Meals"
      Then the maximum of "Meals" is unchanged

  @story-F5.3
  Rule: A claim with a line over its category maximum cannot be submitted

    @negative
    Scenario: A line over the maximum blocks submission
      Given "Travel" has a maximum of "$300.00" and Maya has a Draft claim with a "Travel" line "Taxi to client office" of "$450.00"
      When Maya tries to submit the claim
      Then she is shown that "Taxi to client office" is over the "$300.00" maximum
      And the claim is still Draft

    Scenario: A line equal to the maximum is allowed
      Given "Meals" has a maximum of "$50.00" and Maya has a Draft claim with a "Meals" line of "$50.00"
      When Maya submits the claim
      Then the claim is Submitted

    Scenario: A category without a maximum has no limit
      Given "Office supplies" has no maximum and Maya has a Draft claim with an "Office supplies" line of "$900.00"
      When Maya submits the claim
      Then the claim is Submitted

    Scenario: Changing a limit leaves submitted claims alone
      Given Maya's Submitted claim has a "Meals" line of "$48.00" and "Meals" has a maximum of "$50.00"
      When Ana lowers the maximum of "Meals" to "$40.00"
      Then Maya's claim is still Submitted

  @story-F5.4
  Rule: An employee sees each category's maximum while adding a line

    Scenario: Maximums are visible on the claim
      Given "Meals" has a maximum of "$50.00" and "Travel" has a maximum of "$300.00"
      When Maya opens a Draft claim to add a line
      Then she sees "Meals $50.00" and "Travel $300.00" as the maximums per line
