import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import {
  validateInGitRepo,
  validateNotBareRepo,
  formatSuccess,
  formatWarning,
  handleError,
} from "../utils";
import { getWorktrees, getBranches, branchExists } from "../git";
import { $ } from "bun";

const pruneCommand = defineCommand({
  name: "prune",
  description: "Remove stale worktrees",
  options: {
    apply: option(z.boolean().default(false), {
      description: "Actually remove worktrees (default is dry-run)",
    }),
  },
  handler: async ({ flags }) => {
    try {
      await validateInGitRepo();
      await validateNotBareRepo();

      const worktrees = await getWorktrees();
      const branches = await getBranches();

      const staleWorktrees = worktrees.filter((w) => {
        if (w.isMain) return false;
        if (!w.branchName) return false;
        if (!w.isAccessible) return true;

        const existence = branchExists(branches, w.branchName);
        // Consider stale if branch doesn't exist locally or only exists remotely (upstream deleted)
        return existence === "none" || existence === "remote";
      });

      if (staleWorktrees.length === 0) {
        console.log("No stale worktrees found");
        return;
      }

      if (!flags.apply) {
        console.log("→ These worktrees look stale:");
        for (const wt of staleWorktrees) {
          let reason = "upstream deleted";
          if (!wt.isAccessible) {
            reason = "missing";
          } else {
            const existence = branchExists(branches, wt.branchName!);
            if (existence === "none") {
              reason = "branch deleted";
            }
          }
          console.log(`  - ${wt.branchName} (${reason})`);
        }
        console.log("→ Run: wt prune --apply");
      } else {
        let removed = 0;
        let failed = 0;

        for (const wt of staleWorktrees) {
          try {
            // Try to remove, force if not accessible
            if (!wt.isAccessible) {
              await $`git worktree remove --force ${wt.path}`.quiet();
            } else {
              await $`git worktree remove ${wt.path}`.quiet();
            }
            console.log(formatSuccess(`Removed worktree: ${wt.branchName}`));
            removed++;
          } catch (error) {
            console.log(
              formatWarning(
                `Failed to remove worktree: ${wt.branchName}`,
                "May require manual cleanup"
              )
            );
            failed++;
          }
        }

        console.log(
          `\n✓ Removed ${removed} worktree(s)${
            failed > 0 ? `, ${failed} failed` : ""
          }`
        );
      }
    } catch (error) {
      handleError(error);
    }
  },
});

export default pruneCommand;
