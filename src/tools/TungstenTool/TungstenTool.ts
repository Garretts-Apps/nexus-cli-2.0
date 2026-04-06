// TungstenTool - placeholder stub
import { buildTool } from '../../Tool.js'
import { z } from 'zod/v4'

export const TungstenTool = buildTool({
  name: 'Tungsten',
  description: 'Tungsten tool (placeholder)',
  inputSchema: z.object({
    input: z.string().describe('Input'),
  }),
  async *call() {
    throw new Error('TungstenTool is not implemented')
  },
})
