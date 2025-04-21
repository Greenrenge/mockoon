import config from '../config'
import { mustLogin } from '../mixins/mustLogin'
import { AuthContextMeta } from '../types/common'

export default {
	name: 'mockoon',
	settings: {
		rest: ['/'],
	},
	mixins: [mustLogin('user')],
	actions: {
		user: {
			rest: 'GET /user',
			visibility: 'published',
			handler(ctx: AuthContextMeta) {
				return ctx.meta.user
			},
		},
		remoteconfig: {
			rest: 'POST /remoteconfig',
			visibility: 'published',
			handler() {
				return {
					enableTelemetry: false,
					geoipEndpoint: 'http://ip-api.com/json/',
					cloudSyncUrl: config.configuration.wsFullUrl,
					deployUrl: config.configuration.deployUrl,
				}
			},
		},
	},
}
