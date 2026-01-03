import { defineCommand } from "@bunli/core";
import {
  validateInGitRepo,
  validateNotBareRepo,
  formatSuccess,
  formatWarning,
  handleError,
  promptText,
  promptConfirm,
} from "../utils";
import { WtConfig, DEFAULT_CONFIG, CONFIG_FILE } from "../config";
import { getRepoInfo } from "../git";

const initCommand = defineCommand({
  name: "init",
  description: "One-time setup for wt",
  handler: async () => {
    try {
      await validateInGitRepo();
      await validateNotBareRepo();

      const configExists = await Bun.file(CONFIG_FILE).exists();

      let config: WtConfig = { ...DEFAULT_CONFIG };

      if (configExists) {
        const existingConfig = JSON.parse(
          await Bun.file(CONFIG_FILE).text()
        ) as WtConfig;
        config = { ...DEFAULT_CONFIG, ...existingConfig };

        console.log(
          formatWarning(
            "wt is already configured",
            `Current postfix: ${config.postfix}`
          )
        );

        const shouldReconfigure = await promptConfirm(
          "Do you want to reconfigure?",
          false
        );
        if (!shouldReconfigure) {
          console.log(formatSuccess("No changes made"));
          return;
        }
      }

      console.log("\nWelcome to wt! Let’s configure your worktree setup.\n");

      const postfix = await promptText(
        "What postfix for worktree directory?",
        config.postfix
      );

      // Validate postfix
      if (!postfix || postfix.trim() === "") {
        console.log(
          formatWarning(
            "Empty postfix not allowed",
            "Using default: .worktrees"
          )
        );
        config.postfix = ".worktrees";
      } else if (postfix.includes("/") || postfix.includes("\\")) {
        console.log(
          formatWarning(
            "Postfix cannot contain path separators",
            "Using default: .worktrees"
          )
        );
        config.postfix = ".worktrees";
      } else {
        config.postfix = postfix;
      }

      // Prompt for copyFiles
      console.log(
        "\n💡 File copying lets you carry untracked files (like .env) to new worktrees"
      );
      const enableCopyFiles = await promptConfirm(
        "Enable file copying?",
        false
      );

      let copyFiles: string[] = [];
      if (enableCopyFiles) {
        const copyFilesInput = await promptText(
          "File patterns to copy (comma-separated, e.g., .env*, .local.env)",
          ".env*"
        );
        copyFiles = copyFilesInput
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      // Prompt for prepare commands
      console.log(
        "\n💡 Prepare commands run once after creating a new worktree"
      );
      const enablePrepare = await promptConfirm("Run prepare commands?", false);

      let prepare: string[] = [];
      if (enablePrepare) {
        const prepareInput = await promptText(
          "Commands to run (comma-separated, e.g., npm install, bun install)",
          "npm install"
        );
        prepare = prepareInput
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      const newConfig: WtConfig = {
        postfix: config.postfix,
        copyFiles,
        prepare,
      };

      await Bun.write(CONFIG_FILE, JSON.stringify(newConfig, null, 2));

      console.log("\n" + formatSuccess("wt initialized!"));

      const repoInfo = await getRepoInfo();
      const projectName = repoInfo.rootPath.split("/").pop() || "";

      console.log("\nSummary:");
      console.log(`  Postfix: ${config.postfix}`);
      console.log(
        `  Worktrees location: ${projectName}${config.postfix}/ (sibling directory)`
      );
      console.log(
        `  Copy files: ${copyFiles.length > 0 ? copyFiles.join(", ") : "none"}`
      );
      console.log(
        `  Prepare: ${prepare.length > 0 ? prepare.join(", ") : "none"}`
      );
      console.log(`  Config: ${CONFIG_FILE}`);

      console.log(
        "\n💡 Tip: Worktrees are stored outside your repo (no .gitignore needed)"
      );

      console.log("\nWhat next:");
      console.log(`  1. wt <branch>        Create or switch to a worktree`);
      console.log(`  2. wt list            See all worktrees`);
      console.log(`  3. wt --help          See all commands`);
    } catch (error) {
      handleError(error);
    }
  },
});

export default initCommand;
