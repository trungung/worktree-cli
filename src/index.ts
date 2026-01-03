#!/usr/bin/env bun
import { createCLI } from '@bunli/core'
import initCommand from './commands/init.js'
import listCommand from './commands/list.js'
import removeCommand from './commands/remove.js'
import pruneCommand from './commands/prune.js'
import branchCommand from './commands/branch.js'
import prCommand from './commands/pr.js'

const cli = await createCLI({
  name: 'wt',
  version: '0.1.0',
  description: 'Zen Git Worktree Manager — Think branches, not paths'
})

cli.command(initCommand)
cli.command(listCommand)
cli.command(removeCommand)
cli.command(pruneCommand)
cli.command(prCommand)
cli.command(branchCommand)

const knownCommands = ['init', 'list', 'remove', 'prune', 'pr', 'branch']

function preprocessArgs(args: string[]): string[] {
  if (args.length === 0) return args
  
  const [firstArg] = args
  
  if (firstArg === '--help' || firstArg === '--version' || firstArg === '-h' || firstArg === '-v') {
    return args
  }
  
  if (firstArg.startsWith('--') || firstArg.startsWith('-')) {
    return args
  }
  
  if (!knownCommands.includes(firstArg)) {
    return ['branch', ...args]
  }
  
  return args
}

const processedArgs = preprocessArgs(process.argv.slice(2))
await cli.run(processedArgs)
