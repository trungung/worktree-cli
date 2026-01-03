import { getRepoInfo, getHeadInfo, getWorktrees, isBranchCheckedOut } from '../git'
import { WtError, WtWarning } from './errors'

export async function validateInGitRepo(): Promise<void> {
  try {
    await getRepoInfo()
  } catch {
    throw new WtError('Not a git repository', 'Run inside a git project')
  }
}

export async function validateNotBareRepo(): Promise<void> {
  const repoInfo = await getRepoInfo()
  if (repoInfo.isBare) {
    throw new WtError(
      'Cannot use worktree in a bare repository',
      'Worktrees require a working tree'
    )
  }
}

export async function validateNotDetachedHEAD(): Promise<void> {
  const headInfo = await getHeadInfo()
  if (headInfo.branchName === null) {
    throw new WtError(
      'Detached HEAD',
      'Checkout a branch before creating worktrees'
    )
  }
}

export async function validateCleanWorkingTree(): Promise<void> {
  const headInfo = await getHeadInfo()
  if (headInfo.isDirty) {
    throw new WtError(
      'Working tree has uncommitted changes',
      'Commit, stash, or rerun with --force'
    )
  }
}

export async function validateBranchNotCheckedOut(branchName: string): Promise<void> {
  const worktrees = await getWorktrees()
  if (isBranchCheckedOut(worktrees, branchName)) {
    throw new WtError(
      'Branch is already checked out in another worktree',
      'Git does not allow this'
    )
  }
}

export async function validateNoOngoingMerge(): Promise<void> {
  const repoInfo = await getRepoInfo()
  if (repoInfo.inProgressOperation !== 'none') {
    throw new WtError(
      'Git operation in progress',
      'Complete or abort the current git operation first'
    )
  }
}

export async function validateWorktreeDirIgnored(worktreeDir: string): Promise<void> {
  const { formatWarning } = await import('./errors')
  
  try {
    const gitignorePath = '.gitignore'
    const gitignoreExists = await Bun.file(gitignorePath).exists()
    
    if (!gitignoreExists) {
      console.log(formatWarning(
        `${worktreeDir}/ is not ignored`,
        'Add it to .gitignore'
      ))
      return
    }

    const gitignoreContent = await Bun.file(gitignorePath).text()
    const normalizedDir = worktreeDir.replace(/^\//, '')
    const ignoredPatterns = gitignoreContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.trim())
    
    const isIgnored = ignoredPatterns.some(pattern => {
      if (pattern === normalizedDir) return true
      if (pattern.startsWith(normalizedDir + '/')) return true
      if (pattern.endsWith('/**')) {
        const base = pattern.slice(0, -3)
        if (normalizedDir.startsWith(base)) return true
      }
      return false
    })

    if (!isIgnored) {
      console.log(formatWarning(
        `${worktreeDir}/ is not ignored`,
        'Add it to .gitignore'
      ))
    }
  } catch {
    console.log(formatWarning(
      `${worktreeDir}/ is not ignored`,
      'Add it to .gitignore'
    ))
  }
}

export async function validateTargetDirectoryNotExists(targetPath: string): Promise<void> {
  const { existsSync } = await import('fs')
  const { statSync } = await import('fs')
  
  try {
    const stat = statSync(targetPath)
    if (stat.isDirectory()) {
      throw new WtError(
        'Target directory already exists',
        'Remove it manually or choose a different branch name'
      )
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
    throw error
  }
}

export async function validateGhInstalled(): Promise<void> {
  try {
    const whichResult = await Bun.$`which gh`.quiet()
    if (whichResult.exitCode !== 0) {
      throw new WtError(
        'GitHub CLI not found',
        'Install from https://cli.github.com/'
      )
    }
  } catch (error: unknown) {
    if (error instanceof WtError) {
      throw error
    }
    throw new WtError(
      'GitHub CLI not found',
      'Install from https://cli.github.com/'
    )
  }
  
  try {
    const authResult = await Bun.$`gh auth status`.quiet()
    if (authResult.exitCode !== 0) {
      throw new WtError(
        'GitHub CLI not authenticated',
        'Run: gh auth login'
      )
    }
  } catch (error: unknown) {
    if (error instanceof WtError) {
      throw error
    }
    throw new WtError(
      'GitHub CLI not authenticated',
      'Run: gh auth login'
    )
  }
}
