# Cursor skills (stubs)

Cursor discovers skills here. **Canonical content lives in `docs/agent-skills/`.**

```
.cursor/skills/              ← Cursor entry (YAML frontmatter + link)
docs/agent-skills/           ← edit skills here (all agents)
AGENTS.md / CLAUDE.md        ← index for other tools
```

## Adding a skill

1. Add full skill under `docs/agent-skills/<name>/`.
2. Copy `.cursor/skills/_template/SKILL.md` to `.cursor/skills/<name>/SKILL.md` and update paths + frontmatter `description`.
3. Register in `AGENTS.md` and `CLAUDE.md`.

## Current stubs

| Stub | Canonical |
|------|-----------|
| `dom-a-thor-crop-fixtures/` | `docs/agent-skills/dom-a-thor-crop-fixtures/` |

Personal Cursor-only skills: `~/.cursor/skills/` (not in this repo).

Do not use `~/.cursor/skills-cursor/` — Cursor built-ins only.
