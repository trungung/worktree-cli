import { $ } from "bun";

const PREPARE_MARKER_FILE = ".wt-prepared";

export async function runPrepareCommand(
  worktreePath: string,
  command: string
): Promise<{ success: boolean; output: string }> {
  const markerPath = `${worktreePath}/${PREPARE_MARKER_FILE}`;
  const markerExists = await Bun.file(markerPath).exists();

  if (markerExists) {
    return { success: true, output: "" };
  }

  try {
    // Run command in worktree and show output to user
    console.log(`→ Running: ${command}`);
    const result = await $`sh -c ${`cd "${worktreePath}" && ${command}`}`;

    if (result.exitCode === 0) {
      await Bun.write(markerPath, new Date().toISOString());
    }

    return {
      success: result.exitCode === 0,
      output: result.stdout.toString().trim(),
    };
  } catch (error: unknown) {
    return {
      success: false,
      output: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
