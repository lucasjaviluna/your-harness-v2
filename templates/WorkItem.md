# Work Item — <Work Item Title>

**Work Item ID:** WI-XXXX  
**Version:** 1.0.0  
**Status:** Draft  
**Release:** <Release>

---

# Purpose

Describe the engineering objective of this Work Item.

A Work Item represents the smallest governed unit of engineering work derived from an Intent.

---

# Origin

## Intent

Describe the user Intent that originated this Work Item.

---

# Type

Select one of the following:

- Feature
- Bug Fix
- Refactoring
- Documentation
- Testing
- Investigation
- Technical Debt
- Infrastructure
- Other

---

# Priority

Select one:

- Critical
- High
- Medium
- Low

---

# Description

Provide a detailed description of the engineering work.

The description should explain **what** needs to be accomplished without prescribing **how** it must be implemented.

---

# Objectives

List the expected outcomes.

Example:

- Define the required behavior.
- Produce the corresponding Specification.
- Implement the approved solution.
- Verify the expected results.

---

# Scope

Describe what is included in this Work Item.

---

# Out of Scope

Explicitly describe what is excluded.

Clearly defining boundaries helps prevent scope creep.

---

# Deliverables

List the expected engineering artifacts.

Examples:

- Specification
- Source code
- Documentation
- Tests
- Configuration
- ADR
- RFC

---

# Dependencies

List dependencies on other Work Items or project artifacts.

If none exist, state:

> None.

---

# Acceptance Criteria

Define the conditions required for completion.

Example:

- [ ] Specification approved.
- [ ] Implementation completed.
- [ ] Tests passing.
- [ ] Documentation updated.
- [ ] Review completed.

---

# Risks

Describe known risks associated with this Work Item.

Include possible mitigation strategies when appropriate.

---

# Related Documents

List related project artifacts.

Example:

- YH-VISION-001
- YH-CHARTER-001
- YH-GOV-001
- YH-YDL-001
- YH-SPEC-XXXX

---

# Notes

Optional section.

Include implementation notes, references or additional information useful for contributors.

---

# Lifecycle

The standard lifecycle of a Work Item is:

```text
Draft
    ↓
Specified
    ↓
In Review
    ↓
Approved
    ↓
In Progress
    ↓
Verified
    ↓
Completed
```

Each state transition should be traceable and governed according to the project's engineering process.
