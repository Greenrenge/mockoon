import 'dotenv/config'

export default {
	supabase: {
		url: process.env.SUPABASE_URL || '',
		anonKey: process.env.SUPABASE_ANON_KEY || '',
		serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
	},
	postgres: {
		host: process.env.POSTGRES_HOST || 'localhost',
		port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
		database: process.env.POSTGRES_DB || 'postgres',
		username: process.env.POSTGRES_USER || 'postgres',
		password: process.env.POSTGRES_PASSWORD || '1234',
		ssl: process.env.POSTGRES_SSL === 'true',
	},
	environment: {
		syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10),
	},
	configuration: {
		baseUrl: process.env.BASE_URL || 'http://localhost',
		apiPort: parseInt(process.env.API_PORT || '5003', 10),
		wsPort: parseInt(process.env.WS_PORT || '4001', 10),
	},
}
