import supabase from '../supabase'
import { AppServiceSchema, AuthContextMeta } from '../types/common'

const AuthService: AppServiceSchema = {
	name: 'auth',
	actions: {
		getServiceRoleUser: {
			visibility: 'public',
			handler(ctx: AuthContextMeta) {
				return {
					id: 'service-role',
					uid: 'service-role',
					email: 'service-role',
					plan: 'ENTERPRISE',
					teamId: 'F1',
					teamRole: 'owner',
					deployInstancesQuota: 10,
					deployInstancesQuotaUsed: 0,
					cloudSyncItemsQuota: 999,
					cloudSyncItemsQuotaUsed: 0,
					cloudSyncSizeQuota: 100000000, // 100MB
					cloudSyncHighestMajorVersion: 1,
					templatesQuota: 999,
					templatesQuotaUsed: 0,
					nextQuotaResetOn: 1,
					subscription: {
						trial: false,
						provider: 'manual',
						frequency: 'YEARLY',
						createdOn: 1744777380227,
						renewOn: 4079996600352,
						portalEnabled: true,
						cancellationScheduled: false,
						pastDue: false,
						subscriptionId: 'F1',
					},
					displayName: 'Admin Service Role',
				}
			},
		},
		/**
		 * Validate token
		 */
		validateToken: {
			params: {
				token: { type: 'string', optional: true },
			},
			cache: {
				keys: ['token'],
				ttl: 5 * 60,
			},
			async handler(ctx: AuthContextMeta) {
				try {
					const res = await supabase.auth.getUser(ctx.params.token)
					if (!res?.data?.user || res.error) {
						this.logger.error('User not found')
						return null
					}

					// Get user from database
					return {
						id: res.data.user.id,
						uid: res.data.user.id,
						email: res.data.user.email,
						plan: 'ENTERPRISE',
						teamId: 'F1',
						teamRole: 'owner',
						deployInstancesQuota: 10,
						deployInstancesQuotaUsed: 0,
						cloudSyncItemsQuota: 999,
						cloudSyncItemsQuotaUsed: 0,
						cloudSyncSizeQuota: 100000000, // 100MB
						cloudSyncHighestMajorVersion: 1,
						templatesQuota: 999,
						templatesQuotaUsed: 0,
						nextQuotaResetOn: 1,
						subscription: {
							trial: false,
							provider: 'manual',
							frequency: 'YEARLY',
							createdOn: 1744777380227,
							renewOn: 4079996600352,
							portalEnabled: true,
							cancellationScheduled: false,
							pastDue: false,
							subscriptionId: 'F1',
						},
						displayName:
							res.data.user.user_metadata?.preferred_username ||
							res.data.user.user_metadata?.full_name,
					}
				} catch (err) {
					this.logger.error('Token validation error', err)
					return null
				}
			},
		},
	},
}

export default AuthService
