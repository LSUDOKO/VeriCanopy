# 13 · Business and Market Readiness

> Rule: no market-size or revenue figures in public materials unless sourced and verified at the time of writing. Use `[SOURCE NEEDED]` placeholders until then.

## 1. Positioning
**VeriCanopy is a verification layer, not a new registry.** It plugs into existing standards and marketplaces and makes their forest credits continuously verified, provable, and self-correcting.

One-liner for buyers: *"Know your offsets are real today, not just on the day you bought them."*

## 2. Customers and value
| Segment | Pain | Value from VeriCanopy | Willingness to pay signal |
|---|---|---|---|
| Corporate buyers / ESG teams | Reputational and legal risk from bad offsets | Continuous integrity + alerts + provable evidence | Already pay rating firms (e.g. Sylvera subscriptions) |
| Registries / standards | Costly, slow, human-only verification; credibility crisis | Cheaper continuous dMRV; double-registration guard | Integrity is now a market requirement (e.g. ICVCM CCP labels `[VERIFY]`) |
| Marketplaces / exchanges | Need quality signals per credit | API + on-chain integrity state | Exchanges already integrate ratings (e.g. Xpansiv CBL shows Sylvera ratings) |
| Honest project developers | Good projects priced like bad ones | Provable high-integrity premium | Pay for verification today |
| Insurers / buffer managers | Reversal risk hard to price | Reversal detection + risk data | Carbon insurance is an emerging category `[VERIFY]` |
| NGOs, journalists, researchers | Can't easily audit credits | Free public explorer + challenge game | Free tier (mission + data network effect) |

## 3. Business model
1. **Verification fee** per project-period (paid by developer or registry); priced per hectare tier.
2. **Buyer subscription**: portfolio monitoring, alerts, reports, API (tiers: Starter / Pro / Enterprise).
3. **Integration licence** for registries and exchanges (on-chain or API integration).
4. **Data products**: anonymised integrity datasets for researchers (free/academic) and insurers (paid).
5. Protocol fees are **not** token-based; no speculative token. Stakes/bonds are security deposits.

## 4. Go-to-market
- **Phase 1 (0–6 months):** open-source core, public explorer with demo + a few volunteer projects; publish methodology and backtests against published REDD+ evaluations; academic partnership (IEEE community, universities).
- **Phase 2 (6–18 months):** pilots with 1–2 project developers and one marketplace/registry; buyer portfolio pilots with 3–5 companies; apply for climate-tech grants (e.g. ESA, EU Horizon, Gitcoin/ReFi grants `[VERIFY current programmes]`).
- **Phase 3:** standards engagement to recognise VeriCanopy as an approved dMRV tool; expand to other project types (ARR, IFM, methane).

## 5. Compliance and legal checklist (before real launch)
- [ ] Legal opinion on whether credit tokens are regulated instruments in target jurisdictions (EU MiCA, India, US).
- [ ] Registry terms: tokenising credits issued by a registry may require its permission. Many registries restrict third-party tokenisation `[VERIFY each registry's policy]`.
- [ ] Data licences: Copernicus (free, attribution), UMD/Hansen (CC BY 4.0 `[VERIFY]`), GEDI/MODIS (NASA open), **WDPA (non-commercial restrictions `[VERIFY]`)**, Earth Engine commercial terms.
- [ ] Privacy: GDPR/DPDP for user accounts and witness photos (P2).
- [ ] Defamation safeguards: methodology disclosure, right of reply for developers before public "Impaired" labels in production.
- [ ] Article 6 / corresponding adjustments awareness for compliance-grade credits `[VERIFY]`.

## 6. Moats
1. **Verifiable trust:** competitors can't easily retrofit proofs onto proprietary models without exposing or committing to them.
2. **Data network effect:** every challenge and resolution improves models and the evidence base.
3. **Neutrality:** open methodology and open challenges make it acceptable to registries that don't want a competitor's black box.

## 7. Risks
| Risk | Mitigation |
|---|---|
| Registries refuse tokenisation | Offer API-only verification mode (no tokens); integrity attestations still on-chain |
| Methodology disputes | Publish, peer-review, governance process, challenge game |
| Satellite limits (clouds, small plots) | SAR, multiple sources, uncertainty in score, minimum project size |
| Cost of proofs | Tiny model; batch proofs; L2 deployment |
| Legal claims from developers | "Model estimate" framing, right of reply, legal review |

## 8. Metrics to track (once live)
Projects monitored, hectares, credits covered, reversals detected and covered, challenges opened and upheld, time-to-detect reversal, buyer retention.
