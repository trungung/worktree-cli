import { defineCommand } from '@bunli/core'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  formatSuccess,
  handleError
} from '../utils'
import { getWorktrees } from '../git'

const listCommand = defineCommand({
  name: 'list',
  description: 'List all worktrees',
  handler: async () => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      
      const worktrees = await getWorktrees()
      
      console.log(formatSuccess('wtree list - placeholder'))
      console.log(`Found ${worktrees.length} worktree(s)`)
    } catch (error) {
      handleError(error)
    }
  }
})

export default listCommand
