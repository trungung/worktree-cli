import { defineCommand } from "@bunli/core";
import {
  validateInGitRepo,
  validateNotBareRepo,
  validateGhInstalled,
  validateTargetDirectoryNotExists,
  formatError,
  formatSuccess,
  handleError,
  copyFilesToWorktree,
  runPrepareCommand,
} from "../utils";
import { loadConfig, getWorktreePath } from "../config";
import { getRepoInfo, getWorktrees } from "../git";
import { $ } from "bun";

const prCommand = defineCommand({
  name: "pr",
  description: "Create worktree from PR (optional capability tier)",
  handler: async ({ positional }) => {
    try {
      await validateInGitRepo();
      await validateNotBareRepo();
      await validateGhInstalled();

      const [prNumber] = positional;
      if (!prNumber) {
        console.log(formatError("PR number required", "Usage: wt pr <number>"));
        return;
      }

      // Get PR branch name using gh CLI
      console.log(`Fetching PR #${prNumber}...`);
      const prInfo = await $`gh pr view ${prNumber} --json headRefName`.quiet();

      if (prInfo.exitCode !== 0) {
        console.log(
          formatError(
            `Failed to fetch PR #${prNumber}`,
            "Check that the PR exists and you have access"
          )
        );
        return;
      }

      let prBranchName: string;
      try {
        const parsed = JSON.parse(prInfo.stdout.toString());
        prBranchName = parsed.headRefName;
      } catch {
        console.log(formatError("Failed to parse PR information", "Try again"));
        return;
      }

      const config = await loadConfig();
      const repoInfo = await getRepoInfo();
      const projectName = repoInfo.rootPath.split("/").pop() || "";

      // Create worktree with pr/ prefix for branch and pr- prefix for path
      const branchName = `pr/${prNumber}`;
      const worktreeRoot = getWorktreePath(repoInfo.rootPath, config.postfix);
      const absoluteWorktreePath = `${worktreeRoot}/pr-${prNumber}`;
      const relativeWorktreePath = `../${projectName}${config.postfix}/pr-${prNumber}`;

      // Check if worktree already exists
      const worktrees = await getWorktrees();
      const existingWorktree = worktrees.find(
        (w) => w.branchName === branchName || w.path === absoluteWorktreePath
      );

      if (existingWorktree && existingWorktree.isAccessible) {
        console.log(
          formatSuccess(`Worktree ready: pr/${prNumber}`, relativeWorktreePath)
        );
        return;
      }

      await validateTargetDirectoryNotExists(absoluteWorktreePath);

      // Fetch the PR branch using gh CLI
      console.log(`Fetching branch: ${prBranchName}...`);
      await $`gh pr checkout ${prNumber}`.quiet();

      // Create worktree from the checked out PR branch
      // Use -b to create pr/N branch in the worktree
      await $`git worktree add -b ${branchName} ${absoluteWorktreePath} ${prBranchName}`.quiet();

      // Copy files if configured
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

      // Run prepare commands if configured
      if (config.prepare && config.prepare.length > 0) {
        console.log(`\n→ Running prepare commands...`);
        for (const cmd of config.prepare) {
          const { success, output } = await runPrepareCommand(
            absoluteWorktreePath,
            cmd
          );

          if (!success) {
            console.log(formatError(`Prepare command failed: ${cmd}`, output));
          } else if (output) {
            console.log(`✓ ${cmd} completed`);
          }
        }
      }

      console.log(
        formatSuccess(`Worktree ready: pr/${prNumber}`, relativeWorktreePath)
      );
    } catch (error) {
      handleError(error);
    }
  },
});

export default prCommand;
