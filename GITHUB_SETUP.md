# SmartH2wo Monorepo - GitHub Setup Guide

This is now a **monorepo** containing both frontend and backend in one repository.

---

## What's Inside

```
smarth2wo-monorepo/
├── frontend/          React Dashboard (npm run dev)
├── backend/           FastAPI Backend (python main.py)
├── README.md          Project documentation
└── .gitignore         Ignores node_modules, venv, .env, etc.
```

---

## Step 1: Initialize Git Repository

```bash
cd smarth2wo-monorepo

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "chore: initial monorepo commit - frontend + backend"

# Rename branch to main (if needed)
git branch -M main
```

---

## Step 2: Connect to GitHub

1. **Create repository on GitHub**: https://github.com/new
   - **Repository name**: `smarth2wo` (or `smarth2wo-monorepo`)
   - **Description**: Smart water dispenser management system - full stack
   - **Visibility**: Public or Private
   - **DO NOT** initialize with README

2. **Link remote repository** (replace USERNAME):

```bash
git remote add origin https://github.com/USERNAME/smarth2wo.git
```

3. **Verify remote**:

```bash
git remote -v
# Should show:
# origin  https://github.com/USERNAME/smarth2wo.git (fetch)
# origin  https://github.com/USERNAME/smarth2wo.git (push)
```

---

## Step 3: Push to GitHub

```bash
# Push to GitHub
git push -u origin main

# Future pushes (after this):
git push
```

**First time only** - You may be prompted for credentials:
- Use your GitHub username and **personal access token** (not password)
- Or set up SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

## Verify on GitHub

1. Visit: `https://github.com/USERNAME/smarth2wo`
2. Check files are visible:
   - frontend/ folder
   - backend/ folder
   - README.md
   - .gitignore
3. Verify ignored files are **NOT** uploaded:
   - frontend/node_modules
   - backend/venv
   - .env files

---

## Git Workflow (Going Forward)

Every time you make changes:

```bash
# See what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "feat: add user authentication to backend"

# Push to GitHub
git push
```

---

## Commit Message Convention

Keep commit messages clear and organized:

| Type | Example |
|------|---------|
| `feat:` | `feat: add maintenance prediction API` |
| `fix:` | `fix: correct water level calculation` |
| `docs:` | `docs: update setup instructions` |
| `style:` | `style: format code to meet standards` |
| `refactor:` | `refactor: reorganize API endpoints` |
| `test:` | `test: add unit tests for prediction` |
| `chore:` | `chore: update dependencies` |

---

## Branching Strategy (Optional but Recommended)

For team collaboration:

```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Work on feature
# ... make changes ...

# Commit
git add .
git commit -m "feat: implement new feature"

# Push feature branch
git push origin feature/new-feature-name

# Create Pull Request on GitHub
# Then merge to main
```

Main branches to use:
- `main` - Production-ready code
- `develop` - Development/staging (optional)
- `feature/*` - Individual features

---

## Troubleshooting

### Error: "fatal: not a git repository"
```bash
cd smarth2wo-monorepo
git status  # Should show git info now
```

### Error: "remote already exists"
```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/smarth2wo.git
```

### Need to update repository name on GitHub?
```bash
# Change local remote
git remote set-url origin https://github.com/USERNAME/new-name.git

# Push again
git push -u origin main
```

### Accidentally committed `.env` file?
```bash
git rm --cached .env
git commit -m "remove .env from tracking"
git push
```

---

## Useful Git Commands

```bash
# View commit history
git log --oneline

# View changes
git diff

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# See all branches
git branch -a

# Delete local branch
git branch -d feature-name
```

---

## Team Collaboration

**Recommended workflow for teams:**

1. Always pull latest before starting work:
   ```bash
   git pull origin main
   ```

2. Create feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

3. Make changes and commit

4. Push and create Pull Request on GitHub

5. Team reviews and merges

This prevents conflicts and keeps code quality high!

---

## You're All Set!

Your monorepo is now ready for GitHub!

**Repository Link**: `https://github.com/USERNAME/smarth2wo`

**Next Steps:**
- Share the link with your team
- Start collaborating!
- Use issues for feature requests and bug reports

---

**Questions?** Check the individual READMEs:
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
