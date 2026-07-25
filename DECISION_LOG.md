# Decision Log

**Project:** Your Harness  
**Current Release:** v0.1.0 Foundation

---

# Purpose

This document provides a chronological record of significant engineering decisions made throughout the evolution of Your Harness.

Unlike ADRs, which describe individual architectural decisions in detail, the Decision Log offers a concise, high-level history of project decisions and milestones.

It serves as an index for understanding why the project evolved in a particular direction.

---

# Decision Format

Each decision should include:

- Identifier
- Date
- Status
- Category
- Summary
- Related Artifact(s)

---

# Decisions

## D-0001

| Property | Value                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date     | 2026-07                                                                                                                                                     |
| Status   | Accepted                                                                                                                                                    |
| Category | Project                                                                                                                                                     |
| Summary  | Your Harness is established as an open-source engineering platform focused on improving the software engineering process rather than code generation alone. |

### Related Artifacts

- Vision
- ADR-000

---

## D-0002

| Property | Value                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| Date     | 2026-07                                                                             |
| Status   | Accepted                                                                            |
| Category | Engineering                                                                         |
| Summary  | Specification-Driven Development is adopted as the primary engineering methodology. |

### Related Artifacts

- Engineering Charter
- RFC-001

---

## D-0003

| Property | Value                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| Date     | 2026-07                                                                                                        |
| Status   | Accepted                                                                                                       |
| Category | Governance                                                                                                     |
| Summary  | Human in the Middle is established as a mandatory engineering principle wherever governance requires approval. |

### Related Artifacts

- Governance
- YGov
- Engineering Charter

---

## D-0004

| Property | Value                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Date     | 2026-07                                                                                                             |
| Status   | Accepted                                                                                                            |
| Category | Domain                                                                                                              |
| Summary  | The engineering domain adopts Intent as the origin of work and Work Item as the smallest governed engineering unit. |

### Related Artifacts

- YDL
- RFC-001

---

## D-0005

| Property | Value                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date     | 2026-07                                                                                                                                                                                |
| Status   | Accepted                                                                                                                                                                               |
| Category | Architecture                                                                                                                                                                           |
| Summary  | The platform shall interact with specification frameworks through a Specification Engine abstraction, allowing implementations to be replaced without affecting the engineering model. |

### Related Artifacts

- ADR-001

---

## D-0006

| Property | Value                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Date     | 2026-07                                                                                                |
| Status   | Accepted                                                                                               |
| Category | Documentation                                                                                          |
| Summary  | All normative documentation shall comply with YDS and become version-controlled engineering artifacts. |

### Related Artifacts

- YDS

---

# Decision Status

Allowed values:

- Proposed
- Accepted
- Superseded
- Deprecated

---

# Maintenance

This document should be updated whenever:

- An ADR is accepted.
- A significant engineering decision is made.
- A foundational project direction changes.

Minor implementation decisions should not be recorded here.

---

# Notes

The Decision Log provides a historical overview of the project's evolution.

Detailed technical reasoning remains documented in the corresponding ADRs and RFCs.
