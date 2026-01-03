import * as gitCommands from "./git";
import type { RepoInfo, HeadInfo, Worktree, BranchesInfo } from "./types";

export async function getRepoInfo(): Promise<RepoInfo> {
  const rootPath = await gitCommands.revParseShowToplevel();
  const gitDirPath = await gitCommands.revParseGitDir();
  const isBare = await gitCommands.revParseIsBare();

  const headBranch = await gitCommands.symbolicRefShortHead();
  const isDetachedHEAD = headBranch === null;

  let inProgressOperation: RepoInfo["inProgressOperation"] = "none";
  try {
    const mergeHeadExists = await Bun.file(`${gitDirPath}/MERGE_HEAD`).exists();
    if (mergeHeadExists) {
      inProgressOperation = "merge";
    } else {
      const rebaseMergeExists = await Bun.file(
        `${gitDirPath}/rebase-merge`
      ).exists();
      const rebaseApplyExists = await Bun.file(
        `${gitDirPath}/rebase-apply`
      ).exists();
      if (rebaseMergeExists || rebaseApplyExists) {
        inProgressOperation = "rebase";
      } else {
        const cherryPickHeadExists = await Bun.file(
          `${gitDirPath}/CHERRY_PICK_HEAD`
        ).exists();
        if (cherryPickHeadExists) {
          inProgressOperation = "cherry-pick";
        }
      }
    }
  } catch {
    inProgressOperation = "none";
  }

  return {
    rootPath,
    gitDirPath,
    isBare,
    isDetachedHEAD,
    inProgressOperation,
  };
}

export async function getHeadInfo(): Promise<HeadInfo> {
  const branchName = await gitCommands.symbolicRefShortHead();
  const status = await gitCommands.statusPorcelain();
  const isDirty = status.trim() !== "";

  return {
    branchName,
    isDirty,
  };
}

export async function getWorktrees(): Promise<Worktree[]> {
  const output = await gitCommands.worktreeListPorcelain();
  const blocks = output.split("\n\n").filter((block) => block.trim());

  const worktrees: Worktree[] = [];
  const repoInfo = await getRepoInfo();

  for (const block of blocks) {
    const lines = block.split("\n");
    let path = "";
    let branchName: string | null = null;
    let headState: "branch" | "detached" = "branch";

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        path = line.substring("worktree ".length);
      } else if (line.startsWith("branch ")) {
        const fullRef = line.substring("branch ".length);
        branchName = normalizeBranch(fullRef);
      } else if (line.startsWith("HEAD ")) {
        const head = line.substring("HEAD ".length);
        headState = head.startsWith("refs/heads/") ? "branch" : "detached";
      }
    }

    if (!path) continue;

    // Check if directory exists (worktrees are directories, not files)
    let isAccessible = false;
    try {
      const fs = await import("fs");
      const stat = await fs.promises.stat(path);
      isAccessible = stat.isDirectory();
    } catch {
      isAccessible = false;
    }
    const isMain = path === repoInfo.rootPath;

    worktrees.push({
      path,
      branchName,
      isMain,
      isAccessible,
      headState,
    });
  }

  return worktrees;
}

export function normalizeBranch(branch: string): string {
  return branch
    .replace(/^refs\/heads\//, "")
    .replace(/^refs\/remotes\//, "")
    .replace(/^refs\/tags\//, "");
}

export async function getLocalBranches(): Promise<string[]> {
  const branches = await gitCommands.branchList(false);
  return branches
    .map((b) => b.replace(/^\*?\s+/, ""))
    .filter((b) => !b.includes("HEAD"));
}

export async function getRemoteBranches(): Promise<string[]> {
  const branches = await gitCommands.branchList(true);
  return branches
    .map((b) => b.replace(/^  /, ""))
    .filter((b) => b.includes("/") && !b.includes("HEAD"));
}

export async function getBranches(): Promise<BranchesInfo> {
  const localBranches = await getLocalBranches();
  const remoteBranches = await getRemoteBranches();

  return {
    localBranches,
    remoteBranches,
  };
}

export function branchExists(
  branches: BranchesInfo,
  branchName: string
): "local" | "remote" | "both" | "none" {
  const localExists = branches.localBranches.includes(branchName);
  const remoteExists = branches.remoteBranches.some((b) => {
    const parts = b.split("/");
    const remoteBranch = parts.slice(1).join("/");
    return remoteBranch === branchName;
  });

  if (localExists && remoteExists) return "both";
  if (localExists) return "local";
  if (remoteExists) return "remote";
  return "none";
}

export function isBranchCheckedOut(
  worktrees: Worktree[],
  branchName: string
): boolean {
  return worktrees.some(
    (w) =>
      w.branchName === branchName && w.isAccessible && w.headState === "branch"
  );
}
