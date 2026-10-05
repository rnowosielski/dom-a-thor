# Agent instructions

Project-specific agent skills live in **`docs/agent-skills/`**. Read the relevant skill before starting related work.

## Skills

| Skill | Path | Use when |
|-------|------|----------|
| Dom-A-Thor crop fixtures | [docs/agent-skills/dom-a-thor-crop-fixtures/SKILL.md](docs/agent-skills/dom-a-thor-crop-fixtures/SKILL.md) | extradom plot looks wrong, add crop reference, fix extension crop, regenerate expected PNGs |

## Conventions

- Use [Conventional Commits](CONTRIBUTING.md) for all commits; CI runs commitlint and semantic-release on `main`.
- Edit skill content in `docs/agent-skills/<name>/` only.
- Cursor stubs in `.cursor/skills/` point here; keep them thin.
- After crop pipeline changes: `npm run test:run` and `npm run build`.

See [docs/agent-skills/README.md](docs/agent-skills/README.md) for adding new skills.
