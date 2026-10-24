# Data handling checks

The compliance command supports an accountable data owner. It does not certify legal compliance, infer consent, set a statutory retention period, authorise disclosure or delete anything. Rule sources checked 24 October 2026.

| Check | Recorded evidence and scope | Source |
|---|---|---|
| Purpose | Missing dataset purpose flags a review. The business defines a lawful purpose. | [NZ principle 1](https://www.privacy.org.nz/privacy-principles/1/) |
| Accuracy | Personal-data sources that never arrived or exceeded the business's fresh_days threshold are flagged. Required-field and uniqueness checks can block a preparation run. Thresholds are business policy, not statutory deadlines. | [NZ principle 8](https://www.privacy.org.nz/privacy-principles/8/), [AU APP 10](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-10-app-10-quality-of-personal-information) |
| Retention | A missing or reached retention_review date on personal data triggers a review. The owner determines retention duties and exceptions. No automatic deletion. | [NZ principle 9](https://www.privacy.org.nz/privacy-principles/9/), [AU APP 11](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information) |
| Ownership | A blank owner flags responsibility that must be assigned. | Internal data policy, not a claim of law. |

AU principles apply where the business is an APP entity. OTHER jurisdiction needs its own rules before operational use; references in the base are NZ and AU examples. Source quality tests cannot establish whether a real-world fact is accurate. The owner must review context, purpose and relevance.

The run reconciliation document records checks, source batches, operator labels and output provenance. Review the full result before use. Dataset labels and recorded actors are not authenticated access controls. This base has no multiuser authorisation system.

Retention scope includes raw batches, prepared results, backups and generated documents. Address all copies under the business policy. Do not use the audit trail to justify indefinite retention of personal information.
