# Git hooks (tracked)

These hooks are version-controlled so every clone can share them. Git does **not**
use them automatically — each clone must be pointed at this directory **once**.

## Activate in a new clone

```bash
git config core.hooksPath .githooks
```

That's it. Run it once per clone (it's a local git setting, not carried over on clone).

## What's here

- **pre-commit** — runs [`gitleaks`](https://github.com/gitleaks/gitleaks) on staged
  changes and blocks the commit if a secret is detected.

## Requirement: gitleaks binary

The pre-commit hook needs `gitleaks` on your `PATH` (or at `~/.local/bin/gitleaks`).
If it's missing the hook prints a notice and lets the commit through, so install it:

```bash
# macOS (Apple Silicon) — release binary (brew also works if perms allow)
mkdir -p ~/.local/bin
VER=$(curl -s https://api.github.com/repos/gitleaks/gitleaks/releases/latest | grep -m1 '"tag_name"' | sed -E 's/.*"v?([0-9.]+)".*/\1/')
curl -sL "https://github.com/gitleaks/gitleaks/releases/download/v${VER}/gitleaks_${VER}_darwin_arm64.tar.gz" -o /tmp/gitleaks.tar.gz
tar -xzf /tmp/gitleaks.tar.gz -C ~/.local/bin gitleaks && chmod +x ~/.local/bin/gitleaks
```

## Bypass (emergencies only)

```bash
git commit --no-verify
```
