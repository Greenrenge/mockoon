import { deterministicStringify } from '@mockoon/commons'
import { createHash } from 'crypto'
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
				const data = deterministicStringify(ctx.params.data)
				return createHash('sha1').update(data, 'utf-8').digest('hex')
			},
		},
	},
}

export default HashService
