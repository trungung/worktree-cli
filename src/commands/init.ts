import { defineCommand } from '@bunli/core'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  formatSuccess,
  formatWarning,
  handleError,
  promptText,
  promptConfirm
} from '../utils'
import { WtConfig, DEFAULT_CONFIG, CONFIG_FILE } from '../config'
import { getRepoInfo } from '../git'

const initCommand = defineCommand({
  name: 'init',
  description: 'One-time setup for wt',
  handler: async () => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      
      const configExists = await Bun.file(CONFIG_FILE).exists()
      
      let config: WtConfig = { ...DEFAULT_CONFIG }
      
      if (configExists) {
        const existingConfig = JSON.parse(await Bun.file(CONFIG_FILE).text()) as WtConfig
        config = { ...DEFAULT_CONFIG, ...existingConfig }
        
        console.log(formatWarning(
          'wt is already configured',
          `Current postfix: ${config.postfix}`
        ))
        
        const shouldReconfigure = await promptConfirm('Do you want to reconfigure?', false)
        if (!shouldReconfigure) {
          console.log(formatSuccess('No changes made'))
          return
        }
      }
      
      console.log('\nWelcome to wt! Let’s configure your worktree setup.\n')
      
      const postfix = await promptText(
        'What postfix for worktree directory?',
        config.postfix
      )
      
      const newConfig: WtConfig = {
        postfix,
        copyFiles: [],
        prepare: []
      }
      
      await Bun.write(CONFIG_FILE, JSON.stringify(newConfig, null, 2))
      
      console.log('\n' + formatSuccess('wt initialized!'))
      
      const repoInfo = await getRepoInfo()
      const projectName = repoInfo.rootPath.split('/').pop() || ''
      
      console.log('\nSummary:')
      console.log(`  Postfix: ${postfix}`)
      console.log(`  Worktrees location: ${projectName}${postfix}/ (sibling directory)`)
      console.log(`  Config: ${CONFIG_FILE}`)
      
      console.log('\n💡 Tip: Worktrees are stored outside your repo (no .gitignore needed)')
      
      console.log('\nWhat next:')
      console.log(`  1. Edit ${CONFIG_FILE}  Configure copyFiles and prepare`)
      console.log(`  2. wt <branch>        Create or switch to a worktree`)
      console.log(`  3. wt --help          See all commands`)
      
    } catch (error) {
      handleError(error)
    }
  }
})

export default initCommand
