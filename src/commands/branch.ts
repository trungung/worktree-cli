import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  validateNotDetachedHEAD,
  validateCleanWorkingTree,
  validateBranchNotCheckedOut,
  validateTargetDirectoryNotExists,
  formatError,
  formatSuccess,
  formatWarning,
  handleError,
  copyFilesToWorktree,
  runPrepareCommand
} from '../utils'
import { getHeadInfo, getBranches, branchExists, getWorktrees, getRepoInfo } from '../git'
import { loadConfig, getWorktreePath } from '../config'
import { $ } from 'bun'

const branchCommand = defineCommand({
  name: 'branch',
  description: 'Create or switch to a worktree for a branch (default command)',
  options: {
    from: option(
      z.string().optional(),
      {
        description: 'Create branch from this branch'
      }
    )
  },
  handler: async ({ positional, flags }) => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      await validateNotDetachedHEAD()
      await validateCleanWorkingTree()
      
      const [branchName] = positional
      if (!branchName) {
        console.log(formatError('branch name required', 'Usage: wt <branch>'))
        return
      }
      
      const config = await loadConfig()
      
      const headInfo = await getHeadInfo()
      const branches = await getBranches()
      const worktrees = await getWorktrees()
      const existence = branchExists(branches, branchName)
      
      if (flags.from && existence !== 'none') {
        console.log(formatWarning(
          'Branch already exists',
          'Ignoring --from flag'
        ))
      }
      
      let finalBranch = branchName
      let shouldCreateBranch = false
      
      if (existence === 'none') {
        const fromBranch = flags.from || headInfo.branchName || 'HEAD'
        console.log(`Branch '${branchName}' does not exist, creating from ${fromBranch}`)
        
        await $`git branch ${branchName} ${fromBranch}`.quiet()
        shouldCreateBranch = true
        finalBranch = branchName
      } else if (existence === 'remote') {
        console.log(`Branch '${branchName}' exists remotely, fetching...`)
        
        const remoteBranch = branches.remoteBranches.find(rb => {
          const parts = rb.split('/')
          const remoteBranchName = parts.slice(1).join('/')
          return remoteBranchName === branchName
        })
        
        if (remoteBranch) {
          await $`git fetch ${remoteBranch.split('/')[0]}`.quiet()
          await $`git branch ${branchName} ${remoteBranch}`.quiet()
          shouldCreateBranch = true
          finalBranch = branchName
        }
      }
      
      await validateBranchNotCheckedOut(finalBranch)
      
      const repoInfo = await getRepoInfo()
      const worktreeRoot = getWorktreePath(repoInfo.rootPath, config.postfix)
      const absoluteWorktreePath = `${worktreeRoot}/${finalBranch}`
      const projectName = repoInfo.rootPath.split('/').pop() || ''
      const relativeWorktreePath = `../${projectName}${config.postfix}/${finalBranch}`
      
      const existingWorktree = worktrees.find(w => w.branchName === finalBranch)
      
      if (existingWorktree && existingWorktree.isAccessible) {
        console.log(formatSuccess(
          `Worktree ready: ${finalBranch}`,
          relativeWorktreePath
        ))
        return
      }
      
      await validateTargetDirectoryNotExists(absoluteWorktreePath)
      
      const createFromBranch = shouldCreateBranch ? finalBranch : flags.from || 'HEAD'
      await $`git worktree add ${absoluteWorktreePath} ${createFromBranch}`.quiet()
      
      if (config.copyFiles && config.copyFiles.length > 0) {
        const { copied } = await copyFilesToWorktree(
          repoInfo.rootPath,
          absoluteWorktreePath,
          config.copyFiles
        )
        
        if (copied.length > 0) {
          console.log(`→ Copied files: ${copied.join(', ')}`)
        }
      }
      
      if (config.prepare && config.prepare.length > 0) {
        for (const cmd of config.prepare) {
          const { success, output } = await runPrepareCommand(
            absoluteWorktreePath,
            cmd
          )
          
          if (!success) {
            console.log(formatWarning(
              `Prepare command failed: ${cmd}`,
              output
            ))
          }
        }
      }
      
      console.log(formatSuccess(
        `Worktree ready: ${finalBranch}`,
        relativeWorktreePath
      ))
      
    } catch (error) {
      handleError(error)
    }
  }
})

export default branchCommand
