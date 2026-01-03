import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

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
    const [branchName] = positional
    if (!branchName) {
      console.log('✗ Error: branch name required\n→ Usage: wt <branch>')
      return
    }
    const fromStr = flags.from ? ` --from ${flags.from}` : ''
    console.log(`✓ wt ${branchName}${fromStr} - placeholder`)
  }
})

export default branchCommand
