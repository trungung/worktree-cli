import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  formatError,
  formatSuccess,
  handleError
} from '../utils'
import { getWorktrees } from '../git'

const removeCommand = defineCommand({
  name: 'remove',
  description: 'Remove a worktree',
  options: {
    branch: option(
      z.boolean().default(false),
      {
        description: 'Also delete the git branch',
        short: 'b'
      }
    )
  },
  handler: async ({ positional, flags }) => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      
      const [branchName] = positional
      if (!branchName) {
        console.log(formatError('branch name required', 'Usage: wt remove <branch>'))
        return
      }
      
      const worktrees = await getWorktrees()
      const targetWorktree = worktrees.find(w => w.branchName === branchName)
      
      if (!targetWorktree) {
        console.log(formatError(
          `No worktree found for branch: ${branchName}`,
          'Use: wt list to see available worktrees'
        ))
        return
      }
      
      if (targetWorktree.isMain) {
        console.log(formatError(
          'Cannot remove the main worktree',
          'This is your primary checkout'
        ))
        return
      }
      
      console.log(formatSuccess(
        `wt remove ${branchName}${flags.branch ? ' --branch' : ''}`,
        'placeholder'
      ))
    } catch (error) {
      handleError(error)
    }
  }
})

export default removeCommand
