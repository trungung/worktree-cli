import { defineConfig } from '@bunli/core'

export default defineConfig({
  name: '@trungung/wt',
  version: '0.1.0',
  description: 'Zen Git Worktree Manager — Think branches, not paths',
  
  commands: {
    directory: './src/commands'
  },
  
  build: {
    entry: './src/index.ts',
    outdir: './dist',
    targets: [],
    minify: true,
    sourcemap: true,
    compress: false
  },


  release: {
    npm: true,
    github: true,
    tagFormat: 'v${version}',
    conventionalCommits: true
  },
  
  dev: {
    watch: true,
    inspect: true
  },
  
  test: {
    pattern: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: true,
    watch: false
  },

  plugins: [],
})
