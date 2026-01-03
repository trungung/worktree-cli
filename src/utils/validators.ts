import { getRepoInfo, getHeadInfo, getWorktrees, isBranchCheckedOut } from '../git'
import { WtError, WtWarning, formatWarning } from './errors'
import * as fs from 'fs'

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
    console.log(formatWarning(
      'Working tree has uncommitted changes',
      'Changes will not carry over to the new worktree'
    ))
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

export async function validateTargetDirectoryNotExists(targetPath: string): Promise<void> {
  try {
    const stat = fs.statSync(targetPath)
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
