import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  validateNotDetachedHEAD,
  validateCleanWorkingTree,
  validateBranchNotCheckedOut,
  formatError,
  formatSuccess,
  formatWarning,
  handleError
} from '../utils'
import { getHeadInfo, getBranches, branchExists } from '../git'

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
        console.log(formatError('branch name required', 'Usage: wtree <branch>'))
        return
      }
      
      const headInfo = await getHeadInfo()
      const branches = await getBranches()
      const existence = branchExists(branches, branchName)
      
      if (flags.from && existence !== 'none') {
        console.log(formatWarning(
          'Branch already exists',
          'Ignoring --from flag'
        ))
      }
      
      await validateBranchNotCheckedOut(branchName)
      
      if (existence === 'none') {
        console.log(`Branch '${branchName}' does not exist, will create from ${flags.from || headInfo.branchName || 'HEAD'}`)
      }
      
      const fromStr = flags.from ? ` --from ${flags.from}` : ''
      console.log(formatSuccess(`Worktree ready: ${branchName}`, '.worktrees/' + branchName + fromStr))
    } catch (error) {
      handleError(error)
    }
  }
})

export default branchCommand
