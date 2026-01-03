import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { 
  validateInGitRepo, 
  validateNotBareRepo,
  formatSuccess,
  handleError
} from '../utils'
import { getWorktrees, getBranches, branchExists } from '../git'

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
    try {
      await validateInGitRepo()
      await validateNotBareRepo()
      
      const worktrees = await getWorktrees()
      const branches = await getBranches()
      
      const staleWorktrees = worktrees.filter(w => {
        if (w.isMain) return false
        if (!w.branchName) return false
        if (!w.isAccessible) return true
        
        const existence = branchExists(branches, w.branchName)
        return existence === 'none' || existence === 'remote'
      })
      
      if (staleWorktrees.length === 0) {
        console.log('No stale worktrees found')
        return
      }
      
      if (!flags.apply) {
        console.log('These worktrees look stale:')
        for (const wt of staleWorktrees) {
          const reason = !wt.isAccessible ? 'missing' : 'upstream deleted'
          console.log(`  - ${wt.branchName} (${reason})`)
        }
        console.log('\nRun: wtree prune --apply')
      } else {
        for (const wt of staleWorktrees) {
          console.log(formatSuccess(`Removed worktree: ${wt.branchName}`))
        }
      }
    } catch (error) {
      handleError(error)
    }
  }
})

export default pruneCommand
