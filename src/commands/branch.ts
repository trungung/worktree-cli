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
      if (
        branchName.includes("..") ||
        branchName.startsWith("/") ||
        branchName.endsWith("/") ||
        branchName.includes("//") ||
        branchName.endsWith(".lock") ||
        /[\x00-\x1f\x7f ~^:?*\[]/.test(branchName)
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

      const headInfo = await getHeadInfo();
      const branches = await getBranches();
      const worktrees = await getWorktrees();
      const existence = branchExists(branches, branchName);

      if (flags.from && existence !== "none") {
        console.log(
          formatWarning("Branch already exists", "Ignoring --from flag")
        );
      }

      let finalBranch = branchName;
      let branchExistence = existence;

      if (existence === "none") {
        const fromBranch = flags.from || headInfo.branchName || "HEAD";
        console.log(
          `Branch '${branchName}' does not exist, will create from ${fromBranch}`
        );
        finalBranch = branchName;
      } else if (existence === "remote") {
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
          finalBranch = branchName;
        }
      }

      await validateBranchNotCheckedOut(finalBranch);

      const repoInfo = await getRepoInfo();
      const worktreeRoot = getWorktreePath(repoInfo.rootPath, config.postfix);
      const worktreeDirName = finalBranch.replace(/\//g, "-");
      const absoluteWorktreePath = `${worktreeRoot}/${worktreeDirName}`;
      const projectName = repoInfo.rootPath.split("/").pop() || "";
      const relativeWorktreePath = `../${projectName}${config.postfix}/${worktreeDirName}`;

      const existingWorktree = worktrees.find(
        (w) => w.branchName === finalBranch
      );

      if (existingWorktree && existingWorktree.isAccessible) {
        console.log(
          formatSuccess(`Worktree ready: ${finalBranch}`, relativeWorktreePath)
        );
        return;
      }

      await validateTargetDirectoryNotExists(absoluteWorktreePath);

      // Create worktree with proper branch checkout
      if (branchExistence === "none") {
        // New branch: use -b flag to create and checkout
        const fromBranch = flags.from || "HEAD";
        await $`git worktree add -b ${finalBranch} ${absoluteWorktreePath} ${fromBranch}`.quiet();
      } else {
        // Existing branch: just checkout
        await $`git worktree add ${absoluteWorktreePath} ${finalBranch}`.quiet();
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
            console.log(
              formatWarning(`Prepare command failed: ${cmd}`, output)
            );
          } else if (output) {
            // Only show output if command was actually run (not cached)
            console.log(`✓ ${cmd} completed`);
          }
        }
      }

      console.log(
        formatSuccess(`Worktree ready: ${finalBranch}`, relativeWorktreePath)
      );
    } catch (error) {
      handleError(error);
    }
  },
});

export default branchCommand;
