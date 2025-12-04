# bare

Bare worktree display and management tool.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/jgeschwendt/bare/main/install.sh | bash
```

## Usage

```bash
bare start -p 4444
```

## Configuration

Configure file sharing between worktrees from the web UI. Each repository can specify:

- **Symlink**: Files/directories to symlink from `__main__` (shared across all worktrees)
- **Copy**: Files/directories to copy from `__main__` (independent copies per worktree)

Configuration is stored in `~/.bare-config/worktree-config.json`.

When creating a new worktree, bare will automatically:
1. Symlink files specified in symlink array (e.g., `.env`, `.claude/`)
2. Copy files specified in copy array (e.g., `.env.example`)
3. Use hardlinks for `node_modules` (instant, zero disk space)
4. Run delta install to catch dependency changes
