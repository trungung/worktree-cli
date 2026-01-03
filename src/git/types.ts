export interface RepoInfo {
  rootPath: string
  gitDirPath: string
  isBare: boolean
  isDetachedHEAD: boolean
  inProgressOperation: 'merge' | 'rebase' | 'cherry-pick' | 'none'
}

export interface HeadInfo {
  branchName: string | null
  isDirty: boolean
}

export interface Worktree {
  path: string
  branchName: string | null
  isMain: boolean
  isAccessible: boolean
  headState: 'branch' | 'detached'
}

export interface BranchesInfo {
  localBranches: string[]
  remoteBranches: string[]
}
