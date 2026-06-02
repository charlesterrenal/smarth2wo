# Contributing to SmartH2wo

Thanks for contributing. This document covers the branching model and commit conventions used across the project. For the full git/GitHub workflow, see [GITHUB_SETUP.md](GITHUB_SETUP.md).

## Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Make your changes and commit using the convention below.
3. Push the branch:
   ```bash
   git push origin feature/your-feature
   ```
4. Open a Pull Request against `main` with a clear summary of what changed and why.

## Commit Convention

Use a short type prefix followed by a concise description in the imperative mood.

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no code change |
| `refactor:` | Code restructuring with no behavior change |
| `test:` | Adding or updating tests |
| `chore:` | Tooling, build, or maintenance |

Examples:

```
feat(esp32): cancel checkout during QR
fix(backend): handle missing PayMongo metadata in webhook
docs(readme): rewrite for clarity and move details into SETUP.md
```

A scope in parentheses (`esp32`, `backend`, `frontend`, `docs`, etc.) is encouraged when the change is localized.

## Pull Requests

- Keep PRs focused and reasonably small.
- Include a short summary of the change and the motivation.
- Note any manual steps required (database migrations, env var changes, hardware reflashing).
- Link related issues if applicable.

## Code Style

- Backend: follow standard Python conventions (PEP 8). Keep handlers thin and put logic in service modules.
- Frontend: keep components small and colocated by feature where possible. Use Tailwind utilities consistently.
- Firmware: keep one responsibility per function, prefer the existing UI primitives (`uiHeader`, `uiCenterText`, `uiVolumeRow`, etc.) over ad-hoc drawing code, and avoid blocking the main loop for long periods.

## Secrets

Never commit `.env` files or credentials. Use `.env.example` files as a template and document any new variables there.
