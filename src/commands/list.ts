import { defineCommand } from "@bunli/core";
import { validateInGitRepo, validateNotBareRepo, handleError } from "../utils";
import { getWorktrees } from "../git";
import { $ } from "bun";
import { loadConfig, getWorktreePath } from "../config";
import { getRepoInfo } from "../git";

const listCommand = defineCommand({
  name: "list",
  description: "List all worktrees",
  handler: async () => {
    try {
      await validateInGitRepo();
      await validateNotBareRepo();

      const worktrees = await getWorktrees();
      const config = await loadConfig();
      const repoInfo = await getRepoInfo();

      if (worktrees.length === 0) {
        console.log("No worktrees found");
        return;
      }

      // Table header
      console.log(
        "\nBRANCH                  PATH                            STATUS"
      );
      console.log("─".repeat(70));

      // Check status for all worktrees in parallel for better performance
      const statusChecks = worktrees.map(async (wt) => {
        if (!wt.isAccessible) {
          return { wt, status: "missing" };
        }
        try {
          const result = await $`git -C ${wt.path} status --porcelain`.quiet();
          const isDirty = result.stdout.toString().trim().length > 0;
          return { wt, status: isDirty ? "modified" : "clean" };
        } catch {
          return { wt, status: "error" };
        }
      });

      const results = await Promise.all(statusChecks);

      for (const { wt, status } of results) {
        const branch = wt.branchName || "(detached)";
        const path = wt.path;

        // Format relative path for non-main worktrees
        let displayPath = path;
        if (!wt.isMain) {
          const projectName = repoInfo.rootPath.split("/").pop() || "";
          const worktreeRoot = getWorktreePath(
            repoInfo.rootPath,
            config.postfix
          );
          if (path.startsWith(worktreeRoot)) {
            displayPath = `../${projectName}${config.postfix}/${path
              .split("/")
              .pop()}`;
          }
        }

        // Pad columns
        const branchCol = branch.padEnd(22);
        const pathCol = displayPath.padEnd(30);

        console.log(`${branchCol}  ${pathCol}  ${status}`);
      }

      console.log();
    } catch (error) {
      handleError(error);
    }
  },
});

export default listCommand;
