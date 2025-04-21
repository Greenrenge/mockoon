import dotenv from 'dotenv'

dotenv.config()

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
		apiPort: parseInt(process.env.API_PORT || '5003', 10),
		wsPort: parseInt(process.env.WS_PORT || '4001', 10),
		wsFullUrl: process.env.WS_FULL_URL || 'ws://localhost:4001',
		deployUrl: process.env.DEPLOY_URL || 'http://localhost:5003/api',
		instanceUrlPattern: process.env.INSTANCE_URL_PATTERN || 'http://localhost:{{PORT}}',
	},
}

export function buildRemoteInstanceUrl(instanceUrlPattern: string, port: number): string {
	// Replace {{PORT}} with the actual port number
	return instanceUrlPattern.replace(/{{PORT}}/g, port.toString())
}
