Feature: F1 Submit expense claims

  @story-F1.1 @story-F1.2
  Rule: An employee builds a claim from expense lines and can keep it as a draft

    Scenario: Saving a claim with two lines as a draft
      Given Maya the employee has a manager assigned
      When Maya creates a claim "Client visit, Colombo" with a "Travel" line of "$42.00" for "Taxi to client office" and a "Meals" line of "$36.00" for "Client lunch", and saves it as a draft
      Then the claim "Client visit, Colombo" is in her list as Draft with a total of "$78.00"

  @story-F1.3
  Rule: Only a claim with at least one line can be submitted, and only by an employee who has a manager

    Scenario: Submitting a claim to the manager
      Given Maya has a Draft claim "Conference trip" with a "Travel" line of "$125.00" and her manager is Ravi
      When Maya submits the claim
      Then the claim "Conference trip" shows as Submitted in her list

    @negative
    Scenario: A claim with no lines is not submitted
      Given Maya has a Draft claim "Empty claim" with no lines
      When Maya tries to submit the claim
      Then the claim "Empty claim" is still Draft

    @negative
    Scenario: An employee without a manager cannot submit
      Given Sam the employee has no manager assigned and a Draft claim "Taxi" with a "Travel" line of "$20.00"
      When Sam tries to submit the claim
      Then the claim "Taxi" is still Draft

  @story-F1.4 @story-F1.5
  Rule: Until the manager decides, the employee may edit or withdraw a submitted claim

    Scenario: Editing a submitted claim
      Given Maya has a Submitted claim "Conference trip"
      When Maya changes its description to "Conference trip, Singapore"
      Then the claim is listed as "Conference trip, Singapore" and is still Submitted

    Scenario: Withdrawing a submitted claim
      Given Maya has a Submitted claim "Conference trip"
      When Maya withdraws it
      Then the claim "Conference trip" is Draft

    @negative
    Scenario: An approved claim cannot be edited
      Given Maya has an Approved claim "Taxi in December" with a "Travel" line of "$27.50"
      When Maya tries to add a "Meals" line of "$10.00" to it
      Then the claim "Taxi in December" still has exactly one line

  @story-F1.6
  Rule: The employee sees all their claims with each claim's status

    Scenario: The list shows every status
      Given Maya has one claim each in Draft, Submitted, Approved, Rejected and Exported
      When Maya opens her claims
      Then she sees five claims, each with its own status

  @story-F1.7 @story-F1.8
  Rule: A rejected claim shows why and can be corrected and resubmitted

    Scenario: Resubmitting after a rejection
      Given Ravi rejected Maya's claim "Team lunch" with the reason "The lunch was above the team lunch budget"
      When Maya opens the claim
      Then she sees the reason "The lunch was above the team lunch budget"
      When Maya changes the "Meals" line to "$45.00" and resubmits
      Then the claim "Team lunch" is Submitted
