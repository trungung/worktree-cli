import { $ } from "bun";

export async function runPrepareCommand(
  worktreePath: string,
  command: string
): Promise<{ success: boolean; output: string }> {
  try {
    // Run command in worktree and show output to user
    console.log(`→ Running: ${command}`);
    const result = await $`sh -c ${`cd "${worktreePath}" && ${command}`}`.nothrow();

    const output = result.stdout.toString().trim() || result.stderr.toString().trim();

    return {
      success: result.exitCode === 0,
      output,
    };
  } catch (error: unknown) {
    return {
      success: false,
      output: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
