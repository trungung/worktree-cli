import { WtConfig, DEFAULT_CONFIG, CONFIG_FILE } from './types'

export async function loadConfig(): Promise<WtConfig> {
  const configExists = await Bun.file(CONFIG_FILE).exists()
  
  if (!configExists) {
    return { ...DEFAULT_CONFIG }
  }
  
  try {
    const configContent = await Bun.file(CONFIG_FILE).text()
    const parsed = JSON.parse(configContent) as Partial<WtConfig>
    
    return {
      ...DEFAULT_CONFIG,
      ...parsed
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function getWorktreePath(repoRoot: string, postfix: string): string {
  const parentDir = repoRoot.split('/').slice(0, -1).join('/')
  const projectName = repoRoot.split('/').pop() || ''
  return `${parentDir}/${projectName}${postfix}`
}
