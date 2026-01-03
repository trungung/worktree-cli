import { defineCommand } from '@bunli/core'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  validateGhInstalled,
  formatError,
  formatSuccess,
  handleError
} from '../utils'
import { loadConfig } from '../config'
import { getRepoInfo } from '../git'

const prCommand = defineCommand({
  name: 'pr',
  description: 'Create worktree from PR (optional capability tier)',
  handler: async ({ positional }) => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      
      const [prNumber] = positional
      if (!prNumber) {
        console.log(formatError('PR number required', 'Usage: wt pr <number>'))
        return
      }
      
      await validateGhInstalled()
      
      const config = await loadConfig()
      const repoInfo = await getRepoInfo()
      const projectName = repoInfo.rootPath.split('/').pop() || ''
      
      console.log(formatSuccess(`Worktree ready: pr/${prNumber}`, `../${projectName}${config.postfix}/pr-${prNumber}`))
    } catch (error) {
      handleError(error)
    }
  }
})

export default prCommand
