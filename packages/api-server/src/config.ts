import fs from 'fs'
const dataPath = process.env.DB_PATH_SQLITE || './data'

export default {
	keycloak: {
		url: process.env.KEYCLOAK_URL || 'http://localhost:8080/auth',
		clientId: process.env.KEYCLOAK_CLIENT_ID || 'api',
		realm: process.env.KEYCLOAK_REALM || 'master',
	},
	supabase: {
		url: process.env.SUPABASE_URL || '',
		anonKey: process.env.SUPABASE_ANON_KEY || '',
		serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
	},
	database: {
		dialect: process.env.DB_DRIVER || 'sqlite', //'mysql'|'sqlite'|'postgres'|'mssql',
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT || '5432', 10),
		database: process.env.DB_NAME || 'postgres',
		username: process.env.DB_USER || 'postgres',
		password: process.env.DB_PASSWORD || '1234',
		ssl: process.env.DB_SSL === 'true',
		storage: dataPath === ':memory:' ? ':memory:' : dataPath,
	},
	environment: {
		syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '10000', 10),
	},
	configuration: {
		authProvider: process.env.AUTH_PROVIDER || ('disabled' as 'supabase' | 'keycloak' | 'disabled'),
		apiPort: parseInt(process.env.API_PORT || '8080', 10),
		wsPort: parseInt(process.env.WS_PORT || '8081', 10),
		wsFullUrl:
			process.env.WS_FULL_URL || `ws://localhost:${parseInt(process.env.WS_PORT || '8081', 10)}`,
		webFullUrl:
			process.env.WEB_FULL_URL ||
			`http://localhost:${parseInt(process.env.API_PORT || '8080', 10)}`,
		instanceUrlPattern: process.env.INSTANCE_URL_PATTERN || 'http://localhost:{{PORT}}',
	},
}

if (process.env.DB_DRIVER === 'sqlite') {
	if (!fs.existsSync(dataPath)) {
		fs.mkdirSync(dataPath, { recursive: true })
	}
}

export function buildRemoteInstanceUrl(instanceUrlPattern: string, port: number): string {
	// Replace {{PORT}} with the actual port number
	return instanceUrlPattern.replace(/{{PORT}}/g, port.toString())
}
