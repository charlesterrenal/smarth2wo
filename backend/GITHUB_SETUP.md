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
