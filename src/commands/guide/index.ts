import type { Command } from '../../commands.js'

const guide = {
  type: 'local-jsx',
  name: 'guide',
  description: 'Show execution profile and guidance strategy',
  load: () => import('./guide.js'),
} satisfies Command

export default guide
