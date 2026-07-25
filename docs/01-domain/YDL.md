# YDL — Your Domain Language

**Document ID:** YH-YDL-001  
**Version:** 1.0.0  
**Status:** Accepted  
**Release:** v0.1.0 Foundation

---

# Purpose

Your Domain Language (YDL) defines the official vocabulary of Your Harness.

Its purpose is to establish a common language shared by contributors, documentation, specifications and software components.

Every official artifact shall use the terminology defined in this document.

---

# Objectives

YDL exists to:

- Eliminate ambiguity.
- Promote consistent communication.
- Establish a ubiquitous language for the project.
- Improve traceability across engineering artifacts.
- Provide a stable semantic foundation for the platform.

---

# Core Concepts

## Intent

An **Intent** represents the user's desired outcome expressed in natural language.

It captures **what** the user wants to achieve without prescribing **how** it will be implemented.

An Intent is the starting point of every engineering activity.

---

## Work Item

A **Work Item** is the smallest governed engineering unit derived from an Intent.

Each Work Item shall:

- Have a clear objective.
- Be independently reviewable.
- Be traceable.
- Produce one or more engineering artifacts.

Examples include:

- Feature
- Bug Fix
- Refactoring
- Technical Debt
- Documentation
- Testing
- Investigation

---

## Specification

A **Specification** describes the expected behavior of a Work Item before implementation begins.

Specifications are implementation-independent and constitute the primary engineering artifact from which implementation is derived.

---

## Review

A **Review** is the formal evaluation of an engineering artifact.

Its purpose is to verify correctness, clarity, consistency and compliance with project standards.

---

## Approval

An **Approval** is an explicit authorization allowing a Work Item to progress to the next engineering stage.

Approvals are required whenever defined by project governance.

---

## Artifact

An **Artifact** is any version-controlled output produced during the engineering process.

Examples include:

- Documentation
- Specifications
- Source code
- Tests
- Diagrams
- ADRs
- RFCs

---

## Capability

A **Capability** is a reusable engineering function provided by the platform.

Capabilities describe what the platform can do, independently of how the functionality is implemented.

---

## Engine

An **Engine** is a platform component responsible for executing a specific engineering responsibility.

Engines coordinate workflows but remain independent of concrete implementations whenever possible.

---

## Plugin

A **Plugin** extends platform functionality through predefined extension points.

Plugins implement stable contracts without modifying the platform core.

---

## Provider

A **Provider** integrates an external system or service with Your Harness.

Providers encapsulate vendor-specific behavior behind platform abstractions.

---

# Engineering Terms

## Architecture Decision Record (ADR)

A permanent record documenting an accepted architectural decision.

---

## Request for Comments (RFC)

A proposal describing a significant engineering change before implementation.

---

## Release

A versioned collection of reviewed and approved engineering artifacts.

---

## Increment

A completed unit of engineering work delivered during a release.

---

# Naming Rules

To preserve consistency across the project:

- Each concept shall have a single official name.
- Synonyms shall not be used in normative documentation.
- New concepts shall be added to YDL before being adopted elsewhere.

---

# Deprecated Terms

The following terms are deprecated within Your Harness documentation.

| Deprecated   | Preferred |
| ------------ | --------- |
| Mission      | Work Item |
| Generic Task | Work Item |

---

# Closing Statement

A shared language is the foundation of a shared understanding.

YDL establishes the vocabulary that enables contributors, documentation and software to communicate consistently throughout the lifecycle of Your Harness.
