import {
	OpenApiMixin,
	type MoleculerWebTypes,
	type OpenApiMixinSettings,
} from '@spailybot/moleculer-auto-openapi'
import { ServiceSchema } from 'moleculer'

const OpenApiService: ServiceSchema<OpenApiMixinSettings & MoleculerWebTypes.RestServiceSettings> =
	{
		// Choose your preferred name
		name: 'openapi',
		mixins: [OpenApiMixin],
		settings: {
			// Set the path as you prefer
			rest: '/openapi',
			// Path to the endpoint that returns the JSON
			// With autoalias, it's exposed on /openapi.json
			schemaPath: '/openapi/openapi.json',
			// This will be the root of your document
			// use it to define some default informations
			openapi: {
				info: {
					title: 'API',
					version: '0.1.0',
				},
			},
		},
	}
export default OpenApiService
