Feature: F2 Approvals

  @story-F2.1 @story-F2.2 @story-F2.5
  Rule: A manager sees the submitted claims of their own team, oldest first

    Scenario: The queue shows direct reports' claims only
      Given Ravi manages Maya and Dan, and Priya manages Ravi
      And Dan submitted "Training books" on "2026-01-09" and Maya submitted "Conference trip" on "2026-01-12"
      And Priya's other report Ana submitted "Software licence"
      When Ravi opens his team approvals
      Then he sees "Training books" first and "Conference trip" second
      And he does not see "Software licence"

    Scenario: The manager is emailed when a claim is submitted
      Given Ravi manages Maya
      When Maya submits her claim "Conference trip"
      Then Ravi receives an email about "Conference trip"

    Scenario: A manager sees the lines of a claim
      Given Maya's submitted claim "Conference trip" has a "Travel" line of "$125.00" and an "Accommodation" line of "$180.00"
      When Ravi opens the claim
      Then he sees both lines and a total of "$305.00"

  @story-F2.3 @story-F2.6 @story-F2.7
  Rule: A manager approves a claim as a whole and the employee is told

    Scenario: Approving a claim
      Given Maya's claim "Conference trip" is Submitted to Ravi
      When Ravi approves it
      Then the claim is Approved and listed in Ravi's decided claims
      And Maya receives an email that "Conference trip" was approved

  @story-F2.4
  Rule: A rejection needs a reason

    Scenario: Rejecting with a reason
      Given Maya's claim "Team lunch" is Submitted to Ravi
      When Ravi rejects it with the reason "Above the team lunch budget"
      Then the claim is Rejected and Maya sees the reason "Above the team lunch budget"

    @negative
    Scenario: A rejection without a reason is refused
      Given Maya's claim "Team lunch" is Submitted to Ravi
      When Ravi tries to reject it with an empty reason
      Then the claim "Team lunch" is still Submitted

  Rule: Only a direct manager decides a claim, and never their own

    @negative
    Scenario: A manager of another team cannot decide the claim
      Given Maya's claim "Conference trip" is Submitted to Ravi
      When Priya tries to approve it
      Then the claim "Conference trip" is still Submitted

    @negative
    Scenario: A decided claim cannot be changed by the manager
      Given Ravi approved Maya's claim "Conference trip"
      When Ravi tries to reject it with the reason "Changed my mind"
      Then the claim "Conference trip" is still Approved

  Rule: Finance assigns each employee's manager

    Scenario: Assigning a manager
      Given Sam the employee has no manager and Ana is from Finance
      When Ana assigns Ravi as Sam's manager
      Then Sam's claims are submitted to Ravi

    @negative
    Scenario: An employee cannot assign managers
      Given Maya is signed in as an employee
      When Maya tries to open the People list
      Then she sees no employees and no way to change a manager
