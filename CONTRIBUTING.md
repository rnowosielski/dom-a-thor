# Contributing

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Messages are checked locally (Husky) and in CI (pull requests and pushes to `main`).

### Format

```
<type>(<optional scope>): <short description>

<optional body>

<optional footer(s)>
```

### Types that affect the release

| Type | Semver bump | Example |
|------|-------------|---------|
| `fix` | patch | `fix(crop): ignore extradom plot gray fill` |
| `feat` | minor | `feat(extension): add projektyzwizja host` |
| `feat!` or footer `BREAKING CHANGE:` | major | `feat!: drop Node 18 support` |

Other allowed types (usually no release by themselves): `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, `test`.

### Examples

```
fix: read wizja plot dimensions from outer row
feat(extension): enable GUGiK parcel lookup
docs: document Chrome Web Store service account
chore(deps): bump vite to 7.1.14
```

Use the imperative mood in the subject (`fix`, not `fixed`). Keep the subject line at or under 100 characters.

### Pull requests

When using **squash merge**, make the PR title a valid conventional commit — it becomes the commit on `main` and drives versioning.

## Releases

After CI passes on `main`, semantic-release may create a new version, tag, GitHub Release, and Chrome Web Store upload. No manual tags are required for day-to-day releases.
