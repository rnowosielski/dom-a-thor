# Agent skills (canonical)

**Single source of truth** for project skills used by Cursor, Claude Code, Copilot, and other agents.

There is no universal skill format. Each tool has its own entry point, but the **content lives here**.

## Layout

```
docs/agent-skills/
  README.md
  <skill-name>/
    SKILL.md       # full instructions (edit this)
    reference.md   # optional deep reference

.cursor/skills/<skill-name>/SKILL.md   # Cursor stub → points here
AGENTS.md                                # index for any agent
CLAUDE.md                                # Claude Code entry
```

## Adding a new skill

1. Create `docs/agent-skills/<skill-name>/SKILL.md` with the full workflow.
2. Add optional `reference.md` for details.
3. Add a Cursor stub at `.cursor/skills/<skill-name>/SKILL.md` (copy from `_template/`).
4. Register the skill in `AGENTS.md` and `CLAUDE.md`.
5. Do **not** duplicate long content in `.cursor/skills/` — only the stub.

## Tool entry points

| Tool | Reads |
|------|--------|
| Cursor | `.cursor/skills/*/SKILL.md` (stub loads canonical docs) |
| Claude Code | `CLAUDE.md` → `docs/agent-skills/` |
| GitHub Copilot / others | `AGENTS.md` → `docs/agent-skills/` |
| Humans | This directory |

Personal cross-repo skills still belong in `~/.cursor/skills/` (Cursor only).

## Skills

| Skill | When to use |
|-------|-------------|
| [dom-a-thor-crop-fixtures](dom-a-thor-crop-fixtures/SKILL.md) | extradom plot crops, fixtures, extension crop bugs |
