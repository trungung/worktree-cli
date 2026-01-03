import { defineCommand } from '@bunli/core'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  validateWorktreeDirIgnored,
  formatSuccess,
  handleError
} from '../utils'

const initCommand = defineCommand({
  name: 'init',
  description: 'One-time setup for wt',
  handler: async () => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      await validateWorktreeDirIgnored('.worktrees')
      
      console.log(formatSuccess('wt init - placeholder'))
    } catch (error) {
      handleError(error)
    }
  }
})

export default initCommand
