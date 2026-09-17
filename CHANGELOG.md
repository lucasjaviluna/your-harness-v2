# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by **Keep a Changelog** and the project follows **Semantic Versioning**.

---

## v0.1.0 — Governed Change Foundation

Primera versión estable acotada de `your-harness`: una base CLI gobernada, auditable y reproducible para trabajar con Changes SDD bajo control humano.

### Incluido

- Fachada `yh change` con inspección, propuesta, revisión, aprobación HITM, Apply, recovery e idempotencia.
- Materialización OpenSpec con staging atómico, digest, rollback y auditoría durable.
- Flujo WorkItem → ejecución → Evidence/Verification → CompletionAuthorization.
- Persistencia operacional local versionada, con compatibilidad legacy y rechazo de formatos futuros.
- Guardrails de workspace, capabilities, red, secretos y confirmaciones; Pi habilita únicamente `read` bajo política explícita.
- Contratos JSON, taxonomía de códigos de salida, CI en Node 22.19/24 e instalación reproducible desde artefactos empaquetados.

### Límites explícitos

- `plugin`, `skill`, `agent`, `workflow`, `spec` y `mcp` no forman parte de la superficie estable.
- No hay transporte MCP real, ejecución general de tools, steps `command`/`script` ni lock multiproceso.
- `TaskOrchestrator` y la sincronización completa de Specifications/Tasks quedan para iteraciones posteriores.

### Riesgos aceptados

- El lock multiproceso queda fuera de v0.1.0. Digest, atomicidad y recovery HITM mitigan conflictos, sin sustituir un lock.

---

# [0.1.0] - Foundation

## Added

### Repository

- Initial repository structure.
- Project documentation index.
- Foundation documentation.
- Contribution guidelines.
- MIT License.
- Global `.gitignore`.

### Foundation

- Project Vision.
- Engineering Charter.
- Governance model.

### Standards

- YDL (Your Domain Language).
- YDS (Your Documentation Standard).
- YGov (Your Governance Standard).

### Architecture

- ADR-000 — Project Vision.
- ADR-001 — Specification Engine Abstraction.

### Engineering

- RFC-001 — Engineering Workflow.

### Templates

- Work Item template.
- Specification template.
- ADR template.
- RFC template.

### Project Management

- PROJECT_STATE.
- INDEX.
- CHANGELOG.

---

# Versioning Policy

Your Harness follows Semantic Versioning.

```
MAJOR.MINOR.PATCH
```

Where:

- **MAJOR** — Incompatible engineering or platform changes.
- **MINOR** — New capabilities added in a backward-compatible manner.
- **PATCH** — Corrections, documentation updates and compatible improvements.

---

# Release Types

## Foundation

Establishes engineering principles and repository structure.

---

## Feature

Introduces new platform capabilities.

---

## Improvement

Enhances existing functionality without changing its purpose.

---

## Fix

Corrects defects while preserving expected behavior.

---

## Documentation

Introduces or improves engineering documentation.

---

# Guidelines

Every release should:

- Include a version number.
- Describe the engineering changes.
- Reference significant ADRs and RFCs when applicable.
- Maintain chronological order with the newest release first.

---

# Notes

This changelog records project evolution at the release level.

Detailed engineering decisions remain documented in ADRs, RFCs and other project artifacts.
