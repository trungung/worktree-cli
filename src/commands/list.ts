import { defineCommand } from '@bunli/core'

const listCommand = defineCommand({
  name: 'list',
  description: 'List all worktrees',
  handler: async () => {
    console.log('✓ wt list - placeholder')
  }
})

export default listCommand
