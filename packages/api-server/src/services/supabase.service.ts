import supabase from '../supabase'
import { AuthContextMeta } from '../types/common'

export default {
	name: 'supabase',
	version: 1,
	actions: {
		getUser: {
			params: {
				token: { type: 'string', optional: true },
			},
			cache: {
				ttl: 5 * 60,
			},
			handler(ctx: AuthContextMeta) {
				return supabase.auth.getUser(ctx.params.token)
			},
		},
	},
}
