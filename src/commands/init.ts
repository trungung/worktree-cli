import { defineCommand } from '@bunli/core'

const initCommand = defineCommand({
  name: 'init',
  description: 'One-time setup for wt',
  handler: async () => {
    console.log('✓ wt init - placeholder')
  }
})

export default initCommand
