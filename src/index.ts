import { createCLI } from "@bunli/core";
import { cli as generatedCli } from "../.bunli/commands.gen.js";
import { listWorktrees } from "./utils/list";

const cli = await createCLI({
  name: "wt",
  version: "0.1.0",
  description: "Zen Git Worktree Manager — Think branches, not paths",
});

// Auto-register all commands from .bunli/commands.gen.ts
generatedCli.register(cli);

const knownCommands = generatedCli.list().map((c) => c.name);

function preprocessArgs(args: string[]): string[] {
  if (args.length === 0) return args;

  const [firstArg] = args;

  if (
    firstArg === "--help" ||
    firstArg === "--version" ||
    firstArg === "-h" ||
    firstArg === "-v"
  ) {
    return args;
  }

  if (firstArg.startsWith("--") || firstArg.startsWith("-")) {
    return args;
  }

  if (!(knownCommands as string[]).includes(firstArg)) {
    return ["branch", ...args];
  }

  return args;
}

const rawArgs = process.argv.slice(2);

if (rawArgs.length === 0) {
  await listWorktrees();
  process.exit(0);
}

const processedArgs = preprocessArgs(rawArgs);
await cli.run(processedArgs);
