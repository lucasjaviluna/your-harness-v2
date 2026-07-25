# YDS — Your Documentation Standard

**Document ID:** YH-YDS-001  
**Version:** 1.0.0  
**Status:** Accepted  
**Release:** v0.1.0 Foundation

---

# Purpose

Your Documentation Standard (YDS) defines the structure, conventions and quality requirements for all official documentation produced within the Your Harness project.

The objective of YDS is to ensure that documentation remains consistent, understandable and maintainable throughout the project's lifecycle.

---

# Scope

YDS applies to every version-controlled document, including but not limited to:

- Vision documents
- Standards
- ADRs
- RFCs
- Specifications
- Playbooks
- Guides
- Templates
- Technical documentation

---

# Documentation Principles

Every official document shall be:

- Clear
- Concise
- Consistent
- Traceable
- Versioned
- Reviewable

Documentation is considered a first-class engineering artifact.

---

# Standard Structure

Unless there is a justified reason, official documents should follow the structure below.

```text
Title

Metadata

Purpose

Scope

Content

Closing Statement
```

Additional sections may be included when required by the document type.

---

# Metadata

Every normative document shall include the following metadata.

```text
Document ID
Version
Status
Release
```

Example:

```text
Document ID: YH-YDS-001
Version: 1.0.0
Status: Accepted
Release: v0.1.0 Foundation
```

---

# Writing Guidelines

Documentation should:

- Use simple and precise language.
- Avoid ambiguity.
- Prefer short paragraphs.
- Use descriptive headings.
- Keep terminology consistent with YDL.

Normative statements should use clear language.

Examples:

- SHALL
- SHOULD
- MAY

---

# Versioning

Official documents shall be versioned.

Changes should preserve traceability whenever practical.

Major revisions should be documented through the project's engineering process.

---

# References

Documents may reference other official artifacts using their Document ID.

Example:

```text
See YH-CHARTER-001.
```

This ensures stable references even if files are reorganized.

---

# Naming Conventions

Document names should:

- Be descriptive.
- Use Pascal Case where appropriate.
- Avoid abbreviations unless officially defined.
- Match the terminology established by YDL.

---

# Review

Documentation should be reviewed before being considered complete.

Reviews should verify:

- Accuracy
- Consistency
- Readability
- Compliance with YDS

---

# Compliance

Every official document shall comply with:

- Vision
- Engineering Charter
- Governance
- YDL
- YDS

---

# Closing Statement

Documentation is an engineering artifact.

Its quality directly influences communication, maintainability and the long-term evolution of Your Harness.
