import { ServiceSchema } from 'moleculer'

export default {
	name: 'mockoon',
	version: 1,
	settings: {
		rest: ['/'],
	},
	actions: {
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
} as ServiceSchema
