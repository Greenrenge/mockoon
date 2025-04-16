// sync.service.ts
import { BaseSyncAction, SyncActions, SyncErrors, SyncMessageTypes, User } from '@mockoon/cloud'
import SocketIOService from 'moleculer-io'
import { Socket } from 'socket.io'
import { AppService, AppServiceSchema, AuthContextMeta } from '../types/common'

// Define custom socket interface with our properties
interface CustomSocket extends Socket {
	deviceId: string
	appVersion: string
	highestMigrationId: string
	user: User
	$service: AppService // Reference to the service instance
}

const SyncService: AppServiceSchema = {
	name: 'socket-io',
	mixins: [SocketIOService as any],
	settings: {
		//@ts-ignore
		port: process.env.SOCKET_PORT || 4001,
		io: {
			namespaces: {
				'/': {
					authorization: true, // add authorization middleware (socketAuthorize method)
					middlewares: [],
					events: {
						// Handle disconnect
						disconnect: function (this: CustomSocket) {
							console.log('Disconnected: deviceId', this.deviceId)
							console.log('Disconnected: userId', this.user.uid)
							const service = this.$service as AppService
							service.broker.call('devices.unregister', {
								deviceId: this.deviceId,
								userId: this.user.uid,
							})

							// TODO: Update presence after disconnect
							// this.updatePresence(socket.user.uid)
						},
						// Handle time sync request
						[SyncMessageTypes.TIME]: function (
							this: CustomSocket,
							respond: (data: BaseSyncAction) => void,
						) {
							respond({ timestamp: Date.now() })
						},

						// Handle environment list request
						[SyncMessageTypes.ENV_LIST]: function (this: CustomSocket) {
							this.emit(SyncMessageTypes.ENV_LIST, [])
							// this.broker
							// 	.call('environments.list', { userId: socket.user.uid })
							// 	.then((environments: any[]) => {
							// 		socket.emit(SyncMessageTypes.ENV_LIST, environments)
							// 		//TODO: GREEN
							// 		// type EnvironmentsListPayload = {
							// 		// 	environmentUuid: string;
							// 		// 	hash: string;
							// 		//     }[];
							// 	})
							// 	.catch((err: Error) => {
							// 		this.logger.error('Error fetching environments', err)
							// 	})
						},

						// Handle sync actions
						[SyncMessageTypes.SYNC]: function (
							this: CustomSocket,
							action: SyncActions,
							respond: (data: any) => void,
						) {
							this.$service.logger.info('Sync action received:', action)
							// Process the sync action based on its type
							// switch (action.type) {
							// 	case 'GET_FULL_ENVIRONMENT':
							// 		this.handleGetFullEnvironment(socket, action, respond)
							// 		break

							// 	case 'UPDATE_FULL_ENVIRONMENT':
							// 		this.handleUpdateFullEnvironment(socket, action, respond)
							// 		break

							// 	// Handle other sync action types
							// 	default:
							// 		this.handleGenericSyncAction(socket, action, respond)
							// }
						},
					},
				},
			},
		},
	},
	actions: {
		afterConnected: {
			params: {
				deviceId: 'string',
				userId: 'string',
				version: 'string',
				highestMigrationId: 'string|optional',
			},
			async handler(this: AppService, ctx: AuthContextMeta) {},
		},
	},
	methods: {
		// check only at namespace level
		async socketAuthorize(this: AppService, socket, handler) {
			const deviceId = socket.handshake.query.deviceId as string
			const version = socket.handshake.query.version as string
			const highestMigrationId = socket.handshake.query.highestMigrationId as string

			// Store these on the socket for later use
			socket.deviceId = deviceId
			socket.appVersion = version
			socket.highestMigrationId = highestMigrationId

			// Check authentication token
			const token = socket.handshake.auth.token as string

			if (!token) {
				throw new Error(SyncErrors.UNAUTHORIZED)
			}
			const user = (await this.broker.call('auth.validateToken', { token })) as User
			if (!user) {
				throw new Error(SyncErrors.UNAUTHORIZED)
			}
			socket.user = user

			await this.broker.call('devices.register', {
				deviceId: deviceId,
				userId: user.uid,
				version: version,
			})

			// Add socket to user's room for broadcasting
			socket.join(`user:${user.uid}`)
			if (user.teamId) {
				// Add socket to user's team room for broadcasting
				socket.join(`team:${user.teamId}`)
			}

			// Send connected message with migration status
			const migrationNeeded = false

			socket.emit(SyncMessageTypes.CONNECTED, {
				migrated: migrationNeeded,
			})

			//TODO: Update presence
			// this.updatePresence(socket.user.uid)
			return user
		},
		// /**
		//  * Update presence information for all connected clients
		//  */
		// updatePresence(userId: string): void {
		// 	this.broker.call('users.getPresence', { userId }).then((presenceData: any) => {
		// 		// Broadcast presence update to all connected clients for this user
		// 		this.io.to(`user:${userId}`).emit(SyncMessageTypes.PRESENCE, presenceData)
		// 		// TODO: GREEN
		// 		// {
		// 		// 	devices:1,
		// 		// 	users: [{
		// 		// 		uid?: string;
		// 		// 		email?: string;
		// 		// 		displayName?: string;
		// 		// 		environmentUuid?: string;
		// 		// 		cssColor?: string;
		// 		// 	}]
		// 		// }
		// 	})
		// },
		// /**
		//  * Handle GET_FULL_ENVIRONMENT action
		//  */
		// handleGetFullEnvironment(
		// 	socket: CustomSocket,
		// 	action: any,
		// 	respond: (data: any) => void,
		// ): void {
		// 	this.broker
		// 		.call('environments.get', {
		// 			environmentUuid: action.environmentUuid,
		// 			userId: socket.user.uid,
		// 		})
		// 		.then((environment: any) => {
		// 			// Calculate hash of the environment
		// 			return this.broker.call('hash.compute', { data: environment }).then((hash: string) => {
		// 				// Send the environment data to the client
		// 				socket.emit(SyncMessageTypes.SYNC, {
		// 					type: 'FULL_ENVIRONMENT',
		// 					timestamp: Date.now(),
		// 					environmentUuid: action.environmentUuid,
		// 					environment: environment,
		// 					receive: action.receive,
		// 				})
		// 				// Acknowledge the action
		// 				respond({ hash })
		// 			})
		// 		})
		// 		.catch((err: Error) => {
		// 			this.logger.error('Error fetching environment', err)
		// 			respond({ error: 'ENVIRONMENT_NOT_FOUND' })
		// 		})
		// },
		// /**
		//  * Handle UPDATE_FULL_ENVIRONMENT action
		//  */
		// handleUpdateFullEnvironment(
		// 	socket: CustomSocket,
		// 	action: any,
		// 	respond: (data: any) => void,
		// ): void {
		// 	// Check if environment size exceeds quota
		// 	const environmentSize = JSON.stringify(action.environment).length
		// 	if (environmentSize > socket.user.cloudSyncSizeQuota) {
		// 		return respond({ error: SyncErrors.ENVIRONMENT_TOO_LARGE })
		// 	}
		// 	// Check if total environments would exceed quota
		// 	this.broker
		// 		.call('environments.count', { userId: socket.user.uid })
		// 		.then((count: number) => {
		// 			if (count >= socket.user.cloudSyncItemsQuota) {
		// 				return respond({ error: SyncErrors.QUOTA_EXCEEDED })
		// 			}
		// 			// Update the environment
		// 			return this.broker
		// 				.call('environments.update', {
		// 					userId: socket.user.uid,
		// 					environmentUuid: action.environmentUuid,
		// 					environment: action.environment,
		// 				})
		// 				.then(() => {
		// 					// Calculate hash of the environment
		// 					return this.broker.call('hash.compute', { data: action.environment })
		// 				})
		// 				.then((hash: string) => {
		// 					// Broadcast the update to all connected clients except the sender
		// 					socket.to(`user:${socket.user.uid}`).emit(SyncMessageTypes.SYNC, action)
		// 					// Acknowledge the action
		// 					respond({ hash })
		// 				})
		// 		})
		// 		.catch((err: Error) => {
		// 			this.logger.error('Error updating environment', err)
		// 			respond({ error: 'UPDATE_FAILED' })
		// 		})
		// },
		// /**
		//  * Handle generic sync actions
		//  */
		// handleGenericSyncAction(
		// 	socket: CustomSocket,
		// 	action: SyncActions,
		// 	respond: (data: any) => void,
		// ): void {
		// 	// Process the action
		// 	this.broker
		// 		.call('sync.processAction', {
		// 			userId: socket.user.uid,
		// 			action,
		// 		})
		// 		.then(() => {
		// 			// Broadcast the action to all connected clients except the sender
		// 			socket.to(`user:${socket.user.uid}`).emit(SyncMessageTypes.SYNC, action)
		// 			// Acknowledge the action
		// 			respond({ success: true })
		// 		})
		// 		.catch((err: Error) => {
		// 			this.logger.error('Error processing sync action', err)
		// 			respond({ error: 'ACTION_PROCESSING_FAILED' })
		// 		})
		// },
	},
}

export default SyncService
