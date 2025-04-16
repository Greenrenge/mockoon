import { fromPairs } from 'lodash'
import { Errors, ServiceSchema } from 'moleculer'
import { AuthContextMeta } from '../types/common'

export const mustLogin = (...paths: string[]) =>
	({
		hooks: {
			before: {
				...(paths.length
					? fromPairs(paths.map((p) => [p, ['mustLoggedIn']]))
					: { '*': ['mustLoggedIn'] }),
			},
		},
		methods: {
			mustLoggedIn(ctx: AuthContextMeta) {
				if (!ctx.meta.accountId)
					throw new Errors.MoleculerClientError('Unauthorized', 401, 'UNAUTHORIZED')
			},
		},
	}) as Partial<ServiceSchema>
