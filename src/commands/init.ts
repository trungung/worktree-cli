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
  description: 'One-time setup for wtree',
  handler: async () => {
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      
      const repoInfo = await getRepoInfo()
      const configExists = await Bun.file(CONFIG_FILE).exists()
      
      let config: WtConfig = { ...DEFAULT_CONFIG }
      
      if (configExists) {
        const existingConfig = JSON.parse(await Bun.file(CONFIG_FILE).text()) as WtConfig
        config = { ...DEFAULT_CONFIG, ...existingConfig }
        
        console.log(formatWarning(
          'wtree is already configured',
          `Current directory: ${config.directory}`
        ))
        
        const shouldReconfigure = await promptConfirm('Do you want to reconfigure?', false)
        if (!shouldReconfigure) {
          console.log(formatSuccess('No changes made'))
          return
        }
      }
      
      console.log('\nWelcome to wtree! Let’s configure your worktree setup.\n')
      
      const directory = await promptText(
        'Where should worktrees live?',
        config.directory
      )
      
      const gitignorePath = '.gitignore'
      let gitignoreContent = ''
      
      const gitignoreExists = await Bun.file(gitignorePath).exists()
      if (gitignoreExists) {
        gitignoreContent = await Bun.file(gitignorePath).text()
      }
      
      const normalizedDir = directory.replace(/^\//, '')
      const patterns = [normalizedDir, `${normalizedDir}/`]
      
      const needsUpdate = !patterns.some(p => gitignoreContent.includes(p))
      
      if (needsUpdate) {
        if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
          gitignoreContent += '\n'
        }
        gitignoreContent += `\n# wtree worktrees\n${normalizedDir}/\n`
        await Bun.write(gitignorePath, gitignoreContent)
      }
      
      const gitignoreUpdated = needsUpdate
      
      const newConfig: WtConfig = {
        directory,
        copyFiles: [],
        prepare: []
      }
      
      await Bun.write(CONFIG_FILE, JSON.stringify(newConfig, null, 2))
      
      const dirPath = directory.startsWith('/') ? directory : `${repoInfo.rootPath}/${directory}`
      await Bun.$`mkdir -p ${dirPath}`.quiet().nothrow()
      
      console.log('\n' + formatSuccess('wtree initialized!'))
      
      console.log('\nSummary:')
      console.log(`  Directory: ${directory}`)
      console.log(`  Config: ${CONFIG_FILE}`)
      if (gitignoreUpdated) {
        console.log(`  .gitignore: ${directory}/ added (best practice for git worktrees)`)
      }
      
      console.log('\n💡 Tip: You can safely commit wt.config.json and .gitignore')
      
      console.log('\nWhat next:')
      console.log(`  1. Edit ${CONFIG_FILE}  Configure copyFiles and prepare`)
      console.log(`  2. wtree <branch>        Create or switch to a worktree`)
      console.log(`  3. wtree --help          See all commands`)
      
    } catch (error) {
      handleError(error)
    }
  }
})

export default initCommand
