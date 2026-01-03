import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'

const pruneCommand = defineCommand({
  name: 'prune',
  description: 'Remove stale worktrees',
  options: {
    apply: option(
      z.boolean().default(false),
      {
        description: 'Actually remove worktrees (default is dry-run)'
      }
    )
  },
  handler: async ({ flags }) => {
    console.log(`✓ wt prune${flags.apply ? ' --apply' : ''} - placeholder`)
  }
})

export default pruneCommand
