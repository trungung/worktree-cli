import { defineCommand } from '@bunli/core'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  validateGhInstalled,
  formatError,
  formatSuccess,
  handleError
} from '../utils'

const prCommand = defineCommand({
  name: 'pr',
  description: 'Create worktree from PR (optional capability tier)',
  handler: async ({ positional }) => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      
      const [prNumber] = positional
      if (!prNumber) {
        console.log(formatError('PR number required', 'Usage: wtree pr <number>'))
        return
      }
      
      await validateGhInstalled()
      
      console.log(formatSuccess(`Worktree ready: pr/${prNumber}`, '.worktrees/pr-' + prNumber))
    } catch (error) {
      handleError(error)
    }
  }
})

export default prCommand
