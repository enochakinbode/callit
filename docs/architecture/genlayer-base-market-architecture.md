# Callit v3 Architecture Plan: GenLayer Decision Layer, Base Shared Vault

## Summary

Callit v3 separates decision-making from money movement:

- GenLayer is the only layer allowed to admit markets, resolve markets, and run appeals.
- Base is the only layer allowed to custody USDC and pay users.
- The current trusted human resolution model is removed. Admin keeps operational and safety controls, but never chooses winners.
- Launch scope is P2P binary markets only. Accumulator markets are coming soon.
- Launch asset is Base USDC only.

## Architecture And Product Design

### Market admission

- Every market must resolve onto a strict template, not free-form resolution language.
- The user submits the market facts. GenLayer classifies the category and picks the matching launch template during admission.
- GenLayer also chooses the approved primary source set during admission. User-submitted links are supplemental only.
- Required fields:
  - binary outcome statement
  - exact cutoff time
  - exact funding deadline
  - exact resolution rule
  - optional supplemental user sources
- GenLayer evaluates the draft before any funds move.
- GenLayer rejects markets that are vague, subjective, duplicated, unsupported, or dependent on weak evidence.
- User-added sources are allowed, but they are supplemental only and can never be the sole deciding evidence.

### Supported launch market classes

- Crypto price and threshold markets.
- Sports match, season, and tournament outcome markets.
- Politics and regulation markets tied to official actions or published outcomes.
- Economy markets tied to official releases or named institutional decisions.

Excluded at launch:

- opinion markets
- sentiment markets
- vague milestone claims
- ambiguous "before/after" phrasing without a hard timestamp
- anything that cannot be tied to explicit evidence

### Money layer on Base

- One shared USDC vault holds all launch funds.
- The vault uses per-market accounting so each market's balances, participants, status, fees, and payout rights remain isolated in storage.
- The shared vault is allowed because settlement logic is narrow and deterministic; risk is reduced by strict vault state checks, one-time settlement guards, and limited admin safety powers.

### Creation and funding flow

1. User submits a draft market to GenLayer.
2. GenLayer either rejects it or returns an approved market definition with a market ID, inferred category, inferred template, canonical resolution rule, approved primary sources, and a funding deadline.
3. The creator funds the approved market on Base.
4. The market becomes active only after Base funding succeeds.

- If the creator never funds, the approval expires and no live market exists.
- If a counterparty is required to match the market, unmatched markets can be canceled by the creator after the configured expiry rule.
- Matching does not re-open market definition decisions; the acceptor only locks the opposite side against the already-approved market.

### Resolution model

- GenLayer uses approved primary sources and frozen market rules to produce a normalized result packet.
- AI is used to classify the market, normalize inputs, and weigh the approved evidence against the frozen resolution rule.
- Resolution packets must contain:
  - market ID
  - outcome
  - resolution status
  - evidence summary
  - evidence URLs
  - confidence score
  - dispute deadline
  - settlement hash for Base relay

Primary-source defaults:

- All launch markets require agreement from at least two approved primary sources.

Supplemental user sources:

- can strengthen evidence
- cannot overturn agreement among approved primary sources

Source freshness defaults:

- Sources must be current to the frozen market rule and event timing.
- Preview or speculative reporting is not enough for resolution.

If approved primary sources disagree, are stale, or fail confidence thresholds, the market is marked `UNRESOLVABLE`, not "winner pending".

### Uncertainty handling

- Default launch rule: unresolved confidence or conflicting primary evidence results in cancel-and-refund.
- To stop abuse, the creator posts a market quality bond at creation.
- If a market is later marked `UNRESOLVABLE` because the original framing was ambiguous, unsupported, or low-quality under the frozen market rule, that creator bond is forfeited to the protocol treasury.
- If the market becomes unresolvable because approved sources fail externally despite a valid market design, user stakes are refunded and the creator bond is returned.
- The current contract stores the quality bond amount as market metadata; actual bond transfer logic is still a later step.

### Appeals

- The dispute window defaults to 1 hour from provisional GenLayer resolution.
- The dispute deadline is generated inside GenLayer from the transaction datetime at provisional resolution time.
- Admin may update the dispute window length in hours for future resolutions.
- Anyone may challenge during that window.
- Launch uses one Callit challenge path on GenLayer with one active challenge per market at a time.
- GenLayer re-reviews the frozen market, the provisional evidence, and the challenger evidence, then returns `UPHELD`, `OVERTURNED`, or `UNRESOLVABLE`.
- Challenge bond economics are not enforced in the current contract yet. Launch challenge access is open at the contract level, with relayer and product policy expected to narrow usage operationally.

During any challenge, Base funds remain locked and the market cannot settle.

### Settlement from GenLayer to Base

- Launch uses a constrained relayer, not a decision-making relayer.
- The relayer may only submit finalized settlement payloads that were already produced by GenLayer after the dispute window or appeal completion.
- The Base vault must reject:
  - duplicate settlement attempts
  - changed payout amounts
  - changed participant sets
  - settlement for markets not in the correct state
  - replayed payloads for already-settled or already-refunded markets

Relayer role design:

- relayer is replaceable
- relayer cannot withdraw arbitrary funds
- relayer cannot choose outcomes
- relayer failure only delays settlement; it must not enable theft

Product language at launch must be accurate: GenLayer decides outcomes, and Base executes finalized settlement through a constrained relay. Do not market this as fully proofless trustlessness across chains until a native verification path exists.

### Admin powers

- Admin may manage source registries, source categories, source weights, market templates, blocked categories, market limits, relayer keys, protocol fee budgets, pauses, and safety controls.
- Admin may update the dispute window length for future provisional resolutions.
- Admin source additions must happen before the market enters the resolution path so the frozen source set is not changed after resolution starts.
- Admin may disable new market creation for a category or source without affecting already-finalized outcomes.
- Admin may perform safety unwind only under explicit triggers:
  - funding mismatch
  - vault accounting inconsistency
  - relay outage beyond timeout
  - market stuck in a protocol error state
  - explicit `UNRESOLVABLE` or refund result from GenLayer
- Admin may never set, edit, or override a market winner.
- Admin safety actions must be recorded on-chain and visible in the UI as protocol interventions.

### Accumulator markets

- Accumulators are not in the current launch scope.
- They will be added only after the single-market relayer, GenLayer admission flow, and Base settlement flow are stable.
- UI and product copy should present accumulators as coming soon, not live functionality.

## Interfaces, States, And Rules To Implement

### GenLayer records

- `MarketDraft`
- `ApprovedMarket`
- `SourceAssessment`
- `ResolutionPacket`
- `AppealState`
- `SettlementInstruction`

### Base vault actions

- `fundMarket`
- `matchMarket`
- `cancelUnmatched`
- `refundMarket`
- `settleMarket`
- `adminSafetyUnwind`

### Core market states

- `DRAFT`
- `APPROVED_PENDING_FUNDING`
- `ACTIVE_OPEN`
- `ACTIVE_MATCHED`
- `PROVISIONALLY_RESOLVED`
- `IN_DISPUTE`
- `FINAL_SETTLED`
- `FINAL_REFUNDED`
- `SAFETY_UNWOUND`

### UI requirements

- Show the frozen resolution rule and source set before funding.
- Show whether a source is primary or supplemental.
- Show provisional outcome, dispute deadline, challenge status, finality status, and settlement status.
- Show protocol intervention banners when admin pause or safety unwind affects a market.
- Correct the current fee mismatch in code and copy so the entire product consistently reflects a 2% winner fee.

## Test Plan And Acceptance Criteria

- Reject markets that are vague, subjective, duplicated, or unsupported before Base funds are requested.
- Approve a valid market, fund it on Base, and activate it only after successful deposit.
- Expire an approved-but-unfunded market cleanly without leaving any live state on Base.
- Cancel an unmatched market and return funds exactly once.
- Resolve a price market from a hard source without AI ambiguity changing the numeric answer.
- Resolve a non-price market only when at least two approved primary sources agree.
- Ignore low-quality supplemental user sources so they cannot overturn qualified primary evidence.
- Mark a market `UNRESOLVABLE` when primary sources conflict or confidence falls below threshold.
- Refund user stakes correctly on valid external unresolvable cases.
- Forfeit the creator quality bond on creator-caused ambiguous or unsupported market framing.
- Open a challenge during the 1-hour window and keep funds locked until the appeal path ends.
- Generate the dispute deadline inside GenLayer instead of accepting it from callers.
- Reject duplicate, replayed, or altered settlement submissions from the relayer.
- Ensure relayer failure delays settlement but cannot change winners or steal funds.
- Verify admin can pause and safety-unwind only within the explicit allowed triggers.
- Ensure all settlement and refund actions are idempotent.

## Assumptions And Defaults

- Launch chain split is fixed: GenLayer for admission, resolution, and appeal; Base for custody and payouts.
- Launch asset is Base USDC only. USDT is deferred.
- Users pay Base gas for their deposit and match actions. The protocol sponsors GenLayer transaction and appeal costs at launch.
- Default market quality bond is sized by market class during implementation; if not otherwise specified, use a flat launch default equivalent to $25. Challenge bond economics remain future work.
- Markets should prefer the clearest approved source evidence over loose interpretation.
- The constrained relayer is the launch bridge model until a native verifiable GenLayer-to-Base path exists.
