import { randomUUID } from 'crypto'
import config from '../config'
import { verifyJWT } from '../libs/keycloak-jwks'
import { SERVICE_ROLE } from '../libs/saas-plan'
import supabase from '../supabase'
import { AppServiceSchema, AuthContextMeta } from '../types/common'

const AuthService: AppServiceSchema = {
	name: 'auth',
	actions: {
		getServiceRoleUser: {
			visibility: 'public',
			handler(ctx: AuthContextMeta) {
				//TODO: call saas service to get the service role user
				return SERVICE_ROLE
			},
		},
		/**
		 * Validate token
		 */
		validateToken: {
			params: {
				token: { type: 'string', optional: true },
			},
			cache:
				config.configuration.authProvider === 'disabled'
					? false
					: {
							keys: ['token'],
							ttl: 2 * 60,
						},
			async handler(ctx: AuthContextMeta) {
				if (config.configuration.authProvider === 'supabase') {
					try {
						const res = await supabase?.auth.getUser(ctx.params.token)
						if (!res?.data?.user || res.error) {
							this.logger.error('User not found')
							return null
						}

						// Get user from database
						return {
							id: res.data.user.id,
							email: res.data.user.email,
							displayName:
								res.data.user.user_metadata?.preferred_username ||
								res.data.user.user_metadata?.full_name,
						}
					} catch (err) {
						this.logger.error('Token validation error', err)
						return null
					}
				} else if (config.configuration.authProvider === 'keycloak') {
					try {
						const payload = await verifyJWT(ctx.params.token)
						if (!payload) {
							this.logger.error('User not found')
							return null
						}

						// Get user from database
						return {
							id: payload.sub,
							uid: payload.sub,
							email: payload.email,
							displayName: payload.preferred_username || payload.name || payload.email,
						}
					} catch (err) {
						this.logger.error('Token validation error', err)
						return null
					}
				} else if (config.configuration.authProvider === 'disabled') {
					// If auth is disabled, return a dummy user
					const id = randomUUID()
					return {
						id: id,
						uid: id,
						email: 'anonymous@any.com',
						displayName: 'Anonymous',
					}
				}
			},
		},
	},
}

export default AuthService
