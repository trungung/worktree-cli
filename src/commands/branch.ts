import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import {
  validateInGitRepo,
  validateNotBareRepo,
  validateNotDetachedHEAD,
  validateCleanWorkingTree,
  validateBranchNotCheckedOut,
  validateTargetDirectoryNotExists,
  formatError,
  formatSuccess,
  formatWarning,
  handleError,
  copyFilesToWorktree,
  runPrepareCommand,
  promptSelect,
} from "../utils";
import {
  getHeadInfo,
  getBranches,
  branchExists,
  getWorktrees,
  getRepoInfo,
} from "../git";
import { loadConfig, getWorktreePath } from "../config";
import { $ } from "bun";

const branchCommand = defineCommand({
  name: "branch",
  description: "Create or switch to a worktree for a branch (default command)",
  options: {
    from: option(z.string().optional(), {
      description: "Create branch from this branch",
    }),
  },
  handler: async ({ positional, flags }) => {
    try {
      await validateInGitRepo();
      await validateNotBareRepo();
      await validateNotDetachedHEAD();
      await validateCleanWorkingTree();

      const [branchName] = positional;
      if (!branchName) {
        console.log(formatError("branch name required", "Usage: wt <branch>"));
        return;
      }

      // Validate branch name (git branch name rules)
      const hasInvalidChars = branchName.split('').some(char => {
        const code = char.charCodeAt(0);
        return code <= 32 || code === 127 || "~^:?*[".includes(char);
      });

      if (
        branchName.includes("..") ||
        branchName.startsWith("/") ||
        branchName.endsWith("/") ||
        branchName.includes("//") ||
        branchName.endsWith(".lock") ||
        hasInvalidChars
      ) {
        console.log(
          formatError(
            "Invalid branch name",
            "Branch names cannot contain spaces, .., special characters, or start/end with /"
          )
        );
        return;
      }

      const config = await loadConfig();
      const repoInfo = await getRepoInfo();

      const headInfo = await getHeadInfo();
      const branches = await getBranches();
      const worktrees = await getWorktrees();
      const existence = branchExists(branches, branchName);

      const existingWorktree = worktrees.find(
        (w) => w.branchName === branchName
      );

      const worktreeRoot = getWorktreePath(repoInfo.rootPath, config.postfix);
      const worktreeDirName = branchName.replace(/\//g, "-");
      const absoluteWorktreePath = `${worktreeRoot}/${worktreeDirName}`;
      const projectName = repoInfo.rootPath.split("/").pop() || "";
      const relativeWorktreePath = `../${projectName}${config.postfix}/${worktreeDirName}`;

      if (existingWorktree && existingWorktree.isAccessible) {
        console.log(
          formatSuccess(`Worktree ready: ${branchName}`, relativeWorktreePath)
        );
        return;
      }

      let branchExistence = existence;

      if (existence === "local" && !existingWorktree) {
        const action = await promptSelect(
          `Branch '${branchName}' already exists locally but has no worktree.`,
          [
            { title: "Abort", value: "abort" },
            { title: "Remove local branch and recreate", value: "recreate" },
            { title: "Use existing branch", value: "use" },
          ]
        );

        if (action === "abort") return;
        if (action === "recreate") {
          await $`git branch -D ${branchName}`.quiet();
          branchExistence = "none";
        }
      }

      if (flags.from && branchExistence !== "none") {
        console.log(
          formatWarning("Branch already exists", "Ignoring --from flag")
        );
      }

      if (branchExistence === "none") {
        const fromBranch = flags.from || headInfo.branchName || "HEAD";
        console.log(
          `Branch '${branchName}' does not exist, will create from ${fromBranch}`
        );
      } else if (branchExistence === "remote") {
        console.log(`Branch '${branchName}' exists remotely, fetching...`);

        const remoteBranch = branches.remoteBranches.find((rb) => {
          const parts = rb.split("/");
          const remoteBranchName = parts.slice(1).join("/");
          return remoteBranchName === branchName;
        });

        if (remoteBranch) {
          await $`git fetch ${remoteBranch.split("/")[0]}`.quiet();
          // Create local tracking branch
          await $`git branch ${branchName} ${remoteBranch}`.quiet();
          branchExistence = "local";
        }
      }

      await validateBranchNotCheckedOut(branchName);
      await validateTargetDirectoryNotExists(absoluteWorktreePath);

      // Create worktree with proper branch checkout
      if (branchExistence === "none") {
        // New branch: use -b flag to create and checkout
        const fromBranch = flags.from || "HEAD";
        await $`git worktree add -b ${branchName} ${absoluteWorktreePath} ${fromBranch}`.quiet();
      } else {
        // Existing branch: just checkout
        await $`git worktree add ${absoluteWorktreePath} ${branchName}`.quiet();
      }

      if (config.copyFiles && config.copyFiles.length > 0) {
        const { copied } = await copyFilesToWorktree(
          repoInfo.rootPath,
          absoluteWorktreePath,
          config.copyFiles
        );

        if (copied.length > 0) {
          console.log(`→ Copied files: ${copied.join(", ")}`);
        }
      }

      if (config.prepare && config.prepare.length > 0) {
        console.log(`\n→ Running prepare commands...`);
        for (const cmd of config.prepare) {
          const { success, output } = await runPrepareCommand(
            absoluteWorktreePath,
            cmd
          );

          if (!success) {
            console.log(formatError(`Prepare command failed: ${cmd}`, output));
            return; // Stop on failure
          }
          console.log(`✓ ${cmd} completed`);
        }
      }

      console.log(
        formatSuccess(`Worktree ready: ${branchName}`, relativeWorktreePath)
      );
    } catch (error) {
      handleError(error);
    }
  },
});

export default branchCommand;
