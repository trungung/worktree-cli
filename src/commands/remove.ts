import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

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
    const [branchName] = positional
    if (!branchName) {
      console.log('✗ Error: branch name required\n→ Usage: wt remove <branch>')
      return
    }
    console.log(`✓ wt remove ${branchName}${flags.branch ? ' --branch' : ''} - placeholder`)
  }
})

export default removeCommand
