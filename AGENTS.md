# Project Guidance

## Authority for changes

This repository evolves beyond its initial implementation plan. When deciding what behavior to preserve or change, use this order of authority:

1. The user's current request or an explicitly approved task brief.
2. Current application behavior and automated tests, except where the current request intentionally changes them.
3. Current durable project documentation and architectural decisions.
4. Archived implementation specs as historical context only.

Archived specs describe completed milestones. They are not perpetual requirements, and their old acceptance criteria and non-goals must not block a newly requested change. When current instructions intentionally supersede an archived decision, implement the new direction and update any affected current documentation or tests.

## Version 1 history

The original implementation plan is archived at `docs/archive/v1-implementation-spec.md`. Use it to understand the initial gameplay slice and design intent, not as the source of truth for all future work.
