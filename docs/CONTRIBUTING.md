# Contributing Guidelines

# Contributing to SmartH2wo

Thanks for contributing. This document covers the branching model and commit conventions used across the project. For the full team Git workflow, see [GIT_WORKFLOW.md](GIT_WORKFLOW.md), and for initial setup instructions, see [GITHUB_SETUP.md](GITHUB_SETUP.md).

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


---

# Git Setup

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


---

# Git Workflow

# Team Git Workflow Guide

Welcome to the team! This document outlines our standard Git workflow. Following these practices ensures a clean history, fewer merge conflicts, and a smooth review process for everyone.

---

## 1. The Core Workflow

Our team uses a **Feature Branch Workflow**. All new development happens in dedicated feature branches, not directly on the `main` branch.

### 1.1 Update Your Local `main`
Always start your work by ensuring your local `main` branch is up to date with the remote repository.

```bash
git checkout main
git pull origin main
```

### 1.2 Create a New Branch
Create a branch for your specific task from the updated `main` branch.

```bash
git checkout -b <type>/<short-description>
```

**Branch Naming Convention:**
- `feature/` - For new features or enhancements (e.g., `feature/login-page`)
- `fix/` - For bug fixes (e.g., `fix/header-alignment`)
- `docs/` - For documentation updates (e.g., `docs/api-readme`)
- `chore/` - For maintenance tasks, dependency updates, etc. (e.g., `chore/update-deps`)

---

## 2. Making and Committing Changes

Make your code changes, keeping them small, focused, and related to a single task.

### 2.1 Stage Your Changes
Check your modifications and stage the files you want to commit:

```bash
# See what files have been changed
git status

# Stage all changes
git add . 

# Or stage specific files (recommended)
git add path/to/file
```

### 2.2 Commit Your Changes
We use **Semantic Commit Messages**. This helps automate changelogs and makes our commit history readable.

```bash
git commit -m "type(scope): concise description"
```

**Examples:**
- `feat(auth): add google sign-in button`
- `fix(api): handle missing user metadata in webhook`
- `docs(readme): update local setup instructions`

*(Refer to our [CONTRIBUTING.md](CONTRIBUTING.md#commit-convention) for the full list of commit types).*

---

## 3. Syncing and Pushing

While you are working on your feature, other team members might be merging their changes into `main`. Keep your branch updated to prevent massive merge conflicts later.

### 3.1 Pull Latest `main` into Your Branch (Optional but Recommended)
If you've been working on a branch for a few days, bring in the latest changes from `main`:

```bash
# Make sure you are on your feature branch
git pull origin main
```
*Note: If there are merge conflicts, resolve them in your code editor, stage the resolved files (`git add .`), and commit them.*

### 3.2 Push Your Branch
Push your branch to the remote repository so it's backed up and ready for a Pull Request:

```bash
# The -u flag links your local branch to the remote branch
git push -u origin <your-branch-name>
```
*For subsequent pushes on the same branch, simply use `git push`.*

---

## 4. Pull Requests (PRs) & Code Review

Code goes into `main` strictly through Pull Requests on GitHub.

1. **Open a PR:** Go to GitHub and open a Pull Request from your feature branch against `main`.
2. **Describe Your Changes:** Provide a clear title and description. What does this PR do? What issue does it fix? Include screenshots if you changed the UI.
3. **Request Reviews:** Assign at least one team member to review your code.
4. **Address Feedback:** If reviewers request changes, make the updates locally, commit them, and push. The PR will update automatically.

### Merging
Once the PR is approved and all automated checks pass:
- **Squash and Merge:** We recommend using "Squash and Merge" in GitHub to keep the `main` history clean (squashing your branch's commits into one single commit on `main`).
- **Clean up:** Delete the feature branch on GitHub after merging to keep the repository tidy.

---

## 5. Troubleshooting & Tips

### Accidental Commit to `main`
If you made changes on `main` but haven't pushed yet:
```bash
git checkout -b feature/my-new-branch
# Your changes are now safely on the new branch!
```

### Modifying the Last Commit
If you forgot to add a file or made a typo in your last commit message (and haven't pushed yet):
```bash
git add <forgotten-file>
git commit --amend --no-edit  # Keeps the same message
# OR
git commit --amend -m "new(message): updated commit message"
```

### Stuck in a Merge Conflict?
Don't panic!
1. Open the conflicting files in your code editor.
2. Look for `<<<<<<< HEAD` (your changes) and `>>>>>>> main` (incoming changes) markers.
3. Keep the code you want, and delete the Git markers.
4. Run `git add <resolved-file>` and `git commit` to finish resolving the conflict.


---

# Backend Git Setup

# Pushing SmartH2wo Backend to GitHub

## Step 1: Create GitHub Repository

1. Go to **https://github.com/new**
2. **Repository name**: `smarth2wo-backend`
3. **Description**: `ML-powered FastAPI backend for SmartH2wo water dispenser management`
4. **Visibility**: Choose `Public` or `Private`
5. **DO NOT** initialize with README (we already have one)
6. Click **Create repository**

---

## Step 2: Initialize & Push Locally

### In Terminal/PowerShell (in the `smarth2wo-backend` folder):

```bash
# Navigate to backend directory
cd smarth2wo-backend

# Initialize git repository (if not already done)
git init

# Add all files to staging area
git add .

# Create initial commit
git commit -m "Initial commit: FastAPI backend with maintenance prediction and anomaly detection"

# Add remote repository (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/smarth2wo-backend.git

# Verify remote was added correctly
git remote -v
```

### Push to GitHub:

```bash
# For the first time, use:
git branch -M main
git push -u origin main

# After that, just use:
git push
```

---

## Step 3: Verify on GitHub

1. Go to **https://github.com/USERNAME/smarth2wo-backend**
2. You should see all your code files
3. ✅ Check that `venv/` folder is **NOT** uploaded (thanks to .gitignore)
4. ✅ Check that `.env` file is **NOT** uploaded

---

## Step 4: Set Up Git Credentials (If Asked)

If GitHub asks for credentials:

### Option A: Use GitHub Personal Access Token (Recommended)
1. Go to **https://github.com/settings/tokens**
2. Click **Generate new token (classic)**
3. Select scopes: `repo`, `write:packages`, `read:packages`
4. Copy the token
5. Use this token as password when prompted

### Option B: Use SSH (Advanced)
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub
# Copy content from ~/.ssh/id_ed25519.pub
# Go to https://github.com/settings/keys and add it
```

---

## 📝 Regular Workflow After Setup

Every time you make changes:

```bash
# See what changed
git status

# Add changes
git add .

# Commit with meaningful message
git commit -m "Add new feature: user authentication"

# Push to GitHub
git push
```

---

## 🔗 Link to Backend Repository

Once pushed, share this link with your team:
```
https://github.com/USERNAME/smarth2wo-backend
```

---

## 💡 Tips

- **Never commit** sensitive data:
  - ❌ API keys
  - ❌ Database passwords
  - ❌ `.env` files
  - ✅ Use `.env.example` instead

- **Good commit messages** help track changes:
  - ✅ `git commit -m "Add maintenance prediction endpoint"`
  - ❌ `git commit -m "updates"`

- **Keep it organized**:
  - `main` branch = production-ready code
  - `develop` branch = development work
  - Feature branches = `feature/new-feature-name`

---

## 🆘 Troubleshooting

### Remote already exists
```bash
git remote remove origin
git remote add origin https://github.com/USERNAME/smarth2wo-backend.git
```

### Large files in venv uploaded
```bash
# Remove from git history (advanced)
git filter-branch --tree-filter 'rm -rf venv' --prune-empty HEAD
git push origin --force --all
```

### Forgot to add .env to .gitignore
```bash
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

---

## ✅ Verification Checklist

- [ ] Repository created on GitHub
- [ ] Code pushed successfully
- [ ] `venv/` folder NOT in GitHub
- [ ] `.env` file NOT in GitHub
- [ ] `README.md` visible on GitHub
- [ ] All files visible except ignored ones
