import { useState } from "react";

import Layout from "@/components/Layout";

import SEO from "@/components/SEO";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Shield, Scale, BookOpen } from "lucide-react";



const marketplaceRulesHtml = `

<h3 class="text-lg font-bold mb-2">INTRODUCTION</h3>

<p>These Marketplace Rules form part of your agreement with ReBooked Solutions (Pty) Ltd and must be read together with our Terms and Conditions and Privacy Policy. By accessing or using the Platform, you agree to be bound by these Rules in their entirety. ReBooked Solutions acts solely as a digital intermediary and technology facilitator. We do not own, inspect, warrant, or guarantee any item listed on the Platform. Every sale contract is a private agreement strictly between the Buyer and the Seller. Defined terms used in these Rules (such as "Buyer," "Seller," "User," "Wallet," "Pickup," and "Payment Provider") carry the same meaning given to them in our Terms and Conditions.</p>



<h3 class="text-lg font-bold mb-2">1. ACCOUNT INTEGRITY AND ELIGIBILITY</h3>

<p><strong>1.1 Truthful Registration</strong><br />You must provide accurate, current, and complete information when registering and at all times thereafter. Providing false or misleading details — including a false name, email address, age, or bank account — constitutes a material breach and will result in immediate permanent account termination without refund of any wallet balance, subject to applicable law.</p>

<p><strong>1.2 One Account Rule</strong><br />Each person may hold only one active account. Creating additional accounts to evade a suspension or ban, inflate ratings, manipulate listings, abuse the referral program under Section 11, or otherwise circumvent these Rules is a material breach and will result in permanent termination of all associated accounts.</p>

<p><strong>1.3 Age Requirement and Parental Consent</strong><br />You must be at least 13 years of age to use the Platform. If you are under 18, you confirm that your parent or legal guardian is aware of and consents to your use of the Platform and any transactions you conduct through it. By registering, you represent that this consent has been obtained. ReBooked Solutions accepts no liability arising from a minor's misrepresentation of age or parental consent. Liability in such cases rests solely with the minor and/or their parent or legal guardian.</p>

<p><strong>1.4 Acceptable Use</strong><br />In addition to the specific rules in this document, you must not use the Platform to upload malware, scrape or harvest data using automated means, interfere with the security or normal operation of the Platform, use the Platform for money laundering or unlawful financial activity, or attempt to reverse engineer the Platform. A breach of this clause is a material breach and may result in suspension or termination.</p>



<h3 class="text-lg font-bold mb-2">2. APPROVED CATEGORIES</h3>

<p>The Platform supports the following approved categories of educational goods only:</p>

<ul class="list-disc pl-6 space-y-1">

  <li>Textbooks and readers (physical, school and university level)</li>

  <li>School stationery and materials (stationery packs, EGD boards, art supplies, technical drawing sets, and similar)</li>

  <li>School uniforms (blazers, shirts, trousers, skirts, and school-branded items)</li>

  <li>School sports and physical education wear (rugby kits, netball uniforms, athletics gear, and similar)</li>

</ul>

<p>Listings outside these approved categories will be removed without notice. Repeated violations may result in account suspension or permanent termination. We reserve the right to expand or restrict approved categories at our discretion with reasonable notice to users.</p>



<h3 class="text-lg font-bold mb-2">3. LISTING AND PRICING RULES</h3>

<p><strong>3.1 Original Photos Only</strong><br />You must upload original photographs of the exact item you are selling, currently in your possession. AI-generated images, stock images, manufacturer images, and images of a different copy of the same item are strictly prohibited. Listings found to contain non-original images will be removed immediately without notice.</p>

<p><strong>3.2 Condition Disclosure</strong><br />You must honestly and fully describe the condition of every item you list:</p>

<ul class="list-disc pl-6 space-y-1">

  <li><strong>Textbooks and Readers:</strong> Disclose all markings, highlighting, handwriting, and underlining. If markings cover more than 10% of pages, this must be stated explicitly in the listing. Failure to disclose constitutes misrepresentation.</li>

  <li><strong>Uniforms and Sports Wear:</strong> Disclose any staining, fading, damage, repairs, alterations, or missing components. Items must be clean before dispatch or Pickup.</li>

  <li><strong>Stationery and Materials:</strong> Disclose any partial use, missing items, damage, or wear.</li>

</ul>

<p>Where a Seller's failure to disclose results in a dispute, the dispute will ordinarily be resolved in the Buyer's favour and the Seller will bear all associated costs, unless the Seller can demonstrate the omission was immaterial and did not influence the Buyer's purchasing decision.</p>

<p><strong>3.3 Digital Access Codes</strong><br />Unless your listing explicitly states that a digital access code is unused and currently valid, all digital components are assumed to be used or expired. You may not represent a used, expired, or previously redeemed code as valid. Doing so constitutes fraud and will result in immediate permanent termination and a R250 liquidated damages deduction.</p>

<p><strong>3.4 School-Specific Items</strong><br />Uniforms and sports wear associated with a specific school must accurately state the school's name. Misrepresentation of school affiliation or branding is a material breach of these Rules.</p>

<p><strong>3.5 Pricing, Commission, and Fees</strong><br />Sellers set their own prices in South African Rand (ZAR). A platform commission of 10% is automatically deducted from the Seller's proceeds upon successful completion of a transaction. A flat Buyer Protection Fee of R20 is added to the Buyer's checkout total on each transaction, regardless of whether the order is fulfilled by Courier or Pickup. This fee is refundable only where the Seller fails to commit to the sale within the 48-hour window in Section 5, or where the Buyer cancels before the Seller commits under Section 5.1A; once the Seller has committed to the sale, the fee is non-refundable, including where the order is later cancelled or resolved in the Buyer's favour following a dispute.</p>



<h3 class="text-lg font-bold mb-2">4. CHAT RULES</h3>

<p><strong>4.1 Permitted Use</strong><br />Chat is provided for transaction-related communication only. Permitted uses include: asking questions about a listing, coordinating delivery or Pickup logistics within the Platform, sharing a Pickup meeting location, and resolving order-related queries between Buyer and Seller.</p>

<p><strong>4.2 Prohibited Conduct</strong><br />The following conduct in Chat is strictly prohibited:</p>

<ul class="list-disc pl-6 space-y-1">

  <li>Sharing or soliciting any contact information (phone numbers, email addresses, social media handles, WhatsApp links) for the purpose of conducting any part of a transaction off-platform. This will result in mandatory account suspension pending investigation.</li>

  <li>Harassment, threats, abuse, discriminatory language, hate speech, or offensive conduct of any kind. Confirmed instances will result in immediate permanent termination with no right of appeal through the Platform.</li>

  <li>Spam, unsolicited promotions, or messages unrelated to the transaction.</li>

  <li>Sharing adult, explicit, violent, or otherwise offensive content.</li>

  <li>Impersonation of any person or entity.</li>

  <li>Any attempt to defraud, deceive, manipulate, or pressure the other party.</li>

</ul>

<p>Violations may result in a formal warning, account suspension, or permanent termination depending on the severity and nature of the conduct, at our sole discretion.</p>

<p><strong>4.3 Monitoring and Storage</strong><br />All Chat messages, including any Pickup location shared via Chat, are stored and may be reviewed by ReBooked Solutions for the purposes of dispute resolution, fraud prevention, platform safety, and compliance with South African law, including POPIA. By using Chat, you consent to such monitoring, storage, and potential disclosure. Chat records may be used as evidence in disputes and may be disclosed to law enforcement or relevant authorities where required by law.</p>



<h3 class="text-lg font-bold mb-2">5. PAYMENT, ORDERS, AND CHECKOUT</h3>

<p><strong>5.1 Payment Service Provider</strong><br />Payments on the Platform are processed by a third-party payment service provider. You will be redirected to or through the provider's secure payment flow to complete payment. We do not store your full card or bank details. Order status (pending, successful, or cancelled) depends on confirmation from the provider, and there may be a short delay before the Platform reflects that confirmation.</p>

<p><strong>5.2 Pending and Abandoned Orders</strong><br />An order is created when you proceed to checkout but is not confirmed until payment is successfully processed. If you close, cancel, or abandon the payment process before completing it, the order will remain pending for a maximum of 2 hours, after which it automatically expires and the item becomes available to other Buyers. No funds are held or owed by either party in respect of an expired pending order.</p>

<p><strong>5.3 One Seller Per Checkout</strong><br />Where your cart contains items from more than one Seller, you may be required to check out separately for each Seller. Each such checkout is a separate order and a separate transaction, including for purposes of the Buyer Protection Fee under Section 3.5.</p>

<p><strong>5.4 Paying With Your Wallet</strong><br />You may use your Wallet balance, in whole or in part, to pay for any item on the Platform, in the same way as any other accepted payment method. A Wallet-funded purchase is subject to these Rules in the same way as any other transaction. If a Wallet-funded purchase is later cancelled or refunded, the funds are returned to your Wallet rather than issued as a separate cash refund, unless you request a withdrawal under Section 11.1.</p>



<h3 class="text-lg font-bold mb-2">6. THE TRANSACTION CYCLE</h3>

<p>These timelines are mandatory and strictly enforced. Time begins running from the trigger event regardless of weekends or public holidays unless otherwise stated. The cycle differs slightly depending on whether the order is fulfilled by Courier or Pickup.</p>

<p><strong>6.1 48 Hours to Commit (Courier and Pickup)</strong><br />Once a Buyer completes payment, the Seller has 48 hours to "Commit to Sale." Failure to commit within this window results in automatic cancellation of the order and a full refund of the item price and the Buyer Protection Fee to the Buyer. Repeated failures to commit may result in account suspension.</p>

<p><strong>6.1A Buyer Cancellation Before Commitment</strong><br />At any point before the Seller commits, the Buyer may voluntarily cancel the order through the Platform and receive a full refund of the item price and the Buyer Protection Fee. Once the Seller has committed, the order can no longer be cancelled under this clause.</p>

<p><strong>6.2 60 Hours to Ship (Courier Orders Only)</strong><br />After committing to a Courier sale, the Seller has 60 hours (3 business days) to dispatch the item and upload a valid tracking number to the Platform. Failure to do so may result in automatic cancellation, a full refund of the item price to the Buyer, and may constitute grounds for account suspension.</p>

<p><strong>6.3 48 Hours to Confirm (Courier Orders Only)</strong><br />Once the courier marks a parcel as delivered, the Buyer has 48 hours to either "Confirm Receipt" or lodge a formal dispute through the Platform. If neither action is taken within this window, the order will auto-complete and funds will be released to the Seller's Wallet. Buyers who fail to act within this window waive their right to raise a subsequent dispute regarding receipt or condition.</p>

<p><strong>6.4 7 Days to Meet and Confirm (Pickup Orders Only)</strong><br />For Pickup orders, after the Seller commits, both Buyer and Seller have 7 days to meet, exchange the item, and independently confirm the handover through the Platform ("Dual Confirmation"). Funds are only released to the Seller's Wallet once both confirmations are recorded. If the 7-day window lapses without Dual Confirmation and neither party has raised a dispute, the order is automatically cancelled and the item price refunded to the Buyer, subject to the Buyer Protection Fee rule in Section 3.5.</p>



<h3 class="text-lg font-bold mb-2">7. PICKUP AS A DELIVERY OPTION</h3>

<p><strong>7.1 What Pickup Is</strong><br />Sellers may offer Pickup as a delivery method on a listing, instead of or alongside courier delivery. Where Pickup is selected, no courier shipping fee is charged, but the Buyer Protection Fee under Section 3.5 still applies.</p>

<p><strong>7.2 Arranging a Pickup</strong><br />Once the Seller commits, the Buyer and Seller must arrange the meeting time and location via Chat. Sellers may share a meeting location through Chat for this purpose. The arrangement must take place through Chat; we do not attend, supervise, or have visibility into the in-person meeting itself.</p>

<p><strong>7.3 Safety Guidance</strong><br />We strongly recommend meeting in a safe, public, well-lit location, ideally during daylight hours, bringing a friend or family member where possible, and inspecting the item at the point of handover before confirming on the Platform. ReBooked Solutions plays no role in selecting or vetting meeting locations and accepts no liability for any incident, injury, loss, theft, or dispute arising from an in-person Pickup meeting, except where such liability cannot lawfully be excluded under South African law.</p>

<p><strong>7.4 Limited Protection for Pickup Orders</strong><br />Where both parties have completed Dual Confirmation, the dispute process in Section 10 remains available to resolve disagreements about the item itself (such as condition or authenticity), in the same way as a Courier order. This limited protection covers the transaction record only and does not extend to personal safety, conduct, or any incident occurring at or around the meeting itself.</p>

<p><strong>7.5 Repeated No-Shows</strong><br />Repeated failure by a Seller to attend an agreed Pickup meeting may result in account suspension.</p>



<h3 class="text-lg font-bold mb-2">8. NON-CIRCUMVENTION — NO OFF-PLATFORM TRANSACTIONS</h3>

<p>All communications, payments, and delivery arrangements must take place entirely within the Platform. Attempting to move any part of a transaction off-platform — whether via Chat, direct messaging, or any other means — constitutes a material breach of these Rules and will result in:</p>

<ul class="list-disc pl-6 space-y-1">

  <li>Permanent ban from the Platform for the offending party; and</li>

  <li>A liquidated damages deduction of R250 from the offending party's Wallet or pending payouts, which the parties agree represents a reasonable pre-estimate of the administrative, operational, and reputational loss suffered by ReBooked Solutions as a result of such circumvention.</li>

</ul>

<p>Both the Buyer and the Seller are subject to these consequences where both parties are found to have participated in or agreed to an off-platform arrangement. This Section does not prohibit arranging or attending an in-person Pickup meeting under Section 6, provided the order, payment, and commitment steps were completed through the Platform.</p>



<h3 class="text-lg font-bold mb-2">9. SHIPPING AND PACKAGING</h3>

<p><strong>9.1 Courier and Locker Partners</strong><br />Courier delivery is fulfilled through approved third-party courier and locker partners. We act as a booking and tracking intermediary and do not guarantee courier performance, transit times, or locker availability beyond the booking itself.</p>

<p><strong>9.2 Packaging Standards</strong><br />Sellers are responsible for ensuring items are packaged securely and appropriately for their category:</p>

<ul class="list-disc pl-6 space-y-1">

  <li><strong>Textbooks and stationery materials:</strong> A waterproof inner layer and sturdy outer packaging is required to protect against damage in transit.</li>

  <li><strong>Uniforms and sports wear:</strong> Items must be clean, folded, and sealed in a protective bag or packaging to prevent damage, soiling, or contamination in transit.</li>

</ul>

<p>Any loss or damage arising from insufficient or negligent packaging is the Seller's sole liability. ReBooked Solutions will resolve disputes regarding packaging damage in the Buyer's favour where evidence supports inadequate packing.</p>

<p><strong>9.3 Risk of Loss During Transit</strong><br />Risk of loss or damage remains with the Seller until delivery is confirmed by the Buyer. If an item is lost or destroyed in transit and never delivered, the Seller remains responsible for ensuring the Buyer receives a full refund; the Buyer does not bear the loss of a parcel that never arrived. The Platform will hold or return funds to the Buyer in accordance with Section 10, and the Seller's recourse for their own loss lies in an insurance or courier claim, which we will assist with where possible. We make no guarantee of recovery from the courier. Buyers must report suspected courier loss within 7 days of the estimated delivery date.</p>

<p><strong>9.4 Abandoned Parcels</strong><br />If a Buyer fails to collect a parcel within the courier's permitted collection timeframe:</p>

<ul class="list-disc pl-6 space-y-1 ml-4">

  <li>(a) The Buyer forfeits the shipping fee paid at checkout.</li>

  <li>(b) The Buyer is liable for any return-to-sender costs charged by the courier.</li>

  <li>(c) The sale will be cancelled and any remaining balance refunded only once the Seller confirms the item has been returned to them in its original condition.</li>

</ul>



<h3 class="text-lg font-bold mb-2">10. DISPUTES AND EVIDENCE</h3>

<p><strong>10.1 Video Evidence (Strongly Recommended)</strong><br />We strongly recommend that Sellers film items being packed and sealed before dispatch (Courier orders) or being handed over (Pickup orders), and that Buyers film parcels being opened upon receipt (Courier orders) or items being received (Pickup orders). This applies to all approved item categories and both delivery methods. Video evidence will be given material weight in all dispute determinations and may be decisive. Chat records between the parties will also be reviewed in all disputes.</p>

<p><strong>10.2 Dispute Submission</strong><br />Disputes must be lodged through the Platform within the applicable window — 48 hours of delivery confirmation for Courier orders (Section 5.3), or before the 7-day Pickup window lapses for Pickup orders (Section 5.4). Disputes lodged outside the applicable window will not ordinarily be considered. Both parties will be given an opportunity to submit evidence before a determination is made.</p>

<p><strong>10.3 No Change-of-Mind Returns</strong><br />All sales are final once the applicable confirmation window in Section 5 has lapsed, or once the Buyer affirmatively confirms the order, whichever is first. A Buyer may not return an item or request a refund simply because they changed their mind. This does not affect any statutory right a Buyer may have against a Seller under the Consumer Protection Act in respect of defective or misrepresented goods. Concerns about an item's condition or accuracy must be raised as a dispute within the applicable window under Section 10.2; we will review such concerns in good faith but do not guarantee a particular outcome.</p>

<p><strong>10.4 Mandatory Good-Faith Negotiation</strong><br />Before initiating any formal legal proceeding against ReBooked Solutions, users agree to notify us in writing at legal@rebookedsolutions.co.za and attempt resolution through good-faith negotiation for a period of 30 days.</p>

<p><strong>10.5 Platform Determination</strong><br />Our determination regarding held transaction funds is final for the purposes of internal Platform administration. This determination does not constitute a legal finding and does not limit any User's right to approach the Consumer Goods and Services Ombudsman (www.cgso.org.za), the National Consumer Tribunal, or a court of competent jurisdiction in the Republic of South Africa.</p>



<h3 class="text-lg font-bold mb-2">11. WALLET AND FINANCIAL TERMS</h3>

<p><strong>11.1 Wallet Crediting and Payouts</strong><br />Once a transaction completes — by auto-completion (Section 5.3), Dual Confirmation (Section 5.4), or a dispute determination in the Seller's favour (Section 10) — the Seller's proceeds, after commission, are credited to their Wallet immediately. Before withdrawing for the first time, you must add and verify your banking details. We may request supporting documentation to verify your identity or banking details before processing a withdrawal, in accordance with Section 11.3. Subject to verification, we aim to process valid withdrawal requests within 5 business days of the request being made, provided there are no outstanding disputes, flags, or compliance holds on the account. This target does not apply where verification is incomplete or a compliance hold applies, in which case the withdrawal is processed as soon as reasonably possible once resolved.</p>

<p><strong>11.2 Set-Off</strong><br />We may deduct or set off any amount you owe us under these Rules or our Terms and Conditions — including chargeback liabilities, the R250 circumvention fee, or reversed referral commission — against your Wallet balance before releasing any remaining balance to you. You remain liable for any shortfall.</p>

<p><strong>11.3 Financial Compliance</strong><br />We reserve the right to temporarily withhold payouts pending identity verification if a transaction is flagged under our anti-money laundering or fraud prevention protocols in accordance with the Financial Intelligence Centre Act. Affected users will be notified promptly.</p>

<p><strong>11.4 Wallet Dormancy</strong><br />Wallet balances that are inactive for 12 consecutive months will be subject to a monthly administrative fee of R25 (or the remaining balance, whichever is lower), charged from the 13th month of inactivity. Users will be notified at least 30 days before any dormancy fee is applied, by email to their registered address. Once a wallet balance reaches R0.00 as a result of dormancy fees, no further fees will be charged. Users may request a wallet withdrawal or account closure at any time by contacting info@rebookedsolutions.co.za.</p>



<h3 class="text-lg font-bold mb-2">12. REFERRAL AND AFFILIATE PROGRAM</h3>

<p><strong>12.1 How Tracking Works</strong><br />Where the Platform offers a referral or affiliate program ("Refer & Earn"), a referral is tracked when a new user signs up using your unique referral link or code at the point of registration. We cannot retroactively attribute an existing account to a referral after registration.</p>

<p><strong>12.2 Commission Trigger</strong><br />No commission is earned merely because someone signs up using your link or code. Commission is only earned once the referred user completes their first successful sale on the Platform. A referred user who registers but never sells generates no commission for the referrer.</p>

<p><strong>12.3 Six-Month Window</strong><br />The earning window for a referred user runs for six months from the date that user registered using your referral link or code, regardless of when within that window they make their first or any subsequent sale.</p>

<p><strong>12.4 Rate, Payment, and Abuse</strong><br />The applicable commission rate for any given program is specified on the relevant Platform page or partner dashboard at the time the program is offered. Earned commission is credited to your Wallet under Section 11.1. Referring your own alternate account, or any artificial or coordinated activity intended to generate commission without a genuine independent sale, is a material breach and we may withhold or reverse commission and suspend or terminate the account involved.</p>



<h3 class="text-lg font-bold mb-2">13. BREACH PENALTIES</h3>

<p>The following consequences apply for confirmed breaches. Deduction amounts constitute pre-agreed liquidated damages for breach, not arbitrary fines, and represent a genuine pre-estimate of loss suffered by ReBooked Solutions and/or the affected party.</p>

<div class="overflow-x-auto my-4">

  <table class="w-full text-xs sm:text-sm border border-border">

    <thead>

      <tr class="bg-muted/50">

        <th class="border-r border-border px-3 py-2 text-left">Violation</th>

        <th class="border-r border-border px-3 py-2 text-left">Buyer Outcome</th>

        <th class="px-3 py-2 text-left">Seller Consequence</th>

      </tr>

    </thead>

    <tbody class="divide-y divide-border">

      <tr>

        <td class="border-r border-border px-3 py-2">1st Misrepresentation</td>

        <td class="border-r border-border px-3 py-2">Full Refund</td>

        <td class="px-3 py-2">No payout + delivery fee deducted</td>

      </tr>

      <tr>

        <td class="border-r border-border px-3 py-2">2nd Misrepresentation</td>

        <td class="border-r border-border px-3 py-2">Full Refund</td>

        <td class="px-3 py-2">No payout + delivery fee + R100 deduction</td>

      </tr>

      <tr>

        <td class="border-r border-border px-3 py-2">3rd Misrepresentation</td>

        <td class="border-r border-border px-3 py-2">Full Refund</td>

        <td class="px-3 py-2">No payout + delivery fee + R250 deduction + suspension</td>

      </tr>

      <tr>

        <td class="border-r border-border px-3 py-2">Fraud / Counterfeit</td>

        <td class="border-r border-border px-3 py-2">Full Refund</td>

        <td class="px-3 py-2">R250 deduction + permanent ban</td>

      </tr>

      <tr>

        <td class="border-r border-border px-3 py-2">Off-Platform Transaction</td>

        <td class="border-r border-border px-3 py-2">Subject to investigation</td>

        <td class="px-3 py-2">R250 damages + permanent ban</td>

      </tr>

      <tr>

        <td class="border-r border-border px-3 py-2">Chat Abuse / Harassment</td>

        <td class="border-r border-border px-3 py-2">N/A</td>

        <td class="px-3 py-2">Warning → suspension → permanent ban</td>

      </tr>

      <tr>

        <td class="border-r border-border px-3 py-2">Off-Platform Contact via Chat</td>

        <td class="border-r border-border px-3 py-2">N/A</td>

        <td class="px-3 py-2">R250 damages + permanent ban</td>

      </tr>

      <tr>

        <td class="border-r border-border px-3 py-2">Unjustified Chargeback</td>

        <td class="border-r border-border px-3 py-2">Full transaction amount + R250 admin fee</td>

        <td class="px-3 py-2">N/A</td>

      </tr>

    </tbody>

  </table>

</div>

<p class="text-xs text-muted-foreground">ReBooked Solutions reserves the right to escalate consequences for repeat offenders or where the severity of the conduct warrants a stronger response.</p>



<h3 class="text-lg font-bold mb-2">14. PROHIBITED ITEMS</h3>

<p>The following items are not permitted on the Platform under any circumstances:</p>

<ul class="list-disc pl-6 space-y-1">

  <li>Counterfeit, photocopied, or illegally reproduced books or materials</li>

  <li>Purely digital products (e-books, PDFs, or standalone download codes not bundled with a physical item)</li>

  <li>Items that infringe third-party intellectual property, trademark, or copyright rights</li>

  <li>Items in condition too poor to be reasonably used for their intended educational purpose</li>

  <li>Clothing, uniforms, or items with offensive, discriminatory, or inappropriate branding or imagery</li>

  <li>Any item outside the approved educational goods categories set out in Section 2</li>

</ul>

<p>Listing a prohibited item will result in immediate removal. Repeated violations, or listing counterfeit or infringing goods, will result in permanent account termination.</p>



<h3 class="text-lg font-bold mb-2">15. GENERAL</h3>

<p><strong>15.1 Amendments</strong><br />We may update these Rules at any time. We will provide notice of material changes by email to your registered address and/or via a prominent notice on the Platform at least 14 days before changes take effect. Continued use of the Platform after that notice period constitutes acceptance of the updated Rules.</p>

<p><strong>15.2 Governing Law</strong><br />These Rules are governed by the laws of the Republic of South Africa. You consent to the jurisdiction of the courts of the Republic of South Africa in respect of any dispute arising from these Rules.</p>

<p><strong>15.3 Severability</strong><br />If any provision of these Rules is found to be invalid, unlawful, or unenforceable, that provision shall be modified to the minimum extent necessary to make it enforceable. All remaining provisions continue in full force and effect.</p>

<p><strong>15.4 Relationship with Terms and Conditions</strong><br />These Rules form part of the overall agreement between you and ReBooked Solutions and must be read together with our Terms and Conditions and Privacy Policy. In the event of any conflict, the Terms and Conditions take precedence.</p>

<p class="text-sm text-muted-foreground italic pt-4">For questions, contact info@rebookedsolutions.co.za | rebookedsolutions.co.za</p>

`;



const termsHtml = `

<h3 class="text-lg font-bold mb-2">1. DEFINITIONS AND INTERPRETATION</h3>

<p><strong>0.1 Definitions</strong><br />In these Terms, the following words have the meanings set out below, unless the context clearly requires otherwise:</p>

<ul class="list-disc pl-6 space-y-1">

  <li><strong>Buyer</strong> means a User who purchases, or attempts to purchase, an item listed on the Platform.</li>

  <li><strong>Seller</strong> means a User who lists, or attempts to sell, an item on the Platform.</li>

  <li><strong>User</strong> means any person who creates an account on, or otherwise accesses or uses, the Platform, and includes both Buyers and Sellers, who may be the same person in different transactions.</li>

  <li><strong>You / your</strong> refers to the User reading these Terms, and takes on the meaning of Buyer or Seller depending on the role that User occupies in the transaction being described.</li>

  <li><strong>Wallet</strong> has the meaning given in clause 7.3.</li>

  <li><strong>Platform</strong> has the meaning given in clause 1.2.</li>

  <li><strong>Chat</strong> has the meaning given in clause 1.5.</li>

  <li><strong>Payment Provider</strong> has the meaning given in clause 7.0.</li>

  <li><strong>Pickup</strong> has the meaning given in clause 6A.1.</li>

  <li><strong>Terms</strong> means these Terms and Conditions, as amended from time to time in accordance with clause 18.4.</li>

</ul>

<p><strong>0.2 Interpretation</strong></p>

<ul class="list-disc pl-6 space-y-1">

  <li>(a) Headings are inserted for convenience only and do not affect the interpretation of these Terms.</li>

  <li>(b) The words "include," "includes," and "including" are not words of limitation.</li>

  <li>(c) A reference to a clause is a reference to a clause of these Terms unless stated otherwise.</li>

  <li>(d) These Terms are issued in English. Where these Terms are translated into any other language for convenience, the English version prevails in the event of any conflict or ambiguity.</li>

  <li>(e) A reference to any statute includes that statute as amended, re-enacted, or replaced from time to time.</li>

</ul>



<h3 class="text-lg font-bold mb-2">1. ABOUT US AND THE PLATFORM</h3>

<p><strong>1.1 Who We Are</strong><br />ReBooked Solutions (Pty) Ltd ("ReBooked Solutions", "we", "us", or "our") is a private company incorporated in the Republic of South Africa, Registration Number 2025/452062/07.</p>

<p><strong>1.2 What the Platform Is</strong><br />We operate a virtual peer-to-peer marketplace (the "Platform") accessible at rebookedsolutions.co.za and/or our mobile application. The Platform enables users to buy and sell approved educational goods, including physical textbooks and readers, school stationery and materials (such as stationery packs and EGD boards), school uniforms, and school sports and physical education wear.</p>

<p><strong>1.3 Our Role</strong><br />We are a technology intermediary — not a party to any sale. Every sale contract is a private agreement strictly between the Buyer and the Seller. We do not own, inspect, warrant, or guarantee any item listed on the Platform. We provide the infrastructure. The transaction is yours.</p>

<p><strong>1.4 Limited Payment Agency</strong><br />By selling on the Platform, the Seller appoints ReBooked Solutions as their limited payment agent solely for the purpose of receiving funds from Buyers. Once a Buyer pays through the Platform, their payment obligation to the Seller is legally fulfilled. This limited agency does not make us a party to the underlying sale agreement.</p>

<p><strong>1.5 In-Platform Messaging</strong><br />The Platform includes a built-in messaging feature ("Chat") to facilitate communication between Buyers and Sellers in connection with a transaction. Chat is a transaction tool, not a general social or communication platform. All messages are subject to these Terms, our Marketplace Rules, and our Community Standards.</p>

<p><strong>1.6 Activities Outside the Platform</strong><br />We are not liable for, and accept no responsibility in connection with, any communication, arrangement, payment, meeting, or exchange of goods that takes place outside the Platform, regardless of whether it relates to a listing that originated on the Platform. This includes, without limitation, off-platform contact arranged in breach of clause 5.1, and any in-person meeting arranged for a Pickup order under clause 6A. Our Buyer Protection, dispute resolution process, and fee structure apply solely to transactions completed and confirmed through the Platform. See clause 6A.6 for the limited protections that remain in place for the in-person handover itself.</p>



<h3 class="text-lg font-bold mb-2">2. ELIGIBILITY AND ACCOUNT SECURITY</h3>

<p><strong>2.1 Age Requirement and Parental Consent</strong><br />You must be at least 13 years of age to create an account and use the Platform. If you are under 18 years of age, you confirm that your parent or legal guardian is aware of and consents to your use of the Platform and your entry into any transaction conducted through it. By registering, you represent and warrant that this consent has been obtained. ReBooked Solutions accepts no liability arising from a minor's misrepresentation of age or parental consent. Where a minor misrepresents their age or consent status, liability rests solely with the minor and/or their parent or legal guardian.</p>

<p><strong>2.2 One Account Per Person</strong><br />Each user may maintain only one account. Creating multiple accounts, using fake identities, or deploying automated bots constitutes a material breach of these Terms and will result in permanent account termination without refund of any wallet balance, subject to applicable law.</p>

<p><strong>2.3 Accurate Information</strong><br />You agree to provide truthful, current, and complete information when registering and at all times thereafter. You are responsible for keeping your account information up to date.</p>

<p><strong>2.4 Account Security</strong><br />You are solely responsible for maintaining the confidentiality of your login credentials and for all activity conducted under your account. If you suspect unauthorised access, notify us immediately at info@rebookedsolutions.co.za. We will not be liable for any loss resulting from unauthorised use of your account where you have failed to take reasonable steps to protect your credentials.</p>



<h3 class="text-lg font-bold mb-2">3. APPROVED CATEGORIES AND LISTING STANDARDS</h3>

<p><strong>3.1 Approved Item Categories</strong><br />The Platform currently supports the following categories of educational goods:</p>

<ul class="list-disc pl-6 space-y-1">

  <li>Textbooks and readers (physical, school and university level)</li>

  <li>School stationery and materials (e.g. stationery packs, EGD boards, art supplies, technical drawing sets)</li>

  <li>School uniforms (including blazers, shirts, trousers, skirts, and school-branded items)</li>

  <li>School sports and physical education wear (e.g. rugby kits, netball uniforms, athletics gear)</li>

</ul>

<p>We may expand or restrict approved categories at our discretion with reasonable notice to users.</p>

<p><strong>3.2 Accuracy Is Your Responsibility</strong><br />You bear full legal responsibility for the accuracy of your listing, including the title, description, grade or school association, size, condition, and all other material attributes. Inaccurate listings that mislead Buyers constitute misrepresentation under South African common law and may result in account suspension, liability for costs, and reversal of funds in the Buyer's favour.</p>

<p><strong>3.3 Original Photos Required</strong><br />You must upload original photographs of the actual physical item currently in your possession. Stock images, manufacturer images, and AI-generated images are strictly prohibited. Listings found to contain non-original images will be removed without notice.</p>

<p><strong>3.4 Condition Disclosure</strong><br />You must honestly disclose the condition of every item listed:</p>

<ul class="list-disc pl-6 space-y-1">

  <li><strong>Textbooks and readers:</strong> Any highlighting, handwriting, underlining, or other markings must be disclosed. Where more than 10% of pages contain such markings, this must be stated clearly in the listing.</li>

  <li><strong>Uniforms and sports wear:</strong> Any staining, fading, damage, repairs, or alterations must be disclosed.</li>

  <li><strong>Stationery and materials:</strong> Any partial use, missing components, or wear must be disclosed.</li>

</ul>

<p>Failure to disclose significant defects constitutes misrepresentation and will result in the dispute being resolved in the Buyer's favour, unless the Seller can demonstrate the omission was immaterial and did not affect the Buyer's purchasing decision.</p>

<p><strong>3.5 Digital Access Codes</strong><br />Unless your listing explicitly states that a digital access code is unused and valid, all digital components are assumed to be used or expired. You may not represent a used or expired code as valid.</p>

<p><strong>3.6 School-Specific Items</strong><br />When listing school uniforms or sports wear associated with a specific school, you must accurately state the school name. Misrepresenting school affiliation or branding is a material breach of these Terms.</p>

<p><strong>3.7 Incorrect Listings</strong><br />If a Seller publishes a listing with materially incorrect information, any resulting dispute will ordinarily be resolved in the Buyer's favour, and the Seller will be liable for all associated shipping and return costs.</p>



<h3 class="text-lg font-bold mb-2">4. IN-PLATFORM CHAT</h3>

<p><strong>4.1 Purpose of Chat</strong><br />The Chat feature is provided solely to facilitate legitimate transaction-related communication between Buyers and Sellers. Permitted uses include: asking questions about a listing, arranging delivery or Pickup logistics within the Platform, sharing a Pickup meeting location as set out in clause 6A, and resolving order queries.</p>

<p><strong>4.2 Prohibited Conduct in Chat</strong><br />The following conduct in Chat is strictly prohibited:</p>

<ul class="list-disc pl-6 space-y-1">

  <li>Soliciting or sharing any contact information (phone numbers, email addresses, social media handles, WhatsApp links) for the purpose of taking a transaction off-platform. This will result in mandatory account suspension pending review.</li>

  <li>Harassment, threats, hate speech, discriminatory language, or abusive conduct of any kind. Confirmed instances will result in immediate permanent termination with no right of appeal through the Platform.</li>

  <li>Sending unsolicited commercial messages, spam, or promotional content.</li>

  <li>Sharing adult, explicit, or offensive content.</li>

  <li>Impersonating any person or entity.</li>

  <li>Any attempt to deceive, defraud, or manipulate the other party.</li>

</ul>

<p>Violation of these prohibitions may result in immediate account suspension or permanent ban, at our sole discretion, depending on the severity and nature of the conduct.</p>

<p><strong>4.3 Chat Monitoring and Storage</strong><br />All Chat messages are stored and may be reviewed by ReBooked Solutions for the purposes of dispute resolution, fraud prevention, platform safety, and compliance with South African law, including the Protection of Personal Information Act 4 of 2013 ("POPIA"). By using Chat, you consent to such monitoring and storage. Chat content may be disclosed to law enforcement or relevant authorities where required by law.</p>

<p><strong>4.4 No Expectation of Privacy for Prohibited Conduct</strong><br />While we respect user privacy in accordance with POPIA, you have no reasonable expectation of privacy in Chat messages that violate these Terms. Such messages may be actioned, recorded, and disclosed without prior notice to you.</p>

<p><strong>4.5 Chat Is Not Customer Support</strong><br />Chat connects Buyers and Sellers only. For support from ReBooked Solutions, contact info@rebookedsolutions.co.za.</p>



<h3 class="text-lg font-bold mb-2">5. THE TRANSACTION CYCLE</h3>

<p><strong>5.0 Order Creation and Payment Confirmation</strong><br />An order is created on the Platform when a Buyer proceeds to checkout, but is not confirmed until payment has been successfully processed and confirmed by our payment service provider. Until payment is confirmed, the order will show as "pending" and the listed item remains reserved but not yet sold. If a Buyer closes, cancels, or abandons the payment process before completing it, the order will remain pending for a maximum of 2 hours, after which it will automatically expire, the reservation on the listing will be released, and the item will become available for purchase by other Buyers. No funds are held, transferred, or owed by either party in respect of an expired pending order. Where our payment service provider confirms a payment after this window has expired, the payment will be refunded via the original payment method, subject to standard provider processing times, and the Buyer will need to place a new order if the item is still available.</p>

<p><strong>5.0A Checkout Is Limited to One Seller at a Time</strong><br />Where a Buyer's cart contains items from more than one Seller, the Platform may require separate checkout sessions for each Seller in order to coordinate delivery, Pickup arrangements, and order tracking correctly. Each such checkout constitutes a separate order and a separate transaction for the purposes of these Terms, including the Buyer Protection Fee under clause 7.1.</p>

<p><strong>5.1 Non-Circumvention</strong><br />All communications, payments, and delivery arrangements must take place within the Platform. Attempting to conduct any part of a transaction off-platform — including agreeing to a price, payment, or handover outside the Platform's payment and order system — is a material breach of these Terms. This clause does not prohibit the use of Pickup as a delivery method under clause 6A, provided the order, payment, and commitment steps are completed through the Platform as required. Users found to have attempted or completed an off-platform transaction will be subject to immediate permanent account termination and a fee of R250, which the parties agree represents a reasonable pre-estimate of the administrative, reputational, and operational costs incurred by ReBooked Solutions as a result of such circumvention.</p>

<p><strong>5.2 Commitment Window (48 Hours)</strong><br />Once a Buyer completes payment, the Seller has 48 hours to "Commit to Sale." This applies to both Courier and Pickup orders. Failure to commit within this window will result in automatic cancellation of the order and a full refund of the item price to the Buyer, subject to clause 7.5 (Buyer Protection Fee). Repeated failures to commit may result in account suspension.</p>

<p><strong>5.2A Buyer Cancellation Before Commitment</strong><br />At any point before the Seller commits to the sale under clause 5.2, the Buyer may voluntarily cancel the order through the Platform. Where the Buyer cancels under this clause, the full item price and the Buyer Protection Fee will be refunded in accordance with clause 7.0. Once the Seller has committed to the sale, the order may no longer be cancelled by the Buyer under this clause, and any subsequent cancellation is dealt with under clause 5.3, clause 6A.7, or the dispute process in clause 9, as applicable.</p>

<p><strong>5.3 Shipping Window (60 Hours) — Courier Orders</strong><br />For orders fulfilled by courier, after committing to a sale, the Seller has 60 hours (3 business days) to dispatch the item and upload a valid tracking number to the Platform. Failure to do so may result in automatic cancellation, a full refund of the item price to the Buyer, and may constitute grounds for account suspension.</p>

<p><strong>5.4 Receipt Confirmation (48 Hours) — Courier Orders</strong><br />Once a parcel is marked as delivered by the courier, the Buyer has 48 hours to either "Confirm Receipt" or lodge a formal dispute through the Platform. If neither action is taken within this window, the Platform will automatically complete the order and release funds to the Seller's wallet. Buyers who fail to act within this window waive their right to raise a subsequent dispute regarding receipt.</p>

<p><strong>5.5 Pickup Confirmation Window (7 Days)</strong><br />For orders fulfilled by Pickup, after the Seller commits to the sale, both Buyer and Seller have 7 days from the date of commitment to meet, complete the handover, and confirm the exchange through the Platform as set out in clause 6A.4. If the 7-day window lapses without both parties confirming, the order will be treated in accordance with clause 6A.7.</p>



<h3 class="text-lg font-bold mb-2">6. SHIPPING AND PACKAGING (COURIER ORDERS)</h3>

<p><strong>6.0 Courier and Locker Partners</strong><br />Courier delivery is fulfilled through approved third-party courier and locker partners integrated with the Platform. We do not own or operate any courier or locker network and act solely as a booking and tracking intermediary between Users and our courier partners. While we facilitate booking, tracking, and claims on your behalf where possible, we do not guarantee courier performance, transit times, or locker availability beyond the booking itself. Shipping address details provided at checkout are transmitted to our courier partners solely for delivery purposes and are encrypted in transit in accordance with our Privacy Policy.</p>

<p><strong>6.1 Risk of Loss</strong><br />Risk of loss or damage remains with the Seller until the item is successfully delivered to and confirmed by the Buyer. If an item booked for courier delivery through the Platform is lost or destroyed in transit and is not delivered to the Buyer, the Seller remains responsible for ensuring the Buyer receives a full refund of the item price; the Buyer will not bear the financial loss of a parcel that never arrived. Where this occurs, the Platform will hold or return the relevant funds to the Buyer in accordance with the dispute process in clause 9, and the Seller's recourse for their own loss lies in pursuing an insurance or compensation claim against the courier, which the Platform will assist with where possible. ReBooked Solutions makes no guarantee of recovery from the courier and is not itself liable for the lost parcel; our role is limited to facilitating the claims process and ensuring the Buyer is made whole in accordance with this clause. Buyers seeking assistance in respect of a lost courier parcel must contact us at info@rebookedsolutions.co.za within 7 days of the estimated delivery date.</p>

<p><strong>6.2 Packaging Standards</strong><br />Sellers must package items securely and appropriately:</p>

<ul class="list-disc pl-6 space-y-1">

  <li>Textbooks and stationery: A waterproof inner layer and adequate outer protection is required.</li>

  <li>Uniforms and sports wear: Items must be clean, folded, and sealed in a protective bag or packaging to prevent damage or soiling in transit.</li>

</ul>

<p>Any damage arising from insufficient or negligent packaging is the Seller's sole liability.</p>

<p><strong>6.3 Abandoned Parcels</strong><br />If a Buyer fails to collect a parcel within the courier's permitted collection timeframe:<br />(a) The Buyer forfeits the original shipping fee paid at checkout.<br />(b) The Buyer is liable for any return-to-sender costs charged by the courier.<br />(c) The sale will be cancelled and any remaining balance refunded only once the Seller confirms the item has been returned to them in its original condition.</p>



<h3 class="text-lg font-bold mb-2">6A. PICKUP AS A DELIVERY OPTION</h3>

<p><strong>6A.1 What Pickup Is</strong><br />Sellers may offer "Pickup" as a delivery method on a listing, in addition to or instead of courier delivery. Where Pickup is selected by a Buyer at checkout, no courier shipping fee is charged. The Buyer Platform Fee referred to in clause 7.1 still applies to Pickup orders.</p>

<p><strong>6A.2 How Pickup Works</strong><br />Pickup orders follow the same payment and commitment process as courier orders (clauses 5.1 and 5.2). Once the Seller commits to the sale, the Buyer and Seller arrange, via Chat, a mutually convenient time and place to meet and exchange the item. Sellers may share a meeting location through Chat as described in clause 4.5.</p>

<p><strong>6A.3 No In-Person Meeting Outside the Platform's Knowledge</strong><br />The arrangement of the meeting time and location must take place via Chat. We do not attend, supervise, or have any visibility into the in-person meeting itself once arranged.</p>

<p><strong>6A.4 Confirming a Pickup</strong><br />Both the Buyer and the Seller must independently confirm completion of the handover through the Platform ("Dual Confirmation") within the 7-day window set out in clause 5.5. Funds are only released to the Seller's wallet once both confirmations are recorded, in accordance with clause 7.3.</p>

<p><strong>6A.5 Safety Guidance</strong><br />We strongly recommend that Pickup meetings take place in a safe, public, well-lit location, ideally during daylight hours, and that users bring a friend or family member where possible. We recommend inspecting the item at the point of handover, before confirming on the Platform. ReBooked Solutions plays no role in selecting, vetting, or approving meeting locations and accepts no liability for any incident, injury, loss, theft, or dispute arising from an in-person Pickup meeting, except where such liability cannot lawfully be excluded under South African law.</p>

<p><strong>6A.6 Limited Platform Protection for Pickup</strong><br />Notwithstanding clause 1.6 and clause 6A.5, where both parties have confirmed the handover through the Platform in accordance with clause 6A.4, the Platform's standard dispute process under clause 9 remains available to resolve disagreements about the item itself (such as condition or authenticity), to the same extent as it would for a courier order. This limited protection covers the transaction record only, and does not extend to personal safety, conduct, or any incident occurring at or around the meeting itself.</p>

<p><strong>6A.7 Unresolved Pickup Orders</strong><br />If the 7-day window in clause 5.5 lapses without Dual Confirmation:<br />(a) Where neither party has raised a dispute, the order will be automatically cancelled and the item price refunded to the Buyer, subject to clause 7.5 (Buyer Protection Fee).<br />(b) Where one party alleges the handover took place and the other disputes this, either party may lodge a formal dispute through the Platform before the window lapses, which will be assessed in accordance with clause 9.<br />(c) Repeated failure by a Seller to attend an agreed Pickup meeting may result in account suspension.</p>



<h3 class="text-lg font-bold mb-2">7. FEES, WALLETS, AND FINANCIAL TERMS</h3>

<p><strong>7.0 Payment Service Provider</strong><br />Payments on the Platform are processed by a third-party payment service provider ("Payment Provider"). When you check out, you will be redirected to or through the Payment Provider's secure payment flow to complete your payment. We do not store your full card or bank details; these are handled directly by the Payment Provider in accordance with its own security and compliance standards. Order status (pending, successful, or cancelled) is determined by confirmation received from the Payment Provider, and there may be a short delay between completing payment and the Platform reflecting that confirmation. Refunds due under these Terms are processed back through the Payment Provider to the original payment method, or credited to your Wallet under clause 7.4, and may be subject to the Payment Provider's own processing timelines, which are beyond our control.</p>

<p><strong>7.1 Platform Fees</strong><br />Seller Commission: 10% deducted from the final sale price upon completion of a transaction.<br />Buyer Protection Fee: A flat, non-refundable fee of R20 is added to the Buyer's checkout total on each transaction, regardless of whether the order is fulfilled by Courier or Pickup. See clause 7.5 for when this fee is and is not retained.</p>

<p><strong>7.2 Taxes</strong><br />All fees are inclusive of VAT where applicable. Sellers are solely responsible for their own income tax obligations arising from sales conducted through the Platform. ReBooked Solutions does not provide tax advice.</p>

<p><strong>7.3 Wallet Crediting and Withdrawal</strong><br />Upon successful completion of a transaction — being automatic completion under clause 5.4, Dual Confirmation under clause 6A.4, or a determination in the Seller's favour under clause 9 — the Seller's portion of the sale proceeds (after deduction of the Seller Commission under clause 7.1) is credited to the Seller's Platform wallet ("Wallet") immediately. Before withdrawing Wallet funds to a bank account for the first time, Users must add and verify their banking details on the Platform. We reserve the right to request supporting documentation to verify a User's identity or banking details before processing a withdrawal, in accordance with clause 10.3 (FICA / AML). Subject to such verification, we aim to process valid withdrawal requests within 5 business days of the request being made, or used to pay for purchases on the Platform as set out in clause 7.4. This 5 business day target does not apply where verification is incomplete, banking details cannot be confirmed, or a compliance hold applies under clause 10.3, in which case the withdrawal will be processed as soon as reasonably possible once the relevant issue is resolved.</p>

<p><strong>7.3A Set-Off</strong><br />We reserve the right to deduct or set off any amount you owe to ReBooked Solutions under these Terms — including chargeback liabilities under clause 7.7, the circumvention fee under clause 5.1, or commission reversed under clause 7A.5 — against your Wallet balance, before releasing any remaining balance to you. Where your Wallet balance is insufficient to cover the amount owed, you remain liable for the shortfall.</p>

<p><strong>7.4 Paying With Your Wallet</strong><br />Users may apply their Wallet balance, in whole or in part, toward the purchase of any item on the Platform, in the same way as any other accepted payment method. Where a Wallet balance is used for a purchase, that transaction is subject to these Terms in the same way as any other transaction, including the Buyer Protection Fee under clause 7.1 and the dispute process under clause 9. Funds applied from a Wallet balance toward a purchase that is later cancelled or refunded under these Terms will be returned to the Buyer's Wallet, not as a separate cash refund, unless the Buyer requests a withdrawal in accordance with clause 7.3.</p>

<p><strong>7.5 Buyer Protection Fee — Non-Refundable Once Committed</strong><br />The R20 Buyer Protection Fee referred to in clause 7.1 is charged to cover the cost of operating the Platform's payment processing, fraud monitoring, and dispute resolution system on every order, and is non-refundable once the Seller has committed to the sale under clause 5.2, regardless of the outcome of the transaction thereafter — including where the order is later cancelled, refunded, or resolved in the Buyer's favour following a dispute under clause 9. Where a Seller fails to commit to a sale within the window set out in clause 5.2, and the order is cancelled as a result, the Buyer Protection Fee will be refunded in full along with the item price, as no protection service was rendered.</p>

<p><strong>7.6 Wallet Dormancy</strong><br />Wallet balances that are inactive for 12 consecutive months will be subject to a monthly administrative fee of R25 (or the remaining balance, whichever is lower), charged from the 13th month of inactivity onward. Users will be notified at least 30 days before any dormancy fee is applied, by email to their registered address. Once a wallet balance reaches R0.00 as a result of dormancy fees, no further fees will be charged. Users may request a wallet balance withdrawal or account closure at any time by contacting info@rebookedsolutions.co.za. We will process valid withdrawal requests within 5 business days, provided the account has no outstanding disputes or flags.</p>

<p><strong>7.6A Dormant Accounts</strong><br />Independently of Wallet dormancy under clause 7.6, we reserve the right to deactivate an account that has had no login activity for 24 consecutive months. Before deactivation, we will notify you by email to your registered address, giving you at least 30 days to log in or respond if you wish to keep the account active. A deactivated account's personal information will be handled in accordance with our Privacy Policy, including any applicable data retention or deletion periods under POPIA. Any positive Wallet balance on a deactivated account is not forfeited and remains subject to clause 7.6 and clause 15A.4.</p>

<p><strong>7.7 Chargebacks</strong><br />A Buyer who initiates a bank chargeback in respect of a completed and fulfilled transaction will be liable for the full transaction amount plus a R250 administrative charge. We reserve the right to suspend the accounts of users who initiate unjustified chargebacks.</p>



<h3 class="text-lg font-bold mb-2">7A. REFERRAL AND AFFILIATE PROGRAM</h3>

<p><strong>7A.1 How Referral Tracking Works</strong><br />Where the Platform offers a referral or affiliate program ("Refer & Earn"), a referral is tracked when a new user signs up using your unique referral link or code. The referral link or code must be used at the point of registration; we are unable to retroactively attribute an existing account to a referral after registration has been completed.</p>

<p><strong>7A.2 Commission Trigger — First Completed Sale</strong><br />No commission is earned, owed, or payable merely because someone signs up using your referral link or code. Commission is only earned once the referred user completes their first successful sale on the Platform, as defined by completion under clause 5.4 (Courier) or clause 6A.4 (Pickup). A referred user who registers but never sells an item generates no commission for the referrer.</p>

<p><strong>7A.3 Six-Month Earning Window</strong><br />The commission earning window for a referred user runs for six (6) months from the date that user's account was registered using your referral link or code (the "Tracked Signup Date"), regardless of when within that window the referred user makes their first or any subsequent sale. Sales made by the referred user after the six-month window has lapsed do not generate commission for the referrer.</p>

<p><strong>7A.4 Commission Rate and Payment</strong><br />The applicable commission rate and structure for any given referral or affiliate program will be specified on the relevant Platform page or partner dashboard at the time the program is offered, and forms part of these Terms by reference. Earned commission is credited to the referrer's Wallet in accordance with clause 7.3, and is subject to the same withdrawal, verification, and dormancy provisions as any other Wallet balance.</p>

<p><strong>7A.5 Self-Referral and Abuse</strong><br />Referring your own alternate account, or engaging in any artificial, fraudulent, or coordinated activity intended to generate referral commission without a genuine independent sale, is a material breach of these Terms. We reserve the right to withhold or reverse commission, and to suspend or terminate any account, found to be in breach of this clause.</p>

<p><strong>7A.6 Program Changes</strong><br />We may modify, suspend, or discontinue any referral or affiliate program, or amend its commission rate or structure, at any time. Where such a change affects commission already earned and tracked under clause 7A.2 prior to the change taking effect, that previously earned commission will not be reduced retroactively. Changes to the program otherwise take effect in accordance with clause 18.4.</p>



<h3 class="text-lg font-bold mb-2">7B. STATUTORY RIGHTS</h3>

<p><strong>7B.1 Consumer Protection Act</strong><br />Nothing in these Terms limits any right a Buyer may have against a Seller under the Consumer Protection Act 68 of 2008, including, where applicable, the implied warranty of quality and the right to return defective goods. These are rights a Buyer holds against the Seller as the supplier of the goods; ReBooked Solutions is a technology intermediary and is not the supplier of any item sold on the Platform, as set out in clause 1.3.</p>

<p><strong>7B.2 ECT Act Cooling-Off Period</strong><br />Section 44 of the Electronic Communications and Transactions Act 25 of 2002 provides a cooling-off right in respect of certain electronic transactions concluded with a supplier. Because ReBooked Solutions acts as an intermediary and is not the supplier of items listed on the Platform, this cooling-off right, where it applies, operates between the Buyer and the Seller as supplier, and not against ReBooked Solutions. Nothing in clause 8A.1 (No Change-of-Mind Returns) is intended to exclude any cooling-off right a Buyer may lawfully hold against a Seller under the ECT Act. Users seeking to understand how this right may apply to a particular transaction should seek independent advice, as its application depends on the facts of the transaction.</p>



<h3 class="text-lg font-bold mb-2">8. REVIEWS AND COMMUNITY CONTENT</h3>

<p><strong>8.1 Moderation Rights</strong><br />We reserve the right to remove or edit any content — including reviews, listing descriptions, and Chat messages — that contains profanity, hate speech, private personal information, or constitutes coordinated targeting, harassment, or abuse of any user.</p>

<p><strong>8.2 Honest Feedback</strong><br />Moderation is a platform safety measure, not a tool to suppress legitimate feedback. Users retain the right to share honest, factual, good-faith feedback within our Community Standards.</p>



<h3 class="text-lg font-bold mb-2">8A. RETURN AND REFUND POLICY</h3>

<p><strong>8A.1 No Change-of-Mind Returns</strong><br />All sales concluded on the Platform are final once the Buyer's 48-hour Receipt Confirmation window under clause 5.4 has lapsed without a dispute being raised, or once the Buyer affirmatively confirms receipt within that window, whichever occurs first. A Buyer may not return an item, or request a refund, on the basis that they have simply changed their mind, no longer want the item, or found a better price elsewhere. This clause does not affect any right a Buyer may have under clause 7B (Statutory Rights) in respect of defective or misrepresented goods.</p>

<p><strong>8A.2 Raising a Concern Within the Window</strong><br />If a Buyer has a concern about an item — including that it was misrepresented, materially different from the listing, or defective — they must raise it through the Platform's dispute process under clause 9 within the applicable window (the 48-hour Receipt Confirmation window under clause 5.4 for Courier orders, or the 7-day window under clause 5.5 for Pickup orders). We will assist in good faith in reviewing and attempting to resolve any concern raised within that window, in accordance with clause 9, but we do not guarantee any particular outcome, including that a return, refund, or replacement will be granted. Outside of that window, no return or refund will be considered, except where required by law.</p>



<h3 class="text-lg font-bold mb-2">9. DISPUTES AND EVIDENCE</h3>

<p><strong>9.1 Video Evidence (Strongly Recommended)</strong><br />We strongly recommend that Sellers film items being packed and sealed before dispatch (Courier orders), or being handed over (Pickup orders), and that Buyers film parcels being opened upon receipt (Courier orders) or items being received (Pickup orders). This applies to all approved item categories and to both delivery methods. Video evidence significantly strengthens any dispute submission and may be determinative in our review.</p>

<p><strong>9.2 Resolution Process</strong><br />ReBooked Solutions will review all available evidence submitted by both parties. Video evidence, Chat records (including any Pickup location and confirmation records), tracking information, and transaction history will be given material weight in our determination. We may request additional evidence from either party.</p>

<p><strong>9.3 Platform Determination</strong><br />Our determination regarding held funds is final for the purposes of internal Platform administration. This determination does not constitute a legal or binding finding and does not limit any User's right to pursue the matter through the Consumer Goods and Services Ombudsman, the National Consumer Tribunal, or a court of competent jurisdiction in the Republic of South Africa.</p>



<h3 class="text-lg font-bold mb-2">10. DATA PROTECTION AND COMPLIANCE</h3>

<p><strong>10.1 POPIA</strong><br />Your personal information is processed in accordance with the Protection of Personal Information Act 4 of 2013. ReBooked Solutions is the Responsible Party. For full details of how we collect, use, store, and protect your information, and for information on your rights (including the right to access, correct, or request deletion of your data), please refer to our Privacy Policy available at rebookedsolutions.co.za.</p>

<p><strong>10.2 Activity and Chat Monitoring</strong><br />For security, fraud prevention, and platform integrity purposes, we monitor and log user activity including IP addresses, device information, behavioural patterns, Chat messages, and Pickup location data shared via Chat, in accordance with POPIA.</p>

<p><strong>10.3 Financial Compliance (FICA / AML)</strong><br />We reserve the right to temporarily withhold payouts pending identity verification if a transaction is flagged under our anti-money laundering or fraud prevention protocols. We will notify affected users and resolve such holds as promptly as possible.</p>



<h3 class="text-lg font-bold mb-2">11. LIMITATION OF LIABILITY</h3>

<p>The Platform is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding uninterrupted access, error-free operation, or the fitness of the Platform for any particular purpose.</p>

<p>To the fullest extent permitted by applicable South African law, ReBooked Solutions shall not be liable for any indirect, incidental, consequential, special, or punitive loss or damage — including loss of profits, loss of data, loss of goodwill, or any other economic loss — arising from your use of or inability to use the Platform, any transaction conducted on the Platform, any in-person Pickup meeting arranged via the Platform, or any content transmitted via Chat.</p>

<p><strong>11.1 Liability Cap</strong><br />Our total aggregate liability to you for any claim arising out of or in connection with these Terms or your use of the Platform shall not exceed the greater of R1,000 or the total fees paid by you to ReBooked Solutions in the 12 months immediately preceding the date the claim arose.</p>

<p><strong>11.2 Savings Clause</strong><br />Nothing in these Terms limits or excludes our liability for:<br />(a) Death or personal injury caused by our negligence;<br />(b) Fraud or wilful misconduct on our part; or<br />(c) Any liability that cannot be lawfully excluded or limited under the Consumer Protection Act 68 of 2008 or any other applicable South African law.</p>



<h3 class="text-lg font-bold mb-2">12. FORCE MAJEURE</h3>

<p>ReBooked Solutions is not liable for any failure or delay in performing our obligations under these Terms where such failure or delay results from causes beyond our reasonable control, including load-shedding, power outages, acts of God, natural disasters, civil unrest, internet infrastructure failures, courier disruptions, or actions of any government or regulatory authority.</p>



<h3 class="text-lg font-bold mb-2">13. INTELLECTUAL PROPERTY</h3>

<p><strong>13.1 Our IP</strong><br />ReBooked Solutions owns all software, code, designs, processes, Chat infrastructure, and the proprietary architecture of the Platform. Nothing in these Terms grants you any right, title, or interest in our intellectual property.</p>

<p><strong>13.2 User Feedback</strong><br />Any suggestions, ideas, or feedback you voluntarily provide to us are irrevocably assigned to ReBooked Solutions to the fullest extent permitted by law, without any obligation of compensation to you.</p>

<p><strong>13.3 User Content Licence</strong><br />By uploading content or sending messages via Chat, you grant ReBooked Solutions a non-exclusive, royalty-free, worldwide licence to use, reproduce, store, and display that content for the purposes of operating, improving, and promoting the Platform, and for dispute resolution purposes. You retain ownership of your content, subject to this licence.</p>

<p><strong>13.4 Third-Party Intellectual Property Complaints</strong><br />If you believe that a listing, image, or other content on the Platform infringes your copyright, trade mark, or other intellectual property rights, you may submit a written notice to legal@rebookedsolutions.co.za, identifying: (a) the right you claim is infringed; (b) the specific listing or content concerned, including a link or sufficient detail to locate it; (c) your contact details; and (d) a statement that you believe, in good faith, that the use complained of is not authorised by the rights holder, its agent, or the law. On receipt of a valid notice, we will review the complaint and may remove or disable access to the content concerned pending resolution. We reserve the right to notify the User who posted the content of the complaint and to request a response before making a final determination. Submitting a knowingly false or bad-faith complaint under this clause is itself a breach of these Terms.</p>



<h3 class="text-lg font-bold mb-2">14. USER INDEMNIFICATION</h3>

<p>You agree to indemnify, defend, and hold harmless ReBooked Solutions and its directors, employees, agents, and representatives from and against any claim, loss, liability, damage, or expense (including reasonable legal costs) arising from or in connection with:<br />(a) Your use of the Platform in breach of these Terms;<br />(b) Any content you list, upload, or transmit via Chat;<br />(c) Any misrepresentation in your listings;<br />(d) Any transaction you conduct on or off the Platform in violation of these Terms;<br />(e) Any incident, injury, loss, theft, or dispute arising from an in-person Pickup meeting arranged via the Platform; or<br />(f) Any infringement by you of any third-party right, including intellectual property rights.</p>



<h3 class="text-lg font-bold mb-2">15. ASSIGNMENT</h3>

<p>ReBooked Solutions may assign or transfer its rights and obligations under these Terms to a third party (including in the context of a merger, acquisition, or sale of assets) with at least 30 days' written notice to registered users. Your rights under these Terms are personal to you and may not be assigned or transferred to any other party.</p>



<h3 class="text-lg font-bold mb-2">15A. TERM, TERMINATION, AND SURVIVAL</h3>

<p><strong>15A.1 Term</strong><br />These Terms take effect when you first create an account or otherwise use the Platform, whichever is earlier, and continue until your account is closed or terminated in accordance with this clause.</p>

<p><strong>15A.2 Voluntary Closure by You</strong><br />You may close your account at any time by contacting info@rebookedsolutions.co.za and requesting closure. Before closure is processed, you must withdraw any remaining Wallet balance in accordance with clause 7.3, or confirm in writing that you wish to forfeit it. We may decline or delay closure while any order, dispute, or compliance hold under clause 10.3 remains outstanding on your account, until that matter is resolved.</p>

<p><strong>15A.3 Termination or Suspension by Us</strong><br />We may suspend or terminate your account, with or without prior notice depending on the severity of the conduct concerned, where you have materially breached these Terms, including the conduct described in clauses 2.2, 2A, 4.2, 5.1, 7A.5, and 9. Where the breach is not severe and is capable of being remedied, we will generally give you notice and a reasonable opportunity to remedy it first. Where the breach involves fraud, dishonesty, a safety risk to other Users, or repeated conduct after a prior warning, we may terminate immediately without notice.</p>

<p><strong>15A.4 Effect of Termination on Wallet Balance</strong><br />Termination or closure of your account does not, by itself, cause forfeiture of a positive Wallet balance, except where these Terms expressly provide for forfeiture (including clause 2.2, in the case of multiple or fraudulent accounts) or where the balance is subject to a set-off under clause 7.3A. Where your account is terminated and clause 2.2 does not apply, you may request withdrawal of your remaining Wallet balance within 90 days of termination, subject to the verification requirements in clause 7.3. Balances not claimed within that period will be dealt with in accordance with clause 7.6 (Wallet Dormancy).</p>

<p><strong>15A.5 Survival</strong><br />The following clauses survive any termination or closure of your account, and continue to apply after that point: clause 7.3A (Set-Off), clause 7.5 (Buyer Protection Fee), clause 7.7 (Chargebacks), clause 9 (Disputes and Evidence) in respect of any transaction that occurred before termination, clause 11 (Limitation of Liability), clause 13 (Intellectual Property), clause 14 (User Indemnification), clause 16 (Mandatory Dispute Resolution), and clause 18 (General Provisions), together with any other clause which by its nature is intended to continue to apply.</p>



<h3 class="text-lg font-bold mb-2">16. MANDATORY DISPUTE RESOLUTION</h3>

<p><strong>16.1 Good-Faith Negotiation</strong><br />Before initiating any formal legal proceeding against ReBooked Solutions, you agree to notify us in writing at legal@rebookedsolutions.co.za, setting out the nature of the dispute and the remedy sought. Both parties agree to attempt to resolve the dispute in good faith for a period of 30 days from the date of that notice.</p>

<p><strong>16.2 Consumer Ombudsman</strong><br />We subscribe to the jurisdiction of the Consumer Goods and Services Ombudsman ("CGSO"). If a dispute is not resolved within the 30-day negotiation period, either party may refer the matter to the CGSO at www.cgso.org.za, or to the National Consumer Tribunal, or may approach a court of competent jurisdiction in the Republic of South Africa.</p>

<p><strong>16.3 Governing Law and Jurisdiction</strong><br />These Terms are governed by and construed in accordance with the laws of the Republic of South Africa. You consent to the non-exclusive jurisdiction of the courts of the Republic of South Africa in respect of any dispute arising out of or in connection with these Terms.</p>



<h3 class="text-lg font-bold mb-2">17. STATUTORY DISCLOSURES (ECT ACT SECTION 43)</h3>

<p>In compliance with Section 43 of the Electronic Communications and Transactions Act 25 of 2002:</p>

<p><strong>Full Legal Name:</strong> ReBooked Solutions (Pty) Ltd<br /><strong>Registration Number:</strong> 2025/452062/07<br /><strong>Physical Address:</strong> [INSERT REGISTERED PHYSICAL/OFFICE ADDRESS FOR SERVICE OF LEGAL DOCUMENTS]<br /><strong>Legal Contact:</strong> legal@rebookedsolutions.co.za<br /><strong>General Support:</strong> info@rebookedsolutions.co.za<br /><strong>Platform Address:</strong> rebookedsolutions.co.za</p>



<h3 class="text-lg font-bold mb-2">18. GENERAL PROVISIONS</h3>

<p><strong>18.1 Governing Law</strong><br />These Terms are governed by the laws of the Republic of South Africa.</p>

<p><strong>18.2 Severability</strong><br />If any provision of these Terms is found by a court or competent authority to be invalid, unlawful, or unenforceable, that provision shall be deemed modified to the minimum extent necessary to make it enforceable. All remaining provisions shall continue in full force and effect.</p>

<p><strong>18.3 Entire Agreement</strong><br />These Terms, together with our Marketplace Rules and Privacy Policy, constitute the entire agreement between you and ReBooked Solutions with respect to your use of the Platform, and supersede all prior agreements, representations, and understandings.</p>

<p><strong>18.4 Amendments</strong><br />We reserve the right to amend these Terms at any time. We will provide notice of material amendments by email to your registered address and/or via a prominent notice on the Platform at least 14 days before changes take effect. Continued use of the Platform after that notice period constitutes your acceptance of the amended Terms. If you do not agree to the amended Terms, you must stop using the Platform and may request closure of your account.</p>

<p><strong>18.5 Waiver</strong><br />Failure by ReBooked Solutions to enforce any provision of these Terms on any occasion does not constitute a waiver of that provision or our right to enforce it in the future.</p>

<p class="text-sm text-muted-foreground italic pt-4">For questions, contact info@rebookedsolutions.co.za.</p>

`;



const Policies = () => {

  const [activeTab, setActiveTab] = useState("marketplace");



  return (

    <Layout>

      <SEO

        title="Policies & Terms | ReBooked Solutions"

        description="Complete policy documentation for ReBooked Solutions - Terms and Conditions, Privacy Policy, and Marketplace Rules & Responsibilities."

        keywords="policies, terms, privacy, POPIA, consumer protection, ReBooked Solutions"

      />



      <div className="container mx-auto px-4 py-6 sm:py-12 max-w-4xl">

        <div className="mb-8 text-center">

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">

            Platform Policies

          </h1>

          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">

            Complete policy documentation for ReBooked Solutions (Pty) Ltd · Registration: 2025/452062/07

          </p>

          <div className="text-xs text-muted-foreground space-x-3">

            <span>Last Updated: June 2026</span>

            <span>·</span>

            <span>Registration: 2025/452062/07</span>

            <span>·</span>

            <span>Jurisdiction: Republic of South Africa</span>

            <span>·</span>

            <span>Legal: legal@rebookedsolutions.co.za</span>

          </div>

        </div>



        {/* Tab Navigation */}

        <div className="flex flex-wrap gap-2 mb-8 justify-center">

          <Button

            onClick={() => setActiveTab("marketplace")}

            variant={activeTab === "marketplace" ? "default" : "outline"}

            className="flex items-center gap-2"

          >

            <BookOpen className="h-4 w-4" />

            Marketplace Rules

          </Button>

          <Button

            onClick={() => setActiveTab("privacy")}

            variant={activeTab === "privacy" ? "default" : "outline"}

            className="flex items-center gap-2"

          >

            <Shield className="h-4 w-4" />

            Privacy Policy

          </Button>

          <Button

            onClick={() => setActiveTab("terms")}

            variant={activeTab === "terms" ? "default" : "outline"}

            className="flex items-center gap-2"

          >

            <Scale className="h-4 w-4" />

            Terms & Conditions

          </Button>

        </div>



        {/* Marketplace Rules */}

        {activeTab === "marketplace" && (

          <Card>

            <CardHeader className="bg-muted/50 rounded-t-lg">

              <CardTitle className="text-2xl flex items-center gap-3">

                <BookOpen className="h-6 w-6 text-primary" />

                Marketplace Rules

              </CardTitle>

              <p className="text-sm text-muted-foreground">

                Last Updated: June 2026 · Effective Date: June 2026

              </p>

            </CardHeader>

            <CardContent className="prose max-w-none text-sm sm:text-base text-foreground space-y-6 pt-6">

              <div dangerouslySetInnerHTML={{ __html: marketplaceRulesHtml }} />

            </CardContent>

          </Card>

        )}



        {/* Privacy Policy */}

        {activeTab === "privacy" && (

          <Card>

            <CardHeader className="bg-muted/50 rounded-t-lg">

              <CardTitle className="text-2xl flex items-center gap-3">

                <Shield className="h-6 w-6 text-primary" />

                Privacy Policy

              </CardTitle>

              <p className="text-sm text-muted-foreground">

                Last Updated: June 2026 · Effective Date: June 2026

              </p>

            </CardHeader>

            <CardContent className="prose max-w-none text-sm sm:text-base text-foreground space-y-6 pt-6">

              <section>

                <h3 className="text-lg font-bold mb-2">INTRODUCTION</h3>

                <p>ReBooked Solutions (Pty) Ltd ("ReBooked Solutions", "we", "us", or "our"), Registration Number 2025/452062/07, is the Responsible Party as defined under the Protection of Personal Information Act 4 of 2013 ("POPIA"). We are committed to protecting your personal information and being fully transparent about how we collect, use, store, share, and safeguard it.</p>

                <p>This Privacy Policy applies to all users of the ReBooked Solutions Platform, accessible at rebookedsolutions.co.za and via our mobile application. By using the Platform, you acknowledge that you have read and understood this Policy.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">1. INFORMATION WE COLLECT</h3>

                <p><strong>1.1 Identity and Contact Information</strong><br />We collect your full name, email address, and phone number when you register an account. This information is required to create and manage your account, facilitate transactions, and communicate with you about your use of the Platform. <em>Legal basis: Contractual necessity.</em></p>

                <p><strong>1.2 Identity Verification Documents (FICA)</strong><br />Where a transaction or payout is flagged under our anti-money laundering or fraud prevention procedures, we may request a copy of your South African Identity Document and proof of residential address. This information is used solely for verification and regulatory compliance purposes and is not shared beyond what is legally required. <em>Legal basis: Legal obligation (Financial Intelligence Centre Act).</em></p>

                <p><strong>1.3 Financial Information</strong><br />We collect South African banking details provided by Sellers for the purpose of processing payouts. We do not store full card numbers or CVV details. All payment processing is handled by PCI-DSS compliant third-party gateways. <em>Legal basis: Contractual necessity.</em></p>

                <p><strong>1.4 Listing Data</strong><br />When you create a listing, we collect and store the photographs, descriptions, prices, and other attributes you provide. This data is processed to display your listing to potential buyers on the Platform. For school-specific items, this may include school names and grade levels. <em>Legal basis: Contractual necessity.</em></p>

                <p><strong>1.5 Chat and Messaging Data</strong><br />All messages sent via the in-platform Chat feature are stored by us. This includes the full content of messages, timestamps, and the identities of the sender and recipient. Chat data is used for transaction facilitation, dispute resolution, fraud prevention, platform safety, and legal compliance. You have no reasonable expectation of privacy in Chat messages that violate our Terms and Conditions or Marketplace Rules. <em>Legal basis: Legitimate interest (platform safety, fraud prevention, dispute resolution) and contractual necessity.</em></p>

                <p><strong>1.6 Platform Activity and Technical Data</strong><br />We log user activity including IP addresses, device type and identifiers, browser information, operating system, clickstream patterns, and session duration. This data is used to maintain platform security, detect and prevent fraud, and improve the user experience. <em>Legal basis: Legitimate interest (security and fraud prevention).</em></p>

                <p><strong>1.7 User-Generated Content</strong><br />Photographs, item descriptions, and other content you upload to the Platform are stored and processed in accordance with the licence you grant us under our Terms and Conditions. <em>Legal basis: Contractual necessity and consent.</em></p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">2. HOW WE USE YOUR INFORMATION</h3>

                <p><strong>2.1 Transaction Facilitation</strong><br />We use your information to manage the full transaction lifecycle, including the 48/60/48 cycle, buyer-seller communications via Chat, payment processing, and payout administration.</p>

                <p><strong>2.2 Chat Safety and Moderation</strong><br />We review and analyse Chat messages to detect and act on prohibited conduct, including off-platform solicitation, harassment, fraud, abuse, and violations of our Marketplace Rules. Chat records are used as primary evidence in dispute resolution.</p>

                <p><strong>2.3 Fraud Prevention and Platform Security</strong><br />We analyse behavioural data, activity logs, IP data, and Chat patterns to detect, investigate, and prevent fraudulent or harmful activity on the Platform.</p>

                <p><strong>2.4 Wallet and Financial Management</strong><br />We use your financial and transaction data to maintain accurate wallet records, process approved withdrawals, apply dormancy fees where applicable, and comply with financial regulations.</p>

                <p><strong>2.5 Courier and Delivery Fulfilment</strong><br />We share your name, phone number, and delivery address with our courier partners solely for the purpose of fulfilling orders placed through the Platform.</p>

                <p><strong>2.6 Legal and Regulatory Compliance</strong><br />We retain and may disclose personal data, including Chat records, where required to do so by South African law, including under POPIA, FICA, the Companies Act, and applicable court orders.</p>

                <p><strong>2.7 Platform Improvement</strong><br />We use anonymised and aggregated data to analyse Platform usage, identify technical issues, and improve our features and services. This data does not identify individual users.</p>

                <p><strong>2.8 Direct Communications</strong><br />We may use your contact details to send you transactional notifications (order updates, account alerts) and, where you have not opted out, service-related communications. You may opt out of non-essential communications at any time by contacting info@rebookedsolutions.co.za.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">3. WHO WE SHARE YOUR INFORMATION WITH</h3>

                <p>We do not sell, rent, or trade your personal information to third parties for their own commercial purposes. We share your information only in the following circumstances and only to the extent necessary:</p>

                <ul className="list-disc pl-6 space-y-2">

                  <li><strong>Technical Infrastructure Providers</strong> — We use Amazon Web Services (AWS), Supabase, and Vercel for hosting, database management, and deployment. Data processed by these providers may be stored outside the Republic of South Africa. Where this occurs, we ensure that appropriate safeguards equivalent to POPIA protections are in place.</li>

                  <li><strong>Payment Processors</strong> — Paystack and BobPay process payments on our behalf. These providers are PCI-DSS compliant and handle card and payment data in accordance with applicable financial security standards.</li>

                  <li><strong>Courier Services</strong> — We share your name, contact number, and delivery address with our courier partners for the sole purpose of order fulfilment.</li>

                  <li><strong>Regulatory and Law Enforcement Authorities</strong> — We may disclose personal information, including Chat records, to SARS, SAPS, the Information Regulator, or other competent authorities where we are legally required to do so, or where we have reasonable grounds to believe that a criminal offence has been committed.</li>

                  <li><strong>Business Transfers</strong> — In the event of a merger, acquisition, restructuring, or sale of all or part of our business, your personal information may be transferred to the acquiring entity. We will provide at least 30 days' written notice before any such transfer takes effect and will ensure the receiving party is bound by obligations no less protective than this Policy.</li>

                </ul>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">4. CHAT DATA — SPECIFIC DISCLOSURES</h3>

                <p><strong>4.1 Retention Period</strong><br />Chat messages are retained for the duration of your active account and for a minimum of 7 years after account closure, in accordance with South African legal and record-keeping requirements.</p>

                <p><strong>4.2 Use in Dispute Resolution</strong><br />In the event of a transaction dispute, Chat records between the relevant parties will be reviewed by ReBooked Solutions staff. Records may be shared with the other party to the dispute to the extent strictly necessary to resolve the matter fairly.</p>

                <p><strong>4.3 Disclosure to Authorities</strong><br />Chat records may be disclosed to law enforcement, the Information Regulator, or other relevant authorities where we are required to do so by law, or where we have reasonable grounds to believe that a criminal offence has been committed using our platform.</p>

                <p><strong>4.4 No Anonymity for Prohibited Conduct</strong><br />Users who engage in prohibited conduct via Chat — including fraud, harassment, off-platform solicitation, or any other violation of these policies — should be aware that their identity, device information, IP address, and full message content are stored, identifiable, and may be disclosed.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">5. DATA SECURITY</h3>

                <p><strong>5.1 Encryption</strong><br />All personal data, including Chat messages, is encrypted in transit using TLS (Transport Layer Security) and encrypted at rest. We apply industry-standard security protocols across all data storage systems.</p>

                <p><strong>5.2 Access Controls</strong><br />Access to personal data and Chat records is restricted to authorised ReBooked Solutions personnel on a strict need-to-know basis. Access is logged and subject to periodic audit.</p>

                <p><strong>5.3 Third-Party Security</strong><br />We conduct due diligence on all third-party service providers to ensure appropriate data security practices are in place before sharing personal information with them.</p>

                <p><strong>5.4 Data Breach Notification</strong><br />In the event of a data breach that poses a risk to your rights and freedoms, we will notify the Information Regulator and affected users as soon as reasonably practicable and in accordance with Section 22 of POPIA.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">6. HOW LONG WE KEEP YOUR INFORMATION</h3>

                <p><strong>6.1 Active Accounts</strong><br />All personal information, including Chat records and transaction data, is retained for as long as your account remains active and for as long as necessary to fulfil the purposes set out in this Policy.</p>

                <p><strong>6.2 Dormant Accounts</strong><br />Accounts with no activity for 12 consecutive months will be flagged for administrative review. You may request account closure at any time by contacting info@rebookedsolutions.co.za.</p>

                <p><strong>6.3 Post-Closure Retention</strong><br />Even after your account is deleted or closed, we are required by South African law to retain transaction records, identity verification data, financial records, and Chat records for a minimum of 7 years. This obligation overrides any deletion request to the extent it conflicts with our legal retention duties.</p>

                <p><strong>6.4 Deletion of Non-Essential Data</strong><br />Personal data that is no longer required for any legitimate purpose and is not subject to a legal retention obligation will be securely deleted or anonymised.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">7. YOUR RIGHTS UNDER POPIA</h3>

                <p>You have the following rights in respect of your personal information, subject to applicable legal limitations:</p>

                <ul className="list-disc pl-6 space-y-1">

                  <li><strong>Right to Access</strong> — You may request a copy of the personal information we hold about you, including any Chat records stored in your name.</li>

                  <li><strong>Right to Correction</strong> — You may request that we correct any inaccurate, incomplete, or outdated personal information.</li>

                  <li><strong>Right to Deletion</strong> — You may request deletion of your personal information, subject to our legal retention obligations. We will inform you if a deletion request cannot be fully fulfilled due to a legal obligation.</li>

                  <li><strong>Right to Object</strong> — You may object to the processing of your personal information for direct marketing purposes at any time and without charge.</li>

                  <li><strong>Right to Complain</strong> — If you believe we have processed your personal information unlawfully or in breach of POPIA, you have the right to lodge a complaint with the Information Regulator of South Africa at www.inforegulator.org.za or by email at complaints.IR@justice.gov.za.</li>

                </ul>

                <p className="mt-2">To exercise any of these rights, submit a written request to: legal@rebookedsolutions.co.za. We will respond within 30 days of receiving your request.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">8. COOKIES AND TRACKING TECHNOLOGIES</h3>

                <p>Our Platform uses cookies and similar tracking technologies for the following purposes:</p>

                <ul className="list-disc pl-6 space-y-1">

                  <li><strong>Session security:</strong> Maintaining secure login sessions and preventing unauthorised access.</li>

                  <li><strong>User preferences:</strong> Remembering your settings and preferences across sessions.</li>

                  <li><strong>Analytics:</strong> Understanding how users interact with the Platform in order to improve functionality and performance. Analytics data is anonymised and aggregated where possible.</li>

                </ul>

                <p className="mt-2">You may adjust your browser settings to refuse or delete cookies. Please note that disabling cookies may affect the functionality of certain Platform features. We do not use cookies for advertising or to sell your data to third parties.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">9. CROSS-BORDER DATA TRANSFERS</h3>

                <p>Some of our service providers (including AWS, Supabase, and Vercel) may store or process your data outside the Republic of South Africa. Where this occurs, we take reasonable steps to ensure that equivalent data protection standards apply, in accordance with Section 72 of POPIA. By using the Platform, you consent to such transfers where they are necessary for the provision of our services.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">10. CHILDREN AND MINORS</h3>

                <p>The Platform permits users as young as 13 years of age, with parental or guardian consent for users under 18. We do not knowingly collect personal information from children under 13. If we become aware that a user under 13 has registered without appropriate consent, we will delete their account and associated data. If you believe a minor under 13 has created an account on our Platform, please contact us immediately at info@rebookedsolutions.co.za.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">11. UPDATES TO THIS POLICY</h3>

                <p>We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or platform features. We will notify you of material changes by email to your registered address and/or via a prominent notice on the Platform before changes take effect. Continued use of the Platform after such notification constitutes acceptance of the updated Policy.</p>

              </section>



              <section>

                <h3 className="text-lg font-bold mb-2">12. CONTACT US</h3>

                <p><strong>Legal Department:</strong> legal@rebookedsolutions.co.za<br /><strong>General Support:</strong> info@rebookedsolutions.co.za<br /><strong>Platform:</strong> rebookedsolutions.co.za<br /><strong>Information Regulator (SA):</strong> www.inforegulator.org.za</p>

              </section>



              <p className="text-sm text-muted-foreground italic pt-4">This Privacy Policy was last reviewed and updated in April 2026.</p>

            </CardContent>

          </Card>

        )}



        {/* Terms & Conditions */}

        {activeTab === "terms" && (

          <Card>

            <CardHeader className="bg-muted/50 rounded-t-lg">

              <CardTitle className="text-2xl flex items-center gap-3">

                <Scale className="h-6 w-6 text-primary" />

                Terms and Conditions

              </CardTitle>

              <p className="text-sm text-muted-foreground">

                Last Updated: June 2026 · Effective Date: June 2026

              </p>

            </CardHeader>

            <CardContent className="prose max-w-none text-sm sm:text-base text-foreground space-y-6 pt-6">

              <div dangerouslySetInnerHTML={{ __html: termsHtml }} />

            </CardContent>

          </Card>

        )}

      </div>

    </Layout>

  );

};



export default Policies;
