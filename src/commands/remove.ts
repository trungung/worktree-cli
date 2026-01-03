import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import {
  validateInGitRepo,
  validateNotBareRepo,
  formatError,
  formatSuccess,
  formatWarning,
  handleError,
  promptConfirm,
} from "../utils";
import { getWorktrees } from "../git";
import { $ } from "bun";

const removeCommand = defineCommand({
  name: "remove",
  description: "Remove a worktree",
  options: {
    branch: option(z.boolean().default(false), {
      description: "Also delete the git branch",
      short: "b",
    }),
    force: option(z.boolean().default(false), {
      description: "Force removal even if worktree is dirty",
      short: "f",
    }),
  },
  handler: async ({ positional, flags }) => {
    try {
      await validateInGitRepo();
      await validateNotBareRepo();

      const [branchName] = positional;
      if (!branchName) {
        console.log(
          formatError("branch name required", "Usage: wt remove <branch>")
        );
        return;
      }

      const worktrees = await getWorktrees();

      // Find worktree by branch name OR by directory name (for detached worktrees)
      const targetWorktree = worktrees.find((w) => {
        // Match by branch name
        if (w.branchName === branchName) return true;

        // Match by directory name (last segment of path)
        const dirName = w.path.split("/").pop();
        return dirName === branchName;
      });

      if (!targetWorktree) {
        console.log(
          formatError(
            `No worktree found for: ${branchName}`,
            "Use: wt list to see available worktrees"
          )
        );
        return;
      }

      if (targetWorktree.isMain) {
        console.log(
          formatError(
            "Cannot remove the main worktree",
            "This is your primary checkout"
          )
        );
        return;
      }

      // Check if worktree has uncommitted changes
      let shouldForceRemove = flags.force;
      if (targetWorktree.isAccessible && !flags.force) {
        try {
          const result =
            await $`git -C ${targetWorktree.path} status --porcelain`.quiet();
          const isDirty = result.stdout.toString().trim().length > 0;

          if (isDirty) {
            console.log(
              formatWarning(
                "Worktree has uncommitted changes",
                "Use --force to remove anyway"
              )
            );

            const shouldContinue = await promptConfirm(
              "Continue with removal?",
              false
            );
            if (!shouldContinue) {
              console.log("Removal cancelled");
              return;
            }
            // User confirmed, so we need to force the removal
            shouldForceRemove = true;
          }
        } catch {
          // Continue with removal if status check fails
        }
      }

      // Remove the worktree
      try {
        if (shouldForceRemove) {
          await $`git worktree remove --force ${targetWorktree.path}`.quiet();
        } else {
          await $`git worktree remove ${targetWorktree.path}`.quiet();
        }
        console.log(formatSuccess(`Removed worktree: ${branchName}`));
      } catch (error) {
        console.log(
          formatError("Failed to remove worktree", "Try using --force flag")
        );
        return;
      }

      // Remove the branch if requested
      if (flags.branch) {
        try {
          await $`git branch -d ${branchName}`.quiet();
          console.log(formatSuccess(`Deleted branch: ${branchName}`));
        } catch {
          console.log(
            formatWarning(
              `Branch ${branchName} has unmerged changes`,
              "Use: git branch -D ${branchName} to force delete"
            )
          );
        }
      }
    } catch (error) {
      handleError(error);
    }
  },
});

export default removeCommand;
