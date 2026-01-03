import { $ } from 'bun'

export async function revParseGitDir(): Promise<string> {
  const result = await $`git rev-parse --git-dir`.quiet()
  if (result.exitCode !== 0) {
    throw new Error('Not a git repository')
  }
  return result.stdout.toString().trim()
}

export async function revParseIsBare(): Promise<boolean> {
  const result = await $`git rev-parse --is-bare-repository`.quiet()
  return result.stdout.toString().trim() === 'true'
}

export async function revParseShowToplevel(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.quiet()
  if (result.exitCode !== 0) {
    throw new Error('Not a git repository')
  }
  return result.stdout.toString().trim()
}

export async function symbolicRefShortHead(): Promise<string | null> {
  const result = await $`git symbolic-ref --short HEAD`.quiet()
  if (result.exitCode !== 0) {
    return null
  }
  return result.stdout.toString().trim()
}

export async function statusPorcelain(): Promise<string> {
  const result = await $`git status --porcelain`.quiet()
  return result.stdout.toString()
}

export async function worktreeListPorcelain(): Promise<string> {
  const result = await $`git worktree list --porcelain`.quiet()
  return result.stdout.toString()
}

export async function branchList(showRemote?: boolean): Promise<string[]> {
  const result = await $`git branch ${showRemote ? '-r' : ''}`.quiet()
  return result
    .stdout.toString()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

export async function branchShowCurrent(): Promise<string | null> {
  const result = await $`git branch --show-current`.quiet()
  if (result.exitCode !== 0 || !result.stdout.toString().trim()) {
    return null
  }
  return result.stdout.toString().trim()
}

export async function configGet(key: string): Promise<string | null> {
  const result = await $`git config --get ${key}`.quiet()
  if (result.exitCode !== 0) {
    return null
  }
  return result.stdout.toString().trim()
}
