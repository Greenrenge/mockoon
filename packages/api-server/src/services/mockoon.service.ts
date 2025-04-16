import { mustLogin } from '../mixins/mustLogin'
import { AuthContextMeta } from '../types/common'
// export type UserProfile = {
// 	displayName?: string;
//       };

//       export type User = {
// 	uid: string;
// 	email: string;
// 	plan: Plans;
// 	teamId: string;
// 	teamRole: TeamRoles;
// 	deployInstancesQuota: number;
// 	deployInstancesQuotaUsed: number;
// 	cloudSyncItemsQuota: number;
// 	cloudSyncItemsQuotaUsed: number;
// 	cloudSyncSizeQuota: number;
// 	cloudSyncHighestMajorVersion: number | null;
// 	templatesQuota: number;
// 	templatesQuotaUsed: number;
// 	nextQuotaResetOn: number;
// 	subscription: {
// 	  trial?: boolean;
// 	  provider?: 'stripe' | 'paddle' | 'free' | 'manual';
// 	  frequency?: Frequency;
// 	  createdOn: number;
// 	  renewOn: number;
// 	  portalEnabled?: boolean;
// 	  cancellationScheduled?: boolean;
// 	  pastDue?: boolean;
// 	  subscriptionId: string;
// 	};
//       } & UserProfile;

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
				const user = ctx.meta.user!

				return {
					uid: user.id,
					email: user.email,
					plan: 'ENTERPRISE',
					teamId: 'F1',
					teamRole: 'owner',
					deployInstancesQuota: 3,
					deployInstancesQuotaUsed: 0,
					cloudSyncItemsQuota: 999,
					cloudSyncItemsQuotaUsed: 0,
					cloudSyncSizeQuota: 15000000, // 15MB
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
					displayName: user.user_metadata?.preferred_username || user.user_metadata?.full_name,
				}
			},
		},
		remoteconfig: {
			rest: 'POST /remoteconfig',
			visibility: 'published',
			handler() {
				return {
					enableTelemetry: false,
					geoipEndpoint: 'http://ip-api.com/json/',
					cloudSyncUrl: 'ws://localhost:5003',
					deployUrl: 'http://localhost:6000', // TODO: GREEN
				}
			},
		},
	},
}
