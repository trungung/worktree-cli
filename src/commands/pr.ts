import { defineCommand } from '@bunli/core'

const prCommand = defineCommand({
  name: 'pr',
  description: 'Create worktree from PR (optional capability tier)',
  handler: async ({ positional }) => {
    const [prNumber] = positional
    if (!prNumber) {
      console.log('✗ Error: PR number required\n→ Usage: wt pr <number>')
      return
    }
    console.log(`✓ wt pr ${prNumber} - placeholder`)
  }
})

export default prCommand
