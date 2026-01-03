export interface WtConfig {
  directory: string
  copyFiles: string[]
  prepare: string[]
}

export const DEFAULT_CONFIG: WtConfig = {
  directory: '.worktrees',
  copyFiles: [],
  prepare: []
}

export const CONFIG_FILE = 'wt.config.json'
