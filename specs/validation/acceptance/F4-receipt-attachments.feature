Feature: F4 Receipt attachments

  @story-F4.1 @story-F4.5
  Rule: An employee attaches receipts to expense lines, which are optional

    Scenario: Attaching a receipt to a line
      Given Maya has a Draft claim with a "Travel" line of "$42.00" and no receipt
      When Maya attaches the PDF "taxi-0110.pdf" to that line
      Then the line shows the receipt "taxi-0110.pdf" on her claim

    Scenario: A claim without receipts can still be submitted
      Given Maya has a Draft claim with a "Meals" line of "$36.00" and no receipt
      When Maya submits the claim
      Then the claim is Submitted

    @negative
    Scenario: Only images and PDFs are accepted
      Given Maya has a Draft claim with a "Travel" line of "$42.00"
      When Maya tries to attach a spreadsheet "costs.xlsx" to the line
      Then the line has no receipt

  @story-F4.2
  Rule: Receipts can be removed only until the claim is decided

    Scenario: Removing a receipt from a submitted claim
      Given Maya's Submitted claim has a line with the receipt "hotel.pdf"
      When Maya removes the receipt
      Then the line has no receipt

    @negative
    Scenario: A receipt on an approved claim is fixed
      Given Maya's Approved claim has a line with the receipt "taxi.jpg"
      When Maya tries to remove the receipt
      Then the line still has the receipt "taxi.jpg"

  @story-F4.3 @story-F4.4
  Rule: Reviewers see receipts, each only on the claims they may read

    Scenario: A manager sees a team member's receipts
      Given Dan's Submitted claim has a line with the receipt "books.pdf" and Ravi manages Dan
      When Ravi opens the claim
      Then he can open the receipt "books.pdf"

    Scenario: Finance sees receipts on an approved claim
      Given Dan's Approved claim "Hotel in Kandy" has a line with the receipt "kandy.pdf"
      When Ana from Finance opens the claim
      Then she can open the receipt "kandy.pdf"

    @negative
    Scenario: A manager of another team cannot open the receipt
      Given Dan's Submitted claim has a line with the receipt "books.pdf" and Priya does not manage Dan
      When Priya tries to open Dan's claim
      Then she sees no claim and no receipt
