import { glob } from 'glob'
import * as fs from 'fs/promises'

export async function copyFilesToWorktree(
  sourceRoot: string,
  targetRoot: string,
  patterns: string[]
): Promise<{ copied: string[] }> {
  const copied: string[] = []
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: sourceRoot,
      dot: true,
      nodir: true
    })
    
    for (const file of files) {
      const sourcePath = `${sourceRoot}/${file}`
      const targetPath = `${targetRoot}/${file}`
      
      const exists = await fs.access(targetPath).then(() => true).catch(() => false)
      if (exists) {
        continue
      }
      
      const dirPath = file.split('/').slice(0, -1).join('/')
      if (dirPath) {
        await fs.mkdir(`${targetRoot}/${dirPath}`, { recursive: true })
      }
      await fs.copyFile(sourcePath, targetPath)
      copied.push(file)
    }
  }
  
  return { copied }
}
