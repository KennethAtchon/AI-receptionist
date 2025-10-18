# Repository Migration Guide

## Moving AI Receptionist SDK to Separate Repository

This guide walks through migrating the SDK from the monorepo to a dedicated repository.

---

## Why Migrate?

- ✅ **Clear purpose**: Dedicated repo signals this is a standalone SDK
- ✅ **Independent versioning**: SDK and CRM can evolve separately
- ✅ **Better discoverability**: `ai-receptionist-sdk` vs nested in CRM repo
- ✅ **Cleaner CI/CD**: No mixed workflows
- ✅ **Community engagement**: Separate issues, PRs, discussions
- ✅ **npm publishing**: Cleaner release process

---

## Step-by-Step Migration

### Step 1: Prepare Current Codebase

Before migrating, ensure everything is committed:

```bash
cd packages/ai-receptionist
git status  # Should be clean
git log --oneline  # Review history you want to preserve
```

### Step 2: Create New Repository on GitHub

1. Go to: https://github.com/new
2. Repository name: `ai-receptionist-sdk` (or `ai-receptionist`)
3. Description: `AI-powered receptionist SDK for voice, SMS, and email automation`
4. Public/Private: Your choice (recommend Public for SDK)
5. **Do NOT** initialize with README (we'll push existing)
6. Create repository

### Step 3: Extract Package with Git History (Option A - Recommended)

This preserves commit history for the SDK:

```bash
# From the ROOT of your Loctelli repo
cd /c/Users/kenne/Documents/Workplace/Loctelli

# Install git-filter-repo (better than filter-branch)
# Windows: Download from https://github.com/newren/git-filter-repo
# Or use pip: pip install git-filter-repo

# Clone your repo to a temporary location
cd ..
git clone Loctelli ai-receptionist-sdk-temp
cd ai-receptionist-sdk-temp

# Extract only the ai-receptionist package with history
git filter-repo --path packages/ai-receptionist/ --path-rename packages/ai-receptionist/:

# This rewrites history to make ai-receptionist the root

# Update remote to point to new repo
git remote remove origin
git remote add origin https://github.com/loctelli/ai-receptionist-sdk.git

# Push to new repo
git push -u origin main
```

### Step 4: Clean Up New Repository

After pushing, clean up the new repo:

```bash
cd ai-receptionist-sdk-temp

# Move files from nested structure to root (if needed)
# The filter-repo should have already done this

# Verify structure
ls -la
# Should see: src/, examples/, package.json, README.md, etc.

# Update package.json paths if needed
# Update any relative paths in configs
```

### Step 5: Update package.json in New Repo

```json
{
  "name": "@loctelli/ai-receptionist",
  "version": "1.0.0",
  "description": "AI-powered receptionist SDK for voice, SMS, and email automation",
  "repository": {
    "type": "git",
    "url": "https://github.com/loctelli/ai-receptionist-sdk.git"
  },
  "bugs": {
    "url": "https://github.com/loctelli/ai-receptionist-sdk/issues"
  },
  "homepage": "https://github.com/loctelli/ai-receptionist-sdk#readme"
}
```

### Step 6: Setup GitHub Actions for Publishing

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm test
      - run: npm run build

      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - run: npm ci
      - run: npm run build
      - run: npm test
```

### Step 7: Create Release Script

Add to `package.json`:

```json
{
  "scripts": {
    "release:patch": "npm version patch && git push --follow-tags",
    "release:minor": "npm version minor && git push --follow-tags",
    "release:major": "npm version major && git push --follow-tags"
  }
}
```

### Step 8: Update CRM Project to Use npm Package

In your CRM project (`Loctelli`):

```bash
cd /c/Users/kenne/Documents/Workplace/Loctelli

# Remove the local package
rm -rf packages/ai-receptionist

# Update package.json
# Change from workspace to npm dependency
```

**Before** (in CRM's `package.json`):
```json
{
  "dependencies": {
    "@loctelli/ai-receptionist": "workspace:*"
  }
}
```

**After** (once published):
```json
{
  "dependencies": {
    "@loctelli/ai-receptionist": "^1.0.0"
  }
}
```

For **development** (before publishing):
```json
{
  "dependencies": {
    "@loctelli/ai-receptionist": "file:../ai-receptionist-sdk"
  }
}
```

### Step 9: Publish to npm

```bash
cd ai-receptionist-sdk-temp

# First time setup
npm login

# Publish (or use GitHub Actions)
npm publish --access public

# Or create a GitHub release (triggers auto-publish)
gh release create v1.0.0 --title "v1.0.0" --notes "Initial release"
```

### Step 10: Update Documentation

**New SDK repo README** should focus on:
- Installation via npm
- Quick start
- API documentation
- Contributing guidelines

**CRM repo** can reference the SDK:
```markdown
## AI Features

This project uses [@loctelli/ai-receptionist](https://github.com/loctelli/ai-receptionist-sdk)
for AI-powered communication.
```

---

## Alternative: Simpler Approach (Fresh Start)

If git history isn't critical:

```bash
# 1. Create new repo on GitHub
# 2. Copy files to new directory
mkdir -p /c/Users/kenne/Documents/Workplace/ai-receptionist-sdk
cp -r packages/ai-receptionist/* /c/Users/kenne/Documents/Workplace/ai-receptionist-sdk/

# 3. Initialize new git repo
cd /c/Users/kenne/Documents/Workplace/ai-receptionist-sdk
git init
git add .
git commit -m "Initial commit: AI Receptionist SDK v1.0.0"

# 4. Push to GitHub
git remote add origin https://github.com/loctelli/ai-receptionist-sdk.git
git branch -M main
git push -u origin main
```

---

## Checklist

Before migration:
- [ ] All changes committed in current repo
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Documentation is up to date

After migration:
- [ ] New repo created on GitHub
- [ ] Code pushed to new repo
- [ ] GitHub Actions configured
- [ ] npm package published (or ready to publish)
- [ ] CRM project updated to use npm package
- [ ] Old package removed from monorepo
- [ ] README updated in both repos
- [ ] CHANGELOG started in new repo

---

## Publishing Workflow (After Migration)

### Regular Development
```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push

# CI runs automatically
```

### Releasing New Version
```bash
# Option 1: Via npm scripts
npm run release:patch  # 1.0.0 -> 1.0.1
npm run release:minor  # 1.0.0 -> 1.1.0
npm run release:major  # 1.0.0 -> 2.0.0

# Option 2: Via GitHub releases
gh release create v1.1.0 --title "v1.1.0" --notes "New features..."
# This triggers automatic npm publish via GitHub Actions
```

---

## Benefits Summary

After migration, you'll have:

✅ **Clean separation**: SDK development separate from CRM
✅ **Professional appearance**: Dedicated repo for SDK
✅ **Easy onboarding**: New contributors see only SDK code
✅ **Independent releases**: Version SDK without affecting CRM
✅ **Better CI/CD**: Focused workflows, faster builds
✅ **Community building**: Dedicated issues, discussions, stars
✅ **Flexibility**: Can open-source SDK while keeping CRM private

---

## Need Help?

If you run into issues during migration:

1. **Backup first**: `git clone Loctelli Loctelli-backup`
2. **Test in temp directory**: Don't modify original until verified
3. **Reach out**: Create issue in new repo or ask for help

---

## Timeline Recommendation

**Day 1**: Steps 1-4 (Extract and push to new repo)
**Day 2**: Steps 5-7 (Setup CI/CD and configurations)
**Day 3**: Steps 8-10 (Update CRM, publish, documentation)

**Total time**: 1-2 days for clean migration

---

Good luck! 🚀
