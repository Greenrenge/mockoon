import { mustLogin } from '../mixins/mustLogin'
import { AuthContextMeta } from '../types/common'
export default {
	name: 'mockoon',
	version: 1,
	settings: {
		rest: ['/'],
	},
	mixins: [mustLogin('user')],
	actions: {
		user: {
			rest: 'GET /user',
			visibility: 'published',
			handler(ctx: AuthContextMeta) {
				const user = ctx.meta.user
				console.log('ctx', ctx.meta)
				return {
					...user,
				}
			},
		},
		remoteconfig: {
			rest: 'POST /remoteconfig',
			visibility: 'published',
			handler() {
				return {
					enableTelemetry: false,
					geoipEndpoint: '',
					cloudSyncUrl: '',
					deployUrl: '',
				}
			},
		},
	},
}
