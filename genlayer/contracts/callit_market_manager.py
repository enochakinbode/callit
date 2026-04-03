# { "Depends": "py-genlayer:latest" }

from dataclasses import dataclass
import datetime
import json
import typing

from genlayer import *

CRYPTO_CATEGORY = "Crypto"
SPORTS_CATEGORY = "Sports"
POLITICS_CATEGORY = "Politics"
ECONOMY_CATEGORY = "Economy"

CRYPTO_THRESHOLD_TEMPLATE = "crypto-threshold"
CRYPTO_METRIC_TEMPLATE = "crypto-metric"
SPORTS_MATCH_TEMPLATE = "sports-match"
SPORTS_SEASON_TEMPLATE = "sports-season"
POLITICS_OFFICIAL_ACTION_TEMPLATE = "politics-official-action"
ECONOMY_RELEASE_TEMPLATE = "economy-release"

PRIMARY_SOURCE_CONSENSUS_SETTLEMENT = "PRIMARY_SOURCE_CONSENSUS"

COINGECKO_SOURCE = "coingecko"
DEFILLAMA_SOURCE = "defillama"
OFFICIAL_LEAGUE_SOURCE = "official-league"
OFFICIAL_TOURNAMENT_SOURCE = "official-tournament"
BBC_SPORT_SOURCE = "bbc-sport"
OFFICIAL_GOV_SOURCE = "official-gov"
OFFICIAL_REGULATOR_SOURCE = "official-regulator"
REUTERS_SOURCE = "reuters"
OFFICIAL_RELEASE_SOURCE = "official-release"
CENTRAL_BANK_SOURCE = "central-bank"
DEFAULT_DISPUTE_WINDOW_HOURS = 1
ZERO_ADDRESS_HEX = "0x0000000000000000000000000000000000000000"

MARKET_STATUS_APPROVED_PENDING_FUNDING = "APPROVED_PENDING_FUNDING"
MARKET_STATUS_PROVISIONALLY_RESOLVED = "PROVISIONALLY_RESOLVED"
MARKET_STATUS_UNDER_CHALLENGE = "UNDER_CHALLENGE"
MARKET_STATUS_CHALLENGE_DECIDED = "CHALLENGE_DECIDED"
MARKET_STATUS_FINAL_CREATOR_WINS = "FINAL_CREATOR_WINS"
MARKET_STATUS_FINAL_TAKER_WINS = "FINAL_TAKER_WINS"
MARKET_STATUS_FINAL_REFUNDED = "FINAL_REFUNDED"

RESOLUTION_STATUS_PROVISIONAL = "PROVISIONAL"
RESOLUTION_STATUS_UNRESOLVABLE = "UNRESOLVABLE"

OUTCOME_CREATOR_WINS = "CREATOR_WINS"
OUTCOME_TAKER_WINS = "TAKER_WINS"
OUTCOME_UNRESOLVABLE = "UNRESOLVABLE"

CHALLENGE_STATUS_OPEN = "OPEN"
CHALLENGE_STATUS_UPHELD = "UPHELD"
CHALLENGE_STATUS_OVERTURNED = "OVERTURNED"
CHALLENGE_STATUS_UNRESOLVABLE = "UNRESOLVABLE"


@allow_storage
@dataclass
class ApprovedMarket:
    market_id: str
    creator: Address
    category: str
    template_id: str
    statement: str
    cutoff_iso: str
    funding_deadline_iso: str
    resolution_rule: str
    settlement_mode: str
    status: str
    probability_bps: u16
    confidence_bps: u16
    quality_bond_usdc: u32
    primary_sources: str
    supplemental_sources: str


@allow_storage
@dataclass
class ResolutionPacket:
    market_id: str
    outcome: str
    status: str
    evidence_summary: str
    evidence_urls: str
    confidence_bps: u16
    settlement_hash: str
    dispute_deadline_iso: str


@allow_storage
@dataclass
class ChallengeRecord:
    market_id: str
    challenger: Address
    opened_at_iso: str
    reason: str
    evidence_urls: str
    status: str
    decision_summary: str
    decision_evidence_urls: str
    decided_outcome: str
    confidence_bps: u16
    decided_at_iso: str


class CallitMarketManager(gl.Contract):
    owner: Address
    market_count: u32
    quality_bond_usdc: u32
    dispute_window_hours: u16
    approved_markets: TreeMap[str, ApprovedMarket]
    resolution_packets: TreeMap[str, ResolutionPacket]
    challenge_records: TreeMap[str, ChallengeRecord]

    def __init__(
        self,
    ):
        self.owner = gl.message.sender_address
        self.market_count = u32(0)
        self.quality_bond_usdc = u32(25)
        self.dispute_window_hours = u16(DEFAULT_DISPUTE_WINDOW_HOURS)

    @gl.public.write
    def submit_market(
        self,
        market_payload: str,
    ) -> str:
        current_time_iso = self._current_tx_iso()
        market_data = self._parse_json_object(market_payload, "market payload")
        statement = str(market_data.get("statement", "")).strip()
        cutoff_iso = str(market_data.get("cutoff_iso", "")).strip()
        funding_deadline_iso = str(market_data.get("funding_deadline_iso", "")).strip()

        self._require_non_empty(statement, "statement")
        self._require_non_empty(cutoff_iso, "cutoff")
        self._require_non_empty(funding_deadline_iso, "funding deadline")
        if not self._iso_after(funding_deadline_iso, current_time_iso):
            raise gl.vm.UserError("Funding deadline must be in the future")
        if not self._iso_after(cutoff_iso, funding_deadline_iso):
            raise gl.vm.UserError("Cutoff must be after funding deadline")

        frozen_statement = statement
        frozen_supplemental_sources = self._normalize_generic_string_list(
            market_data.get("supplemental_sources", []),
            "supplemental sources",
        )
        supported_categories = self._supported_categories()
        supported_templates_by_category = self._supported_templates_by_category()
        supported_primary_sources_by_category = (
            self._supported_primary_sources_by_category()
        )

        def admission_review() -> str:
            prompt = f"""
            You are validating a binary prediction market for Callit.

            Statement: {frozen_statement}
            Cutoff ISO: {cutoff_iso}
            Funding deadline ISO: {funding_deadline_iso}
            Supplemental sources: {json.dumps(frozen_supplemental_sources)}

            You must classify the market into exactly one supported category and one supported template,
            then generate the canonical resolution rule yourself and choose the approved primary source set.
            Supported categories: {json.dumps(supported_categories)}
            Supported templates by category: {json.dumps(supported_templates_by_category)}
            Supported primary sources by category: {json.dumps(supported_primary_sources_by_category)}

            Return JSON only in this shape:
            {{
              "decision": "approve" or "reject",
              "reason": "brief explanation",
              "probability_bps": integer,
              "confidence_bps": integer,
              "category": "supported category",
              "template_id": "supported template for that category",
              "resolution_rule": "canonical frozen rule used to resolve the market",
              "primary_sources": ["approved source id", "approved source id"],
              "settlement_mode": "PRIMARY_SOURCE_CONSENSUS"
            }}

            Reject any market that is vague, subjective, unsupported, duplicated in meaning,
            or not tied to explicit verifiable evidence. Approve only if you can produce
            a precise canonical resolution rule and the market can be settled with named sources.
            If no supported category and template fit, reject the market.
            Additional source rules:
            - User-provided supplemental sources are supporting context only.
            - Approved markets must use PRIMARY_SOURCE_CONSENSUS settlement.
            - Approved markets must choose at least two approved primary sources from the chosen category.
            - Treat the submitted statement as the YES-side claim.
            - The generated resolution rule must explicitly define what resolves YES, what resolves NO,
              and when to return UNRESOLVABLE.
            """
            response = (
                gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "")
            )
            parsed = json.loads(response)
            return json.dumps(parsed, sort_keys=True)

        review = json.loads(gl.eq_principle.strict_eq(admission_review))

        if review["decision"] != "approve":
            raise gl.vm.UserError(review["reason"])

        inferred_probability_bps = self._normalize_probability_bps(
            review.get("probability_bps")
        )
        inferred_category = str(review.get("category", "")).strip()
        inferred_template_id = str(review.get("template_id", "")).strip()
        inferred_settlement_mode = str(review.get("settlement_mode", "")).strip()
        inferred_resolution_rule = str(review.get("resolution_rule", "")).strip()
        inferred_primary_sources = self._normalize_source_list(
            review.get("primary_sources", [])
        )

        self._require_non_empty(inferred_resolution_rule, "resolution rule")
        self._require_supported_category(inferred_category)
        self._require_supported_template(inferred_category, inferred_template_id)
        self._require_supported_settlement_mode(inferred_settlement_mode)
        self._require_supported_primary_sources(
            inferred_category,
            inferred_settlement_mode,
            inferred_primary_sources,
        )

        market_number = int(self.market_count) + 1
        market_id = f"gl-market-{market_number}"

        approved_market = ApprovedMarket(
            market_id=market_id,
            creator=gl.message.sender_address,
            category=inferred_category,
            template_id=inferred_template_id,
            statement=frozen_statement,
            cutoff_iso=cutoff_iso,
            funding_deadline_iso=funding_deadline_iso,
            resolution_rule=inferred_resolution_rule,
            settlement_mode=inferred_settlement_mode,
            status=MARKET_STATUS_APPROVED_PENDING_FUNDING,
            probability_bps=inferred_probability_bps,
            confidence_bps=self._normalize_confidence_bps(review.get("confidence_bps")),
            quality_bond_usdc=self.quality_bond_usdc,
            primary_sources=self._encode_string_list(inferred_primary_sources),
            supplemental_sources=self._encode_string_list(frozen_supplemental_sources),
        )

        self.approved_markets[market_id] = approved_market
        self.market_count = u32(market_number)
        return market_id

    @gl.public.write
    def refresh_market_probability(self, market_id: str) -> str:
        approved = self.approved_markets[market_id]
        if approved.market_id == "":
            raise gl.vm.UserError("Unknown market")
        if self._is_final_market_status(approved.status):
            raise gl.vm.UserError("Cannot update probability for finalized market")

        packet = self._resolution_packet_or_default(market_id)
        challenge = self._challenge_record_or_default(market_id)
        approved_market_id = approved.market_id
        approved_category = approved.category
        approved_template_id = approved.template_id
        approved_statement = approved.statement
        approved_cutoff_iso = approved.cutoff_iso
        approved_resolution_rule = approved.resolution_rule
        approved_settlement_mode = approved.settlement_mode
        approved_status = approved.status
        approved_confidence_bps = int(approved.confidence_bps)
        primary_sources = self._decode_stored_string_list(approved.primary_sources)
        supplemental_sources = self._decode_stored_string_list(
            approved.supplemental_sources
        )
        packet_dict = (
            self._resolution_packet_dict(packet) if packet.market_id != "" else None
        )
        challenge_dict = (
            self._challenge_dict(challenge) if challenge.market_id != "" else None
        )

        def probability_review() -> str:
            prompt = f"""
            Estimate the current probability for an approved Callit binary market.

            Market ID: {approved_market_id}
            Category: {approved_category}
            Template: {approved_template_id}
            Statement: {approved_statement}
            Cutoff ISO: {approved_cutoff_iso}
            Resolution rule: {approved_resolution_rule}
            Settlement mode: {approved_settlement_mode}
            Primary sources: {json.dumps(primary_sources)}
            Supplemental sources: {json.dumps(supplemental_sources)}
            Current status: {approved_status}
            Existing confidence_bps: {approved_confidence_bps}
            Resolution packet: {json.dumps(packet_dict)}
            Challenge record: {json.dumps(challenge_dict)}

            Return JSON only in this shape:
            {{
              "probability_bps": integer,
              "reason": "brief explanation"
            }}

            Rules:
            - probability_bps must be between 0 and 10000.
            - Use the frozen statement and source set.
            - Do not assume the market is finalized unless the stored status says it is finalized.
            """
            response = (
                gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "")
            )
            parsed = json.loads(response)
            return json.dumps(parsed, sort_keys=True)

        probability_review_result = json.loads(
            gl.eq_principle.strict_eq(probability_review)
        )
        approved.probability_bps = self._normalize_probability_bps(
            probability_review_result.get("probability_bps")
        )
        self.approved_markets[market_id] = approved
        return json.dumps(
            {
                "market_id": approved.market_id,
                "probability_bps": int(approved.probability_bps),
                "probability_percent": int(approved.probability_bps) / 100,
                "reason": str(probability_review_result.get("reason", "")).strip(),
            },
            sort_keys=True,
        )

    @gl.public.write
    def add_market_sources(self, market_id: str, sources_payload: str) -> str:
        self._only_owner()
        approved = self.approved_markets[market_id]
        if approved.market_id == "":
            raise gl.vm.UserError("Unknown market")
        if self._resolution_packet_or_default(market_id).market_id != "":
            raise gl.vm.UserError("Sources are frozen after resolution starts")

        sources_data = self._parse_json_object(sources_payload, "sources payload")
        new_primary_sources = self._normalize_generic_string_list(
            sources_data.get("primary_sources", []),
            "primary sources",
        )
        new_supplemental_sources = self._normalize_generic_string_list(
            sources_data.get("supplemental_sources", []),
            "supplemental sources",
        )
        if len(new_primary_sources) == 0 and len(new_supplemental_sources) == 0:
            raise gl.vm.UserError("No new sources provided")

        primary_sources = self._decode_stored_string_list(approved.primary_sources)
        supplemental_sources = self._decode_stored_string_list(
            approved.supplemental_sources
        )

        for source in new_primary_sources:
            if source not in primary_sources:
                primary_sources.append(source)

        for source in new_supplemental_sources:
            if source not in supplemental_sources:
                supplemental_sources.append(source)

        self._require_supported_primary_sources(
            approved.category,
            approved.settlement_mode,
            primary_sources,
        )

        approved.primary_sources = self._encode_string_list(primary_sources)
        approved.supplemental_sources = self._encode_string_list(supplemental_sources)
        self.approved_markets[market_id] = approved
        return json.dumps(
            {
                "market_id": approved.market_id,
                "primary_sources": primary_sources,
                "supplemental_sources": supplemental_sources,
            },
            sort_keys=True,
        )

    @gl.public.write
    def set_dispute_window_hours(self, hours: u16) -> str:
        self._only_owner()
        if int(hours) == 0:
            raise gl.vm.UserError("Dispute window must be at least 1 hour")

        self.dispute_window_hours = hours
        return json.dumps(
            {
                "dispute_window_hours": int(self.dispute_window_hours),
                "dispute_window_seconds": self._dispute_window_seconds(),
            },
            sort_keys=True,
        )

    @gl.public.write
    def resolve_market(self, market_id: str) -> str:
        current_time_iso = self._current_tx_iso()
        approved = self.approved_markets[market_id]
        if approved.market_id == "":
            raise gl.vm.UserError("Unknown market")
        if approved.status != MARKET_STATUS_APPROVED_PENDING_FUNDING:
            raise gl.vm.UserError("Market is not ready for provisional resolution")
        if self._resolution_packet_or_default(market_id).market_id != "":
            raise gl.vm.UserError("Market already has a resolution packet")
        if not self._iso_at_or_after(current_time_iso, approved.cutoff_iso):
            raise gl.vm.UserError("Cutoff time not reached")

        dispute_deadline_iso = self._shift_iso_seconds(
            current_time_iso, self._dispute_window_seconds()
        )

        approved_market_id = approved.market_id
        approved_category = approved.category
        approved_template_id = approved.template_id
        approved_statement = approved.statement
        approved_cutoff_iso = approved.cutoff_iso
        approved_resolution_rule = approved.resolution_rule
        primary_sources = self._decode_stored_string_list(approved.primary_sources)
        supplemental_sources = self._decode_stored_string_list(
            approved.supplemental_sources
        )

        def resolve_from_sources() -> str:
            prompt = f"""
            Resolve the following frozen binary market.

            Market ID: {approved_market_id}
            Category: {approved_category}
            Template: {approved_template_id}
            Statement: {approved_statement}
            Cutoff ISO: {approved_cutoff_iso}
            Resolution rule: {approved_resolution_rule}
            Primary sources: {json.dumps(primary_sources)}
            Supplemental sources: {json.dumps(supplemental_sources)}

            Rules:
            - Resolution requires agreement from at least two approved primary sources.
            - Supplemental sources may support evidence, but cannot override agreeing primary sources.
            - If sources conflict or confidence is weak, return UNRESOLVABLE.

            Return JSON only in this shape:
            {{
              "outcome": "CREATOR_WINS" or "TAKER_WINS" or "UNRESOLVABLE",
              "status": "PROVISIONAL" or "UNRESOLVABLE",
              "confidence_bps": integer,
              "evidence_summary": "brief explanation",
              "evidence_urls": ["url-1", "url-2"],
              "settlement_hash": "stable hash input string"
            }}
            """
            response = (
                gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "")
            )
            parsed = json.loads(response)
            return json.dumps(parsed, sort_keys=True)

        result = json.loads(gl.eq_principle.strict_eq(resolve_from_sources))
        resolution_status = str(result.get("status", "")).strip()
        resolution_outcome = str(result.get("outcome", "")).strip()
        settlement_hash = str(result.get("settlement_hash", "")).strip()

        self._require_supported_resolution_result(
            resolution_status,
            resolution_outcome,
            settlement_hash,
        )

        packet = ResolutionPacket(
            market_id=approved.market_id,
            outcome=resolution_outcome,
            status=resolution_status,
            evidence_summary=str(result.get("evidence_summary", "")).strip(),
            evidence_urls=self._encode_string_list(
                self._normalize_generic_string_list(
                    result.get("evidence_urls", []), "resolution evidence"
                )
            ),
            confidence_bps=self._normalize_confidence_bps(result.get("confidence_bps")),
            settlement_hash=settlement_hash,
            dispute_deadline_iso=dispute_deadline_iso,
        )

        if packet.status == RESOLUTION_STATUS_UNRESOLVABLE:
            approved.status = MARKET_STATUS_FINAL_REFUNDED
        else:
            approved.status = MARKET_STATUS_PROVISIONALLY_RESOLVED

        self.approved_markets[market_id] = approved
        self.resolution_packets[market_id] = packet
        return json.dumps(
            {
                "market_id": packet.market_id,
                "status": packet.status,
                "outcome": packet.outcome,
                "dispute_deadline_iso": packet.dispute_deadline_iso,
            },
            sort_keys=True,
        )

    @gl.public.write
    def open_challenge(
        self,
        market_id: str,
        challenge_payload: str,
    ) -> str:
        approved = self.approved_markets[market_id]
        if approved.market_id == "":
            raise gl.vm.UserError("Unknown market")
        packet = self._resolution_packet_or_default(market_id)
        if packet.market_id == "":
            raise gl.vm.UserError("Market has no provisional resolution")
        if approved.status != MARKET_STATUS_PROVISIONALLY_RESOLVED:
            raise gl.vm.UserError("Market is not open for challenge")
        if packet.status != RESOLUTION_STATUS_PROVISIONAL:
            raise gl.vm.UserError("Only provisional outcomes can be challenged")

        challenge_data = self._parse_json_object(challenge_payload, "challenge payload")
        current_time_iso = self._current_tx_iso()
        reason = str(challenge_data.get("reason", "")).strip()
        evidence_urls = self._normalize_generic_string_list(
            challenge_data.get("evidence_urls", []),
            "challenge evidence",
        )
        self._require_non_empty(reason, "challenge reason")
        if self._iso_after(current_time_iso, packet.dispute_deadline_iso):
            raise gl.vm.UserError("Dispute window closed")

        existing = self._challenge_record_or_default(market_id)
        if existing.market_id != "" and existing.status == CHALLENGE_STATUS_OPEN:
            raise gl.vm.UserError("Market already has an open challenge")

        challenge = ChallengeRecord(
            market_id=market_id,
            challenger=gl.message.sender_address,
            opened_at_iso=current_time_iso,
            reason=reason,
            evidence_urls=self._encode_string_list(evidence_urls),
            status=CHALLENGE_STATUS_OPEN,
            decision_summary="",
            decision_evidence_urls=self._encode_string_list([]),
            decided_outcome="",
            confidence_bps=u16(0),
            decided_at_iso="",
        )

        approved.status = MARKET_STATUS_UNDER_CHALLENGE
        self.approved_markets[market_id] = approved
        self.challenge_records[market_id] = challenge
        return json.dumps(self._challenge_dict(challenge), sort_keys=True)

    @gl.public.write
    def decide_challenge(self, market_id: str) -> str:
        decision_time_iso = self._current_tx_iso()
        approved = self.approved_markets[market_id]
        if approved.market_id == "":
            raise gl.vm.UserError("Unknown market")
        packet = self._resolution_packet_or_default(market_id)
        challenge = self._challenge_record_or_default(market_id)
        if challenge.market_id == "":
            raise gl.vm.UserError("No challenge found")
        if challenge.status != CHALLENGE_STATUS_OPEN:
            raise gl.vm.UserError("Challenge is not open")

        approved_market_id = approved.market_id
        approved_statement = approved.statement
        approved_category = approved.category
        approved_template_id = approved.template_id
        approved_resolution_rule = approved.resolution_rule
        primary_sources = self._decode_stored_string_list(approved.primary_sources)
        supplemental_sources = self._decode_stored_string_list(
            approved.supplemental_sources
        )
        challenge_evidence_urls = self._decode_stored_string_list(
            challenge.evidence_urls
        )
        original_outcome = packet.outcome
        original_evidence_summary = packet.evidence_summary
        original_evidence_urls = self._decode_stored_string_list(packet.evidence_urls)
        challenge_reason = challenge.reason

        def review_challenge() -> str:
            prompt = f"""
            Review a challenged provisional market resolution for Callit.

            Market ID: {approved_market_id}
            Statement: {approved_statement}
            Category: {approved_category}
            Template: {approved_template_id}
            Resolution rule: {approved_resolution_rule}
            Primary sources: {json.dumps(primary_sources)}
            Supplemental sources: {json.dumps(supplemental_sources)}

            Original provisional outcome: {original_outcome}
            Original evidence summary: {original_evidence_summary}
            Original evidence URLs: {json.dumps(original_evidence_urls)}

            Challenger reason: {challenge_reason}
            Challenger evidence URLs: {json.dumps(challenge_evidence_urls)}

            Return JSON only in this shape:
            {{
              "decision": "UPHOLD" or "OVERTURN" or "UNRESOLVABLE",
              "outcome": "CREATOR_WINS" or "TAKER_WINS" or "UNRESOLVABLE",
              "confidence_bps": integer,
              "decision_summary": "brief explanation",
              "evidence_urls": ["url-1", "url-2"]
            }}

            Rules:
            - UPHOLD means the original provisional outcome remains correct.
            - OVERTURN means the challenger proved the opposite binary outcome.
            - UNRESOLVABLE means the market should refund because evidence is conflicting or insufficient.
            """
            response = (
                gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "")
            )
            parsed = json.loads(response)
            return json.dumps(parsed, sort_keys=True)

        decision = json.loads(gl.eq_principle.strict_eq(review_challenge))
        challenge_decision = str(decision.get("decision", "")).strip()
        challenge_outcome = str(decision.get("outcome", "")).strip()

        self._require_supported_challenge_decision(
            challenge_decision,
            challenge_outcome,
            packet.outcome,
        )

        challenge.status = challenge_decision
        challenge.decision_summary = str(decision.get("decision_summary", "")).strip()
        challenge.decision_evidence_urls = self._encode_string_list(
            self._normalize_generic_string_list(
                decision.get("evidence_urls", []), "challenge decision evidence"
            )
        )
        challenge.decided_outcome = challenge_outcome
        challenge.confidence_bps = self._normalize_confidence_bps(
            decision.get("confidence_bps")
        )
        challenge.decided_at_iso = decision_time_iso

        approved.status = MARKET_STATUS_CHALLENGE_DECIDED
        self.approved_markets[market_id] = approved
        self.challenge_records[market_id] = challenge
        return json.dumps(self._challenge_dict(challenge), sort_keys=True)

    @gl.public.write
    def finalize_market(self, market_id: str) -> str:
        current_time_iso = self._current_tx_iso()
        approved = self.approved_markets[market_id]
        if approved.market_id == "":
            raise gl.vm.UserError("Unknown market")
        packet = self._resolution_packet_or_default(market_id)
        if packet.market_id == "":
            raise gl.vm.UserError("Market has no resolution packet")

        challenge = self._challenge_record_or_default(market_id)
        if challenge.market_id != "" and challenge.status == CHALLENGE_STATUS_OPEN:
            raise gl.vm.UserError("Open challenge must be decided before finalization")

        if packet.status == RESOLUTION_STATUS_UNRESOLVABLE:
            approved.status = MARKET_STATUS_FINAL_REFUNDED
        elif challenge.market_id == "":
            if not self._iso_after(current_time_iso, packet.dispute_deadline_iso):
                raise gl.vm.UserError("Dispute window still open")
            approved.status = self._final_status_from_outcome(packet.outcome)
        elif challenge.status == CHALLENGE_STATUS_UPHELD:
            approved.status = self._final_status_from_outcome(packet.outcome)
        elif challenge.status == CHALLENGE_STATUS_OVERTURNED:
            approved.status = self._final_status_from_outcome(challenge.decided_outcome)
        elif challenge.status == CHALLENGE_STATUS_UNRESOLVABLE:
            approved.status = MARKET_STATUS_FINAL_REFUNDED
        else:
            raise gl.vm.UserError("Unsupported challenge state")

        self.approved_markets[market_id] = approved
        return json.dumps(
            {
                "market_id": approved.market_id,
                "status": approved.status,
            },
            sort_keys=True,
        )

    @gl.public.view
    def get_challenge(self, market_id: str) -> str:
        challenge = self._challenge_record_or_default(market_id)
        if challenge.market_id == "":
            return json.dumps({"exists": False, "challenge": None}, sort_keys=True)
        return json.dumps(
            {"exists": True, "challenge": self._challenge_dict(challenge)},
            sort_keys=True,
        )

    @gl.public.view
    def get_contract_roles(self) -> str:
        return json.dumps(
            {
                "owner": format(self.owner),
            },
            sort_keys=True,
        )

    @gl.public.view
    def get_public_functions(self) -> str:
        return json.dumps(
            {
                "functions": [
                    {
                        "name": "submit_market",
                        "args": ["market_payload"],
                        "callers": "anyone",
                    },
                    {
                        "name": "refresh_market_probability",
                        "args": ["market_id"],
                        "callers": "anyone",
                    },
                    {
                        "name": "add_market_sources",
                        "args": ["market_id", "sources_payload"],
                        "callers": "owner only",
                    },
                    {
                        "name": "set_dispute_window_hours",
                        "args": ["hours"],
                        "callers": "owner only",
                    },
                    {
                        "name": "resolve_market",
                        "args": ["market_id"],
                        "callers": "anyone",
                    },
                    {
                        "name": "open_challenge",
                        "args": ["market_id", "challenge_payload"],
                        "callers": "anyone",
                    },
                    {
                        "name": "decide_challenge",
                        "args": ["market_id"],
                        "callers": "anyone",
                    },
                    {
                        "name": "finalize_market",
                        "args": ["market_id"],
                        "callers": "anyone",
                    },
                    {"name": "get_market", "args": ["market_id"], "callers": "anyone"},
                    {"name": "get_all_markets", "args": [], "callers": "anyone"},
                    {
                        "name": "get_resolution_packet",
                        "args": ["market_id"],
                        "callers": "anyone",
                    },
                    {
                        "name": "get_challenge",
                        "args": ["market_id"],
                        "callers": "anyone",
                    },
                    {
                        "name": "get_market_admission_policy",
                        "args": [],
                        "callers": "anyone",
                    },
                    {"name": "get_contract_roles", "args": [], "callers": "anyone"},
                    {"name": "get_public_functions", "args": [], "callers": "anyone"},
                ],
            },
            sort_keys=True,
        )

    @gl.public.view
    def get_market(self, market_id: str) -> str:
        market = self.approved_markets[market_id]
        if market.market_id == "":
            raise gl.vm.UserError("Unknown market")
        return json.dumps(self._market_dict(market), sort_keys=True)

    @gl.public.view
    def get_all_markets(self) -> str:
        markets: list[dict[str, typing.Any]] = []
        for market_number in range(1, int(self.market_count) + 1):
            market_id = f"gl-market-{market_number}"
            market = self.approved_markets[market_id]
            if market.market_id != "":
                markets.append(self._market_dict(market))
        return json.dumps(
            {
                "market_count": int(self.market_count),
                "markets": markets,
            },
            sort_keys=True,
        )

    @gl.public.view
    def get_resolution_packet(self, market_id: str) -> str:
        packet = self._resolution_packet_or_default(market_id)
        return json.dumps(self._resolution_packet_dict(packet), sort_keys=True)

    @gl.public.view
    def get_market_admission_policy(self) -> str:
        return json.dumps(
            {
                "categories": self._supported_categories(),
                "templates_by_category": self._supported_templates_by_category(),
                "primary_sources_by_category": self._supported_primary_sources_by_category(),
                "primary_source_consensus_minimum": 2,
                "dispute_window_hours": int(self.dispute_window_hours),
                "dispute_window_seconds": self._dispute_window_seconds(),
            },
            sort_keys=True,
        )

    def _dispute_window_seconds(self) -> int:
        return int(self.dispute_window_hours) * 3600

    def _require_supported_category(self, category: str) -> None:
        if category not in self._supported_categories():
            raise gl.vm.UserError("Unsupported launch category")

    def _require_supported_template(self, category: str, template_id: str) -> None:
        if template_id not in self._supported_templates_for_category(category):
            raise gl.vm.UserError("Unsupported launch template")

    def _require_supported_settlement_mode(self, settlement_mode: str) -> None:
        if settlement_mode != PRIMARY_SOURCE_CONSENSUS_SETTLEMENT:
            raise gl.vm.UserError("Unsupported settlement mode")

    def _require_supported_primary_sources(
        self,
        category: str,
        settlement_mode: str,
        primary_sources: list[str],
    ) -> None:
        if len(primary_sources) == 0:
            raise gl.vm.UserError("Missing GenLayer primary sources")

        allowed_sources = self._supported_primary_sources_for_category(category)
        for source in primary_sources:
            if source not in allowed_sources:
                raise gl.vm.UserError("Unsupported primary source")

        if len(primary_sources) < 2:
            raise gl.vm.UserError("Consensus markets need at least two primary sources")

    def _require_non_empty(self, value: str, label: str) -> None:
        if value.strip() == "":
            raise gl.vm.UserError(f"Missing {label}")

    def _supported_categories(self) -> list[str]:
        return [
            CRYPTO_CATEGORY,
            SPORTS_CATEGORY,
            POLITICS_CATEGORY,
            ECONOMY_CATEGORY,
        ]

    def _supported_templates_by_category(self) -> dict[str, list[str]]:
        return {
            CRYPTO_CATEGORY: self._supported_templates_for_category(CRYPTO_CATEGORY),
            SPORTS_CATEGORY: self._supported_templates_for_category(SPORTS_CATEGORY),
            POLITICS_CATEGORY: self._supported_templates_for_category(
                POLITICS_CATEGORY
            ),
            ECONOMY_CATEGORY: self._supported_templates_for_category(ECONOMY_CATEGORY),
        }

    def _supported_primary_sources_by_category(self) -> dict[str, list[str]]:
        return {
            CRYPTO_CATEGORY: self._supported_primary_sources_for_category(
                CRYPTO_CATEGORY
            ),
            SPORTS_CATEGORY: self._supported_primary_sources_for_category(
                SPORTS_CATEGORY
            ),
            POLITICS_CATEGORY: self._supported_primary_sources_for_category(
                POLITICS_CATEGORY
            ),
            ECONOMY_CATEGORY: self._supported_primary_sources_for_category(
                ECONOMY_CATEGORY
            ),
        }

    def _supported_templates_for_category(self, category: str) -> list[str]:
        if category == CRYPTO_CATEGORY:
            return [CRYPTO_THRESHOLD_TEMPLATE, CRYPTO_METRIC_TEMPLATE]
        if category == SPORTS_CATEGORY:
            return [SPORTS_MATCH_TEMPLATE, SPORTS_SEASON_TEMPLATE]
        if category == POLITICS_CATEGORY:
            return [POLITICS_OFFICIAL_ACTION_TEMPLATE]
        if category == ECONOMY_CATEGORY:
            return [ECONOMY_RELEASE_TEMPLATE]
        return []

    def _supported_primary_sources_for_category(self, category: str) -> list[str]:
        if category == CRYPTO_CATEGORY:
            return [COINGECKO_SOURCE, DEFILLAMA_SOURCE]
        if category == SPORTS_CATEGORY:
            return [
                OFFICIAL_LEAGUE_SOURCE,
                OFFICIAL_TOURNAMENT_SOURCE,
                BBC_SPORT_SOURCE,
            ]
        if category == POLITICS_CATEGORY:
            return [OFFICIAL_GOV_SOURCE, OFFICIAL_REGULATOR_SOURCE, REUTERS_SOURCE]
        if category == ECONOMY_CATEGORY:
            return [OFFICIAL_RELEASE_SOURCE, CENTRAL_BANK_SOURCE, REUTERS_SOURCE]
        return []

    def _normalize_source_list(self, value: typing.Any) -> list[str]:
        if not isinstance(value, list):
            raise gl.vm.UserError("Invalid primary source list")

        normalized: list[str] = []
        for item in value:
            if not isinstance(item, str):
                raise gl.vm.UserError("Invalid primary source list")
            source = item.strip()
            if source != "" and source not in normalized:
                normalized.append(source)
        return normalized

    def _normalize_generic_string_list(
        self, value: typing.Any, label: str
    ) -> list[str]:
        if not isinstance(value, list):
            raise gl.vm.UserError(f"Invalid {label}")

        normalized: list[str] = []
        for item in value:
            if not isinstance(item, str):
                raise gl.vm.UserError(f"Invalid {label}")
            cleaned = item.strip()
            if cleaned != "" and cleaned not in normalized:
                normalized.append(cleaned)
        return normalized

    def _encode_string_list(self, values: list[str]) -> str:
        return json.dumps(values, sort_keys=True)

    def _decode_stored_string_list(self, value: str) -> list[str]:
        if value.strip() == "":
            return []

        try:
            parsed = json.loads(value)
        except Exception:
            raise gl.vm.UserError("Stored source list is invalid")

        if not isinstance(parsed, list):
            raise gl.vm.UserError("Stored source list is invalid")

        normalized: list[str] = []
        for item in parsed:
            if isinstance(item, str) and item not in normalized:
                normalized.append(item)
        return normalized

    def _parse_json_object(self, payload: str, label: str) -> dict[str, typing.Any]:
        try:
            parsed = json.loads(payload)
        except Exception:
            raise gl.vm.UserError(f"Invalid {label}")

        if not isinstance(parsed, dict):
            raise gl.vm.UserError(f"Invalid {label}")
        return parsed

    def _normalize_probability_bps(self, value: typing.Any) -> u16:
        probability = int(value)
        if probability < 0 or probability > 10000:
            raise gl.vm.UserError("Invalid probability_bps")
        return u16(probability)

    def _normalize_confidence_bps(self, value: typing.Any) -> u16:
        confidence = int(value)
        if confidence < 0 or confidence > 10000:
            raise gl.vm.UserError("Invalid confidence_bps")
        return u16(confidence)

    def _current_tx_iso(self) -> str:
        current_time_iso = str(gl.message_raw["datetime"]).strip()
        self._require_non_empty(current_time_iso, "transaction datetime")
        self._iso_to_unix(current_time_iso)
        return current_time_iso

    def _require_supported_challenge_decision(
        self,
        challenge_decision: str,
        challenge_outcome: str,
        original_outcome: str,
    ) -> None:
        if challenge_decision == CHALLENGE_STATUS_UPHELD:
            if challenge_outcome != original_outcome:
                raise gl.vm.UserError("Upheld challenge must keep original outcome")
            return

        if challenge_decision == CHALLENGE_STATUS_OVERTURNED:
            if challenge_outcome not in [OUTCOME_CREATOR_WINS, OUTCOME_TAKER_WINS]:
                raise gl.vm.UserError(
                    "Overturned challenge must choose a binary winner"
                )
            if challenge_outcome == original_outcome:
                raise gl.vm.UserError(
                    "Overturned challenge must change the original outcome"
                )
            return

        if challenge_decision == CHALLENGE_STATUS_UNRESOLVABLE:
            if challenge_outcome != OUTCOME_UNRESOLVABLE:
                raise gl.vm.UserError("Unresolvable challenge must return UNRESOLVABLE")
            return

        raise gl.vm.UserError("Unsupported challenge decision")

    def _require_supported_resolution_result(
        self, resolution_status: str, resolution_outcome: str, settlement_hash: str
    ) -> None:
        self._require_non_empty(settlement_hash, "settlement hash")

        if resolution_status == RESOLUTION_STATUS_PROVISIONAL:
            if resolution_outcome not in [OUTCOME_CREATOR_WINS, OUTCOME_TAKER_WINS]:
                raise gl.vm.UserError(
                    "Provisional resolution must choose a binary winner"
                )
            return

        if resolution_status == RESOLUTION_STATUS_UNRESOLVABLE:
            if resolution_outcome != OUTCOME_UNRESOLVABLE:
                raise gl.vm.UserError(
                    "Unresolvable resolution must return UNRESOLVABLE"
                )
            return

        raise gl.vm.UserError("Unsupported resolution status")

    def _final_status_from_outcome(self, outcome: str) -> str:
        if outcome == OUTCOME_CREATOR_WINS:
            return MARKET_STATUS_FINAL_CREATOR_WINS
        if outcome == OUTCOME_TAKER_WINS:
            return MARKET_STATUS_FINAL_TAKER_WINS
        if outcome == OUTCOME_UNRESOLVABLE:
            return MARKET_STATUS_FINAL_REFUNDED
        raise gl.vm.UserError("Unsupported final outcome")

    def _iso_after(self, left_iso: str, right_iso: str) -> bool:
        return self._iso_to_unix(left_iso) > self._iso_to_unix(right_iso)

    def _iso_at_or_after(self, left_iso: str, right_iso: str) -> bool:
        return self._iso_to_unix(left_iso) >= self._iso_to_unix(right_iso)

    def _iso_to_unix(self, value: str) -> int:
        cleaned = value.strip()
        try:
            parsed = datetime.datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        except Exception:
            raise gl.vm.UserError("Invalid ISO datetime")

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=datetime.timezone.utc)
        return int(parsed.timestamp())

    def _shift_iso_seconds(self, base_iso: str, offset_seconds: int) -> str:
        shifted = datetime.datetime.fromtimestamp(
            self._iso_to_unix(base_iso) + offset_seconds,
            tz=datetime.timezone.utc,
        )
        return shifted.isoformat().replace("+00:00", "Z")

    def _is_final_market_status(self, status: str) -> bool:
        return status in [
            MARKET_STATUS_FINAL_CREATOR_WINS,
            MARKET_STATUS_FINAL_TAKER_WINS,
            MARKET_STATUS_FINAL_REFUNDED,
        ]

    def _resolution_packet_or_default(self, market_id: str) -> ResolutionPacket:
        return self.resolution_packets.get(
            market_id,
            ResolutionPacket(
                market_id="",
                outcome="",
                status="",
                evidence_summary="",
                evidence_urls="",
                confidence_bps=u16(0),
                settlement_hash="",
                dispute_deadline_iso="",
            ),
        )

    def _challenge_record_or_default(self, market_id: str) -> ChallengeRecord:
        return self.challenge_records.get(
            market_id,
            ChallengeRecord(
                market_id="",
                challenger=Address(ZERO_ADDRESS_HEX),
                opened_at_iso="",
                reason="",
                evidence_urls="",
                status="",
                decision_summary="",
                decision_evidence_urls="",
                decided_outcome="",
                confidence_bps=u16(0),
                decided_at_iso="",
            ),
        )

    def _market_dict(self, market: ApprovedMarket) -> dict[str, typing.Any]:
        packet = self._resolution_packet_or_default(market.market_id)
        challenge = self._challenge_record_or_default(market.market_id)
        market_dict = {
            "market_id": market.market_id,
            "creator": format(market.creator),
            "category": market.category,
            "template_id": market.template_id,
            "statement": market.statement,
            "cutoff_iso": market.cutoff_iso,
            "funding_deadline_iso": market.funding_deadline_iso,
            "resolution_rule": market.resolution_rule,
            "settlement_mode": market.settlement_mode,
            "status": market.status,
            "probability_bps": int(market.probability_bps),
            "probability_percent": int(market.probability_bps) / 100,
            "confidence_bps": int(market.confidence_bps),
            "quality_bond_usdc": int(market.quality_bond_usdc),
            "primary_sources": self._decode_stored_string_list(market.primary_sources),
            "supplemental_sources": self._decode_stored_string_list(
                market.supplemental_sources
            ),
        }
        if packet.market_id != "":
            market_dict["resolution_packet"] = self._resolution_packet_dict(packet)
        else:
            market_dict["resolution_packet"] = None
        if challenge.market_id != "":
            market_dict["challenge"] = self._challenge_dict(challenge)
        else:
            market_dict["challenge"] = None
        return market_dict

    def _resolution_packet_dict(
        self, packet: ResolutionPacket
    ) -> dict[str, typing.Any]:
        return {
            "market_id": packet.market_id,
            "outcome": packet.outcome,
            "status": packet.status,
            "evidence_summary": packet.evidence_summary,
            "evidence_urls": self._decode_stored_string_list(packet.evidence_urls),
            "confidence_bps": int(packet.confidence_bps),
            "settlement_hash": packet.settlement_hash,
            "dispute_deadline_iso": packet.dispute_deadline_iso,
        }

    def _challenge_dict(self, challenge: ChallengeRecord) -> dict[str, typing.Any]:
        return {
            "market_id": challenge.market_id,
            "challenger": format(challenge.challenger),
            "opened_at_iso": challenge.opened_at_iso,
            "reason": challenge.reason,
            "evidence_urls": self._decode_stored_string_list(challenge.evidence_urls),
            "status": challenge.status,
            "decision_summary": challenge.decision_summary,
            "decision_evidence_urls": self._decode_stored_string_list(
                challenge.decision_evidence_urls
            ),
            "decided_outcome": challenge.decided_outcome,
            "confidence_bps": int(challenge.confidence_bps),
            "decided_at_iso": challenge.decided_at_iso,
        }

    def _only_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Owner only")
