# Project Scripts

Shared scripts for development workflow.

## Git Hooks

### Installation

To install git hooks for this project:

```bash
./scripts/install-hooks.sh
```

This will install:
- **pre-commit hook**: Runs linting and formatting checks before each commit

### Pre-commit Hook

The pre-commit hook automatically runs quality checks on both frontend and backend code:

**Frontend checks:**
- Prettier formatting (auto-fixes)
- ESLint linting
- TypeScript type checking

**Backend checks:**
- Ruff linting
- Black formatting (auto-fixes)

### Skipping Hooks

If you need to skip the pre-commit hook (not recommended):

```bash
git commit --no-verify -m "your message"
```

### Manual Hook Updates

If the hook scripts are updated, re-run the installation:

```bash
./scripts/install-hooks.sh
```

## Notes

- Hooks are stored in `scripts/` and copied to `.git/hooks/` during installation
- `.git/hooks/` is not tracked by git, so each developer must run `install-hooks.sh`
- Consider adding `./scripts/install-hooks.sh` to your onboarding documentation
