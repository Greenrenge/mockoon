import crypto from 'crypto'
import { ServiceSchema } from 'moleculer'

interface ComputeParams {
	data: any
}

const HashService: ServiceSchema = {
	name: 'hash',
	actions: {
		/**
		 * Compute hash for data
		 */
		compute: {
			params: {
				data: { type: 'any' },
			},
			handler(ctx: { params: ComputeParams }): string {
				const data = JSON.stringify(ctx.params.data)
				return crypto.createHash('sha256').update(data).digest('hex')
			},
		},
	},
}

export default HashService
