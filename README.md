# worktree-cli (`wt`)

`worktree-cli` is the repo/package; `wt` is the installed binary. It’s a lightweight CLI that keeps Git worktree habits familiar while removing the folder-juggling. `wt` lists worktrees, opens branches by name, and runs optional one-time setup steps so every checkout is ready to code.

## Highlights

- Drop-in workflow: `wt <branch>` is the default command, so you can simply type the branch name to open or create its worktree.
- Status-aware listing: running `wt` with no args prints every worktree with clean/modified/missing status.
- Predictable layout: worktrees live in a sibling directory such as `../my-app.wt/feature-auth` (postfix is configurable).
- One-time automation: copy `.env`-style files and run install/build commands exactly once per worktree.

## Installation

Install the package globally—it exposes the `wt` binary:

```bash
bun add -g @trungung/wt
# or
npm install -g @trungung/wt
```

## Quickstart

1. Configure once per repo (creates `wt.config.json`):
   ```bash
   wt init
   ```
2. Jump into a branch (default command):
   ```bash
   wt feature-auth
   ```
   - Reuses the worktree if it already exists.
   - Creates `feature-auth` (or fetches remote-only branches) when needed.
3. View everything you have checked out:
   ```bash
   wt
   ```

## Command reference (`wt`)

### `wt`
Lists every worktree, showing the relative path (when managed by `wt`) and whether it is clean, modified, missing, or errored.

### `wt <branch>` (default)
Creates or switches to a worktree for `<branch>`.

```bash
wt feature-auth
wt feature-auth --from main   # choose starting point for brand-new branches
```

- Branch names are validated to match Git’s rules before creating directories.
- Remote-only branches are fetched automatically and converted to local tracking branches.
- Worktree directories replace `/` with `-` (e.g. `feature/auth` → `feature-auth`).
- When a worktree already exists and is accessible, `wt` simply prints the path so you can reuse it.
- File copying and prepare commands (see below) run immediately after a successful `git worktree add`.

### `wt pr <number>` (optional capability)
Creates a worktree for a GitHub pull request.

```bash
wt pr 123
```

- Requires the GitHub CLI (`gh`) with access to the repository.
- Uses `gh pr view` to discover the head branch and `gh pr checkout` to ensure the code is present locally.
- Creates a local branch named `pr/<number>` inside `../<project><postfix>/pr-<number>` and applies the same copy/prepare automation as the branch command.

### `wt remove <branch>`
Removes a worktree by branch name or directory name.

```bash
wt remove feature-auth
wt remove feature-auth --force
wt remove feature-auth --branch   # also delete the Git branch (-b)
```

- Protects the primary checkout (`isMain`).
- Warns about dirty worktrees and asks for confirmation unless you pass `--force`.
- `--branch` (or `-b`) deletes the Git branch after the worktree is removed, falling back to Git’s own safety checks.

### `wt prune`
Finds stale worktrees; dry-run by default.

```bash
wt prune
wt prune --apply
```

A worktree is considered stale when its directory is missing or its branch no longer exists locally/upstream. `--apply` attempts to remove each stale entry (forcing removal when paths are missing).

### `wt init`
Interactive, one-time (re-runnable) setup per repository.

- Confirms you are inside a non-bare Git repo before proceeding.
- Lets you pick the postfix for the sibling worktree directory (default `.wt`).
- Opt-in prompts for file-copy globs and prepare commands.
- Produces `wt.config.json`; re-run `wt init` any time to update the configuration.

## Worktree layout & config

`wt` keeps worktrees next to your repo, not inside it:

```
my-app/           # your repo
../my-app.wt/     # default sibling directory managed by wt
```

`wt init` writes `wt.config.json` at the repo root. A typical configuration looks like:

```json
{
  "postfix": ".wt",
  "copyFiles": [".env*"],
  "prepare": ["npm install"]
}
```

- `postfix` controls the sibling directory name (`my-app` → `my-app.wt`).
- `copyFiles` accepts glob patterns relative to the repo root and only copies files that do not already exist in the worktree.
- `prepare` is a list of shell commands. Each worktree runs the commands once and records completion in a `.wt-prepared` marker file so subsequent `wt <branch>` invocations do not re-run them.

If `wt.config.json` is missing, `wt` falls back to the built-in defaults (postfix `.wt`, copy `.env*`, no prepare commands) until you run `wt init`.

## Requirements / non-goals

- Requires: `git` (the CLI shells out to standard Git commands).
- Optional: `gh` for `wt pr`.
- Does *not* replace your normal Git workflows—it simply creates, lists, and cleans up worktrees while leaving merging, rebasing, and deployment entirely to you.
