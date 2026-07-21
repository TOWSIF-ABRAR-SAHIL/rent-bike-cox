# Contributing

## Branch Protection

`main` is protected. No direct pushes or force pushes allowed.
Always create a feature branch and open a pull request.

## Commit Messages

Format: `type: description`

Allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`

- Description starts lowercase
- Subject line max 72 characters

Examples:
```
feat: add bike listing endpoint
fix: correct payment amount calculation
docs: update README setup instructions
```

## Setting Up Commit Hooks

Run once after clone:

```bash
git config core.hooksPath .githooks
```

This enables the commit-msg hook that enforces the message format.
