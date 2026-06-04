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
