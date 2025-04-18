import { ServiceSchema } from 'moleculer'
import { calcHash } from '../libs/hash'
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
				return calcHash(ctx.params.data)
			},
		},
	},
}

export default HashService
