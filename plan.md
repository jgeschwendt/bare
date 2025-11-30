# Bare - Multi-Repository Worktree Manager

**Project Goal**: Build a production-ready tool to manage multiple git repositories using the bare worktree pattern, with fast dependency installation via hardlink caching.

---

## Architecture

### Core Concept Change

**Old (bear-kit POC)**:

- Single repository management
- Run `bearkit dev` from inside a repo
- UI shows one repo at a time
- `BEARKIT_CWD` environment variable tracks repo

**New (bare)**:

- **Multi-repository management**
- Run `bare dev` once globally
- Dashboard shows all managed repos
- Add/clone repos from UI
- Each repo shows its worktrees
- Repository registry at `~/.bare/repos.json`

---

## Data Model

### Global Repository Registry

**Location**: `~/.bare-bones/repos.json`

```json
{
  "repositories": [
    {
      "id": "uuid-1",
      "name": "bare-test",
      "path": "/Users/jlg/GitHub/jgeschwendt/bare-test",
      "remoteUrl": "git@github.com:jgeschwendt/bare-test.git",
      "addedAt": "2025-11-29T...",
      "lastAccessed": "2025-11-29T...",
      "type": "turborepo",
      "config": {
        "symlinks": [".env", ".claude"],
        "packageManager": "pnpm",
        "editor": "code",
        "autoInstall": true
      }
    }
  ]
}
```

### Per-Repository Config

**Location**: `<repo>/.bare/bare.config.json`

```json
{
  "symlinks": [".env", ".claude", ".vscode"],
  "packageManager": "pnpm",
  "autoInstall": true,
  "editor": "code"
}
```

### Dependency Management

**No separate cache needed** - just copy directly from `__main__`:

1. Install dependencies in `__main__/node_modules`
2. When creating new worktree, copy: `cp -al __main__/node_modules worktree/node_modules`
3. Run `pnpm install` in worktree (fast - only installs deltas)

**Why it's fast**:

- Hardlinks (`cp -al`) = instant copy, no disk space
- `pnpm install` only updates what changed
- Each worktree can have different dependencies if needed

---

## User Interface Design

### Main Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Bare - Worktree Manager                     [+ Add]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📦 bare-test                    turborepo      [⋯]    │
│  ~/GitHub/jgeschwendt/bare-test                        │
│  ├─ __main__ (main) ● clean                           │
│  ├─ feature-auth (feature-auth)                       │
│  └─ hotfix-cors (hotfix-cors) 2↑ 1↓                   │
│      [Open] [Delete]                                   │
│                                                         │
│  📦 jlg.io                       next.js        [⋯]    │
│  ~/GitHub/jgeschwendt/jlg.io                           │
│  ├─ __main__ (main) ● clean                           │
│  └─ redesign (redesign) dirty                         │
│      [Open] [Delete]                                   │
│                                                         │
│  [+ Clone Repository]                                  │
│  [+ Add Existing Repository]                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Repository Card (Collapsed)

```
┌─────────────────────────────────────────────────────────┐
│  📦 bare-test                    turborepo      [⋯]    │
│  ~/GitHub/jgeschwendt/bare-test                        │
│  3 worktrees • Last accessed 5m ago            [▼]     │
└─────────────────────────────────────────────────────────┘
```

### Repository Card (Expanded)

```
┌─────────────────────────────────────────────────────────┐
│  📦 bare-test                    turborepo      [⋯]    │
│  ~/GitHub/jgeschwendt/bare-test                        │
│                                                         │
│  [New Worktree]                                         │
│                                                         │
│  Worktrees (3)                                          │
│  ├─ __main__ (main) ● clean                           │
│  │    [Open in Code]                                   │
│  ├─ feature-auth (feature-auth)                       │
│  │    [Open] [Delete]                                  │
│  └─ hotfix-cors (hotfix-cors) 2↑ 1↓ dirty             │
│       [Open] [Delete]                                  │
│                                                         │
│  [▲] Collapse                                          │
└─────────────────────────────────────────────────────────┘
```

### Clone Repository Dialog

```
┌─────────────────────────────────────────────────────────┐
│  Clone Repository                              [✕]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Repository URL *                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ git@github.com:jgeschwendt/example.git          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  Target Directory *                                     │
│  ┌─────────────────────────────────────────────────┐  │
│  │ /Users/jlg/GitHub/jgeschwendt/example           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ☑ Install dependencies after clone                    │
│                                                         │
│  [Cancel]                              [Clone]         │
└─────────────────────────────────────────────────────────┘
```

### Clone Progress (Streaming)

```
┌─────────────────────────────────────────────────────────┐
│  Cloning example...                            [✕]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Cloning into bare repository '.bare'...        │  │
│  │ remote: Counting objects: 100% (50/50)         │  │
│  │ Receiving objects: 100% (50/50), 12.5 KiB      │  │
│  │ Created .git file                               │  │
│  │ Preparing worktree (checking out 'main')       │  │
│  │ Installing dependencies in __main__...          │  │
│  │ __main__: Progress: 50/100 packages             │  │
│  │ __main__: Done                                  │  │
│  │ Setting up cache...                             │  │
│  │ ✓ Repository cloned successfully!              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [Close]                                               │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

```
/Users/jlg/GitHub/jgeschwendt/bare/
├── app/
│   ├── api/
│   │   ├── repos/
│   │   │   ├── route.ts              # GET: list, POST: add, DELETE: remove
│   │   │   └── [id]/
│   │   │       ├── worktrees/
│   │   │       │   └── route.ts      # GET: list, POST: create, DELETE: delete
│   │   │       └── settings/
│   │   │           └── route.ts      # GET/PATCH: repo settings
│   │   └── clone/
│   │       └── route.ts              # POST: clone (SSE streaming)
│   ├── layout.tsx                    # Root layout, dark theme
│   ├── page.tsx                      # Main dashboard
│   └── globals.css                   # Tailwind + custom styles
├── components/
│   ├── repository-card.tsx           # Repo card (collapsed/expanded)
│   ├── worktree-list.tsx             # List of worktrees for a repo
│   ├── add-repository-dialog.tsx     # Dialog to add/clone repos
│   ├── clone-progress.tsx            # Streaming clone progress
│   ├── create-worktree-form.tsx      # Form to create new worktree
│   └── repository-settings.tsx       # Repo settings dialog
├── lib/
│   ├── repos.ts                      # Repository registry CRUD
│   ├── git.ts                        # Git operations (from bear-kit)
│   ├── install.ts                    # Dependency install & caching
│   ├── detect.ts                     # Detect repo type (turborepo, nx, etc)
│   └── config.ts                     # Config management
├── cli/
│   └── index.ts                      # CLI tool (bare clone, bare dev, etc)
├── bin/
│   └── main.js                       # CLI entry point
├── install.sh                        # Curl installer script
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── README.md
└── plan.md                           # This file
```

---

## API Design

### `/api/repos`

**GET** - List all repositories

```typescript
Response: Repository[]
```

**POST** - Add existing repository

```typescript
Request: {
  path: string;
}
Response: Repository;
```

**DELETE** - Remove repository

```typescript
Request: {
  id: string;
}
Response: {
  success: boolean;
}
```

### `/api/repos/[id]/worktrees`

**GET** - Get worktrees for repository

```typescript
Response: {
  worktrees: Worktree[];
  branches: string[];
}
```

**POST** - Create worktree (SSE streaming)

```typescript
Request: { path: string, branch?: string }
Response: Server-Sent Events stream
Events: { message: string } | { error: string } | { complete: true }
```

**DELETE** - Delete worktree(s)

```typescript
Request: { paths: string[] }
Response: { success: boolean, deleted: number }
```

### `/api/clone`

**POST** - Clone repository (SSE streaming)

```typescript
Request: {
  url: string,
  targetDir: string,
  install?: boolean
}
Response: Server-Sent Events stream
Events: { message: string } | { error: string } | { complete: true, repoId: string }
```

---

## CLI Commands

```bash
# Start the dashboard (localhost:3000)
bare dev

# Start on different port
bare dev -p 3001

# Clone a repository (can also do from UI)
bare clone <url> [directory]
bare clone --no-install <url> [directory]

# Add existing repository to dashboard
bare add <path>

# List managed repositories
bare list

# Remove repository from dashboard
bare remove <path-or-id>

# Build dashboard for production
bare build

# Start production dashboard
bare start
```

---

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/jgeschwendt/bare/main/install.sh | bash
```

### Manual Install

```bash
# Clone the repository
git clone https://github.com/jgeschwendt/bare.git ~/.bare-bones/bare

# Install dependencies and build
cd ~/.bare-bones/bare
pnpm install
pnpm build

# Link the CLI globally
pnpm link --global
```

### What the Installer Does

1. **Detects your environment**

   - Operating system (macOS, Linux, Windows/WSL)
   - Node.js version (requires 18+)
   - Available package managers (pnpm preferred)

2. **Clones bare repository**

   - Clones to `~/.bare-bones/bare`
   - Installs dependencies with pnpm
   - Builds Next.js app
   - Links CLI globally

3. **Sets up directories**

   - Creates `~/.bare-bones/` directory
   - Initializes `~/.bare-bones/repos.json`

4. **Verifies installation**
   - Checks `bare --version` works
   - Optionally starts dashboard

### install.sh Script

```bash
#!/usr/bin/env bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Installing bare..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required but not installed.${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required (you have $(node -v))${NC}"
    exit 1
fi

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found, installing...${NC}"
    npm install -g pnpm
fi

# Create directories
echo "Setting up ~/.bare-bones directory..."
mkdir -p ~/.bare-bones

# Clone bare repository
echo "Cloning bare repository..."
if [ -d ~/.bare-bones/bare ]; then
    echo "Updating existing installation..."
    cd ~/.bare-bones/bare
    git pull origin main
else
    git clone https://github.com/jgeschwendt/bare.git ~/.bare-bones/bare
    cd ~/.bare-bones/bare
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build Next.js app
echo "Building bare..."
pnpm build

# Link globally
echo "Linking CLI..."
pnpm link --global

# Initialize repos.json if it doesn't exist
if [ ! -f ~/.bare-bones/repos.json ]; then
    echo '{"repositories":[]}' > ~/.bare-bones/repos.json
fi

# Verify installation
if command -v bare &> /dev/null; then
    echo -e "${GREEN}✓ bare installed successfully!${NC}"
    echo ""
    echo "Get started:"
    echo "  bare dev          # Start the dashboard"
    echo "  bare clone <url>  # Clone a repository"
    echo "  bare --help       # Show all commands"
    echo ""

    # Ask to start dashboard
    read -p "Start bare dashboard now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bare dev
    fi
else
    echo -e "${RED}✗ Installation failed${NC}"
    exit 1
fi
```

### Uninstall

```bash
# Unlink global CLI
cd ~/.bare-bones/bare
pnpm unlink --global

# Remove installation
rm -rf ~/.bare-bones
```

---

## Implementation Phases

### Phase 1: Foundation ⭐ **START HERE**

**Goal**: Get basic multi-repo management working

- [ ] Initialize Next.js project
- [ ] Set up repository registry (`~/.bare-bones/repos.json`)
- [ ] Implement `lib/repos.ts` (CRUD operations)
- [ ] Build main dashboard UI
- [ ] Repository card component (collapsed/expanded)
- [ ] Add existing repository functionality

**Deliverable**: Dashboard that shows multiple repositories

---

### Phase 2: Repository Registry & Dashboard

**Goal**: Manage multiple repositories

- [ ] Set up repository registry (`~/.bare-bones/repos.json`)
- [ ] Implement `lib/types.ts` with interfaces
- [ ] Implement `lib/repos.ts` (CRUD operations)
- [ ] Build main dashboard UI (`app/page.tsx`)
- [ ] Repository card component
- [ ] API route: `/api/repos` (GET, POST, DELETE)
- [ ] Test: Add bare-test to registry, see it in UI

**Deliverable**: Dashboard shows multiple repositories

---

### Phase 3: Worktree Management

**Goal**: Create and delete worktrees from UI

- [ ] Copy git operations from bear-kit (`lib/git.ts`)
- [ ] API route: `/api/repos/[id]/worktrees` (GET)
- [ ] Worktree list component
- [ ] API route: `/api/repos/[id]/worktrees` (POST, DELETE)
- [ ] Create worktree form with streaming progress
- [ ] Delete worktree functionality
- [ ] Open in editor (VS Code, Cursor)

**Deliverable**: Full worktree CRUD from UI

---

### Phase 3: Clone Functionality

**Goal**: Clone new repositories from UI

- [ ] Clone dialog UI
- [ ] API route: `/api/clone` (SSE streaming)
- [ ] Clone progress display
- [ ] Auto-detect repo type after clone
- [ ] Add cloned repo to registry

**Deliverable**: Clone repos from UI with progress

---

### Phase 4: Dependency Management

**Goal**: Fast install with caching

- [ ] Detect package manager (npm, pnpm, yarn, bun)
- [ ] Implement hardlink copying (`lib/install.ts`)
  - Update `__main__` with `pnpm install`
  - Copy `__main__/node_modules` to worktree using `cp -al`
  - Run `pnpm install` in worktree (fast - only deltas)
- [ ] Stream install progress to UI

**Deliverable**: Fast worktree creation with cached deps

---

### Phase 5: Monorepo Support ⭐ **PRIORITY**

**Goal**: Turborepo/monorepo support (for bare-test)

- [ ] Detect turborepo (`turbo.json`)
- [ ] Detect pnpm workspaces (`pnpm-workspace.yaml`)
- [ ] Detect nx, lerna
- [ ] Install at workspace root only
- [ ] Handle monorepo-specific install strategy
- [ ] Test with bare-test turborepo

**Deliverable**: Works with turborepo/monorepos

---

### Phase 7: Configuration & Settings

**Goal**: Per-repo settings and global config

- [ ] Symlink management UI
- [ ] Editor preference (VS Code, Cursor, etc.)
- [ ] Package manager override
- [ ] Auto-install toggle
- [ ] Cache management (view size, clear cache)
- [ ] Repository settings dialog

**Deliverable**: Full configuration UI

---

### Phase 8: Polish & Production

**Goal**: Production-ready quality

- [ ] Error handling and recovery
- [ ] Loading states and skeletons
- [ ] Empty states
- [ ] Keyboard shortcuts
- [ ] Git status indicators (clean, dirty, ahead/behind)
- [ ] Last accessed timestamps
- [ ] Search/filter repositories
- [ ] CLI tool polish

**Deliverable**: Production-ready app

---

### Phase 9: Distribution & Publishing

**Goal**: Make bare installable via curl script

- [ ] Create `install.sh` script (see Installation section)
- [ ] Set up package.json for git installation
  - Package name: `bare` (private, no npm publish)
  - Bin entry: `bare` command
  - Build scripts for Next.js
- [ ] Test installation locally with `pnpm link`
- [ ] Create install.sh that clones from GitHub
- [ ] Host install.sh in repository root
- [ ] Test curl install: `curl -fsSL https://raw.githubusercontent.com/jgeschwendt/bare/main/install.sh | bash`
- [ ] Create GitHub releases with changelog
- [ ] Update README with installation instructions

**Deliverable**: Public installation via curl script

**package.json Configuration**:

```json
{
  "name": "bare",
  "version": "1.0.0",
  "description": "Multi-repository worktree manager with fast dependency caching",
  "private": true,
  "bin": {
    "bare": "./bin/main.js"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "keywords": [
    "git",
    "worktree",
    "monorepo",
    "turborepo",
    "dependency-management"
  ]
}
```

**Publishing Steps**:

```bash
# Build for production
pnpm build

# Test locally
pnpm link --global
bare --version

# Create GitHub release
git tag v1.0.0
git push origin v1.0.0

# Update install.sh if needed
git add install.sh
git commit -m "Update installer"
git push origin main

# Test installation
curl -fsSL https://raw.githubusercontent.com/jgeschwendt/bare/main/install.sh | bash
```

---

## Key Technical Decisions

### Repository Detection

Automatically detect repository type:

```typescript
async function detectRepoType(path: string): Promise<RepoType> {
  if (await exists(join(path, "turbo.json"))) return "turborepo";
  if (await exists(join(path, "nx.json"))) return "nx";
  if (await exists(join(path, "lerna.json"))) return "lerna";
  if (await exists(join(path, "pnpm-workspace.yaml"))) return "workspace";
  return "standard";
}
```

### Package Manager Detection

Auto-detect based on lock files:

```typescript
async function detectPackageManager(path: string): Promise<PackageManager> {
  if (await exists(join(path, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(join(path, "yarn.lock"))) return "yarn";
  if (await exists(join(path, "bun.lockb"))) return "bun";
  if (await exists(join(path, "package-lock.json"))) return "npm";
  return "pnpm"; // default
}
```

### Monorepo Install Strategy

For turborepo/monorepo:

```typescript
async function installDependencies(repo: Repository, worktreePath: string) {
  const mainPath = join(repo.path, "__main__");

  // Always install/update in __main__ first
  await runInstall(mainPath, repo.config.packageManager);

  if (repo.type === "turborepo" || repo.type === "workspace") {
    // Monorepo: node_modules at root, no copying needed
    return;
  }

  // Standard: copy from __main__ using hardlinks, then install deltas
  const mainNodeModules = join(mainPath, "node_modules");
  const worktreeNodeModules = join(worktreePath, "node_modules");

  // Copy with hardlinks (instant, no disk space)
  await execAsync(`cp -al "${mainNodeModules}" "${worktreeNodeModules}"`);

  // Install only what changed (fast)
  await runInstall(worktreePath, repo.config.packageManager);
}
```

### Symlink Management

Create symlinks from `__main__` to new worktree:

```typescript
async function createSymlinks(repo: Repository, worktreePath: string) {
  const mainPath = join(repo.path, "__main__");

  for (const symlinkPath of repo.config.symlinks) {
    const source = join(mainPath, symlinkPath);
    const target = join(worktreePath, symlinkPath);

    if (await exists(source)) {
      await execAsync(`rm -rf "${target}"`);
      await execAsync(`ln -s "${source}" "${target}"`);
    }
  }
}
```

---

## Testing Strategy

### Test with bare-test (Turborepo)

1. **Add bare-test to dashboard**

   - Path: `/Users/jlg/GitHub/jgeschwendt/bare-test`
   - Verify turborepo detection
   - Show existing worktrees (if any)

2. **Create new worktree**

   - Create worktree `test-feature`
   - Verify install happens at root only
   - Verify worktree is functional

3. **Symlink test**

   - Create `.env` in `__main__`
   - Create worktree
   - Verify `.env` is symlinked

4. **Delete worktree**
   - Delete `test-feature`
   - Verify cleanup

### Test with simple Next.js app

1. **Clone from UI**

   - Clone a simple Next.js repo
   - Verify install with caching
   - Check cache created

2. **Create multiple worktrees**
   - Create 2-3 worktrees
   - Verify fast install (~10-20s)
   - Verify hardlink caching works

---

## Success Metrics

### Global Config Location

All bare-bones data stored in `~/.bare-bones/`:

- `~/.bare-bones/repos.json` - Repository registry
- `~/.bare-bones/config.json` - Global settings (future)

**Phase 1 Complete When**:

- ✅ Dashboard shows multiple repositories
- ✅ Can add existing repo to dashboard
- ✅ Repository cards expand/collapse
- ✅ Shows repo name, path, type

**MVP Complete When**:

- ✅ Can clone new repos from UI
- ✅ Can create worktrees with streaming progress
- ✅ Can delete worktrees
- ✅ Can open worktrees in editor
- ✅ Dependencies install with caching
- ✅ Works with turborepo (bare-test)
- ✅ Symlinks configured and working

**Production Ready When**:

- ✅ All error cases handled gracefully
- ✅ Loading states for all async operations
- ✅ Settings UI for configuration
- ✅ Cache management UI
- ✅ Keyboard shortcuts
- ✅ Documentation complete
- ✅ Tested with multiple repo types

---

---

## Implementation Guide for Claude Code

### Quick Start Instructions

You are implementing a multi-repository worktree manager. Start here:

**Step 1: Initialize Project** (5 min)

```bash
cd /Users/jlg/GitHub/jgeschwendt/bare
pnpm create next-app@latest . --typescript --tailwind --app --no-src
# Answer: Yes to all prompts
```

**Step 2: Create CLI Structure** (10 min)

```bash
mkdir -p cli bin
touch cli/index.ts
touch bin/main.js
```

**Step 3: Create CLI Tool** (20 min)

- Create `bin/main.js` - Shebang and import
- Create `cli/index.ts` - Commander.js with `bare start` command
- Update `package.json` with bin entry
- See "CLI Implementation" section below

**Step 4: Test CLI** (5 min)

```bash
pnpm link --global
bare start
# Should start Next.js dev server on localhost:3000
```

**Step 5: Commit** (2 min)

```bash
git add .
git commit -m "feat: initial Next.js setup with CLI"
```

**Total Phase 1 Time: ~40 minutes**

---

### Core Types (Copy These Exactly)

```typescript
// lib/types.ts
export interface Repository {
  id: string; // UUID
  name: string; // Repo name (from directory)
  path: string; // Absolute path to repo
  remoteUrl?: string; // Git remote URL
  addedAt: string; // ISO timestamp
  lastAccessed: string; // ISO timestamp
  type?: "turborepo" | "nx" | "lerna" | "workspace" | "standard";
}

export interface Worktree {
  path: string; // Relative path from repo root
  head?: string; // Git HEAD hash
  branch?: string; // refs/heads/branch-name
  bare?: boolean; // Is bare repo
  detached?: boolean; // Detached HEAD
}

export interface RegistryFile {
  repositories: Repository[];
}
```

---

### Critical Implementation Details

#### 1. CLI Entry Point (`bin/main.js`)

**Must have**:

```javascript
#!/usr/bin/env node
import("../cli/index.js");
```

#### 2. CLI Tool (`cli/index.ts`)

**Must have**:

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { spawn } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bareRoot = dirname(__dirname); // Go up to project root

const program = new Command();

program
  .name("bare")
  .description("Multi-repository worktree manager")
  .version("1.0.0");

program
  .command("start")
  .description("Start the bare dashboard")
  .option("-p, --port <port>", "port to run on", "3000")
  .action((options) => {
    const args = ["dev", bareRoot];

    if (options.port) {
      args.push("-p", options.port);
    }

    const child = spawn("next", args, {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error("Failed to start:", error);
      process.exit(1);
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  });

program.parse();
```

#### 3. package.json Updates

**Add these fields**:

```json
{
  "name": "bare",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "bare": "./bin/main.js"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

#### 4. Repository Registry (`lib/repos.ts`) - **PHASE 2**

**Must haves**:

```typescript
import { Repository, RegistryFile } from "./types";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const REGISTRY_DIR = join(homedir(), ".bare-bones");
const REGISTRY_FILE = join(REGISTRY_DIR, "repos.json");

// Initialize registry if it doesn't exist
export async function initRegistry(): Promise<void> {
  await mkdir(REGISTRY_DIR, { recursive: true });
  try {
    await readFile(REGISTRY_FILE);
  } catch {
    await writeFile(
      REGISTRY_FILE,
      JSON.stringify({ repositories: [] }, null, 2)
    );
  }
}

// List all repositories
export async function listRepositories(): Promise<Repository[]> {
  await initRegistry();
  const content = await readFile(REGISTRY_FILE, "utf-8");
  const data: RegistryFile = JSON.parse(content);
  return data.repositories;
}

// Add repository
export async function addRepository(path: string): Promise<Repository> {
  const repos = await listRepositories();

  const repo: Repository = {
    id: crypto.randomUUID(),
    name: path.split("/").pop() || "unknown",
    path,
    addedAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };

  repos.push(repo);
  await writeFile(
    REGISTRY_FILE,
    JSON.stringify({ repositories: repos }, null, 2)
  );
  return repo;
}

// Remove repository
export async function removeRepository(id: string): Promise<void> {
  const repos = await listRepositories();
  const filtered = repos.filter((r) => r.id !== id);
  await writeFile(
    REGISTRY_FILE,
    JSON.stringify({ repositories: filtered }, null, 2)
  );
}
```

#### 2. Dashboard (`app/page.tsx`)

**Minimal implementation**:

```typescript
import { listRepositories } from "@/lib/repos";
import { RepositoryCard } from "@/components/repository-card";

export default async function Home() {
  const repos = await listRepositories();

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold text-zinc-100">
          Bare - Worktree Manager
        </h1>

        <div className="space-y-4">
          {repos.map((repo) => (
            <RepositoryCard key={repo.id} repo={repo} />
          ))}
        </div>

        {repos.length === 0 && (
          <p className="text-zinc-500">
            No repositories yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
```

#### 3. Repository Card (`components/repository-card.tsx`)

**Minimal implementation**:

```typescript
"use client";

import { Repository } from "@/lib/types";

export function RepositoryCard({ repo }: { repo: Repository }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-zinc-100">{repo.name}</h3>
          <p className="text-sm text-zinc-500">{repo.path}</p>
        </div>
        {repo.type && (
          <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
            {repo.type}
          </span>
        )}
      </div>
    </div>
  );
}
```

#### 4. API Route (`app/api/repos/route.ts`)

**Minimal implementation**:

```typescript
import { NextResponse } from "next/server";
import { listRepositories, addRepository, removeRepository } from "@/lib/repos";

export async function GET() {
  try {
    const repos = await listRepositories();
    return NextResponse.json({ repositories: repos });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list repositories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { path } = await request.json();
    const repo = await addRepository(path);
    return NextResponse.json(repo);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add repository" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await removeRepository(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove repository" },
      { status: 500 }
    );
  }
}
```

---

### Day 1 MVP Checklist

**Phase 1 Only - Everything Else is Future**

- [ ] Initialize Next.js project with pnpm
- [ ] Create `bin/main.js` with shebang
- [ ] Create `cli/index.ts` with Commander
- [ ] Add `bare start` command that runs `next dev`
- [ ] Update `package.json` with bin entry and "type": "module"
- [ ] Install commander: `pnpm add commander`
- [ ] Test: `pnpm link --global`
- [ ] Test: `bare start` (should start Next.js on localhost:3000)
- [ ] Test: Open http://localhost:3000 (should see Next.js default page)
- [ ] Commit: "feat: initial Next.js setup with CLI"

**Stop here. Do NOT implement**:

- ❌ Repository registry (Phase 2)
- ❌ Dashboard UI (Phase 2)
- ❌ Worktree listing (Phase 3)
- ❌ Clone functionality (Phase 4)
- ❌ Dependency installation (Phase 5)
- ❌ Any "nice to have" features

---

### What to Build in Each Phase

**Phase 1: Foundation** (Day 1 - 40 minutes)

- Initialize Next.js
- Create CLI with `bare start` command
- Test that `bare start` launches Next.js
- **Stop when**: `bare start` command works

**Phase 2: Repository Registry** (Day 1 - 2 hours)

- Repository registry (read/write `~/.bare-bones/repos.json`)
- Dashboard listing repositories
- Manual add repository (via JSON edit for now)
- **Stop when**: Dashboard shows repositories

**Phase 3: Worktree Management** (Day 2 - 4 hours)

- Copy `lib/git.ts` from bear-kit POC
- List worktrees for each repository
- Create worktree form (no install yet)
- Delete worktrees
- Open in editor
- **Stop when**: Can create/delete worktrees, no dependency install

**Phase 4: Clone** (Day 3 - 3 hours)

- Clone dialog UI
- Clone streaming API
- Add to registry after clone
- **Stop when**: Can clone repos from UI

**Phase 5: Dependencies** (Day 4 - 3 hours)

- Detect package manager
- Install in `__main__`
- Copy with `cp -al`
- Install deltas in worktree
- **Stop when**: Creating worktree installs dependencies

**Phase 6: Turborepo** (Day 5 - 2 hours)

- Detect turborepo/monorepo
- Skip copying for monorepos
- Test with bare-test
- **Stop when**: Works with bare-test

**Phases 7-9**: Polish, settings, publishing (future)

---

### Common Pitfalls to Avoid

1. **Don't over-engineer Phase 1**

   - No fancy UI needed
   - No validation needed yet
   - Just read/write JSON and display

2. **Use bear-kit POC code**

   - `lib/git.ts` already works - copy it
   - `components/worktree-list.tsx` already works - adapt it
   - Don't rewrite from scratch

3. **Server vs Client Components**

   - Use Server Components by default
   - Only add `'use client'` when you need state/events
   - Dashboard = Server Component
   - Repository card with expand/collapse = Client Component

4. **Don't implement CLI until Phase 8**

   - Focus on UI first
   - CLI is just a wrapper around the Next.js app

5. **Test as you go**
   - After each phase, test with bare-test
   - Commit after each phase
   - Don't build too much before testing

---

### File Copying Guide

**From bear-kit to bare:**

```bash
# Git operations (Phase 2)
cp /Users/jlg/GitHub/jgeschwendt/bear-kit/src/lib/git.ts \
   /Users/jlg/GitHub/jgeschwendt/bare/lib/git.ts

# Worktree list component (Phase 2)
cp /Users/jlg/GitHub/jgeschwendt/bear-kit/src/components/worktree-list.tsx \
   /Users/jlg/GitHub/jgeschwendt/bare/components/worktree-list.tsx

# Add worktree form (Phase 2)
cp /Users/jlg/GitHub/jgeschwendt/bear-kit/src/components/add-worktree-form.tsx \
   /Users/jlg/GitHub/jgeschwendt/bare/components/create-worktree-form.tsx

# Worktree API (Phase 2)
cp /Users/jlg/GitHub/jgeschwendt/bear-kit/src/app/api/worktree/route.ts \
   /Users/jlg/GitHub/jgeschwendt/bare/app/api/repos/[id]/worktrees/route.ts
```

After copying, adapt these files to:

- Use the new multi-repo architecture
- Read repo path from route params
- Use `~/.bare-bones/repos.json` instead of `BEARKIT_CWD`

---

### Testing Checklist

**Phase 1:**

```bash
# 1. Link CLI globally
pnpm link --global

# 2. Start dashboard
bare start

# 3. Open browser to localhost:3000
# 4. Should see Next.js default page

# 5. Test with custom port
bare start -p 3001
# Should start on localhost:3001
```

**Phase 2:**

```bash
# 1. Start dashboard
bare start

# 2. Manually edit registry
echo '{"repositories":[{"id":"test-1","name":"bare-test","path":"/Users/jlg/GitHub/jgeschwendt/bare-test","addedAt":"2025-11-29T00:00:00Z","lastAccessed":"2025-11-29T00:00:00Z","type":"turborepo"}]}' > ~/.bare-bones/repos.json

# 3. Refresh dashboard - should show bare-test
# 4. Verify card shows name, path, type badge
```

**Phase 3:**

```bash
# 1. Expand repository card
# 2. See list of worktrees
# 3. Create new worktree (no install)
# 4. Verify it appears in list
# 5. Delete worktree
# 6. Verify it's removed
```

Continue this pattern for each phase.

---

### Hand-off to New Claude Instance

**What to say:**
"Implement Phase 1 of the plan.md file. Follow the 'Implementation Guide for Claude Code' section exactly. Use the provided code snippets for `bin/main.js` and `cli/index.ts`. Stop after completing the Day 1 MVP Checklist. Do not proceed to Phase 2."

**Expected deliverables:**

- Working Next.js installation
- CLI tool with `bare start` command
- `bare start` launches Next.js on localhost:3000
- Clean commit with message "feat: initial Next.js setup with CLI"

**Time estimate**: 40 minutes

Let's start building!
