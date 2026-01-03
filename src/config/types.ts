export interface WtConfig {
  postfix: string
  copyFiles: string[]
  prepare: string[]
}

export const DEFAULT_CONFIG: WtConfig = {
  postfix: '.worktrees',
  copyFiles: [],
  prepare: []
}

export const CONFIG_FILE = 'wt.config.json'
