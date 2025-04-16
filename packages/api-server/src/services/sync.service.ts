// sync.service.ts
import {
	BaseSyncAction,
	Plans,
	SyncActions,
	SyncErrors,
	SyncMessageTypes,
	User,
} from '@mockoon/cloud'
import SocketIOService from 'moleculer-io'
import { Socket } from 'socket.io'
import { AppService, AppServiceSchema } from '../types/common'

// Define custom socket interface with our properties
interface CustomSocket extends Socket {
	deviceId: string
	appVersion: string
	highestMigrationId: string
	user: User
}

const SyncService: AppServiceSchema = {
	name: 'sync',
	mixins: [SocketIOService as any],
	settings: {
		//@ts-ignore
		port: process.env.SOCKET_PORT || 3000,
		io: {
			options: {
				transports: ['websocket'],
			},
			namespaces: {
				'/': {
					middlewares: [
						// Middleware to handle authentication
						function (this: AppService, socket: CustomSocket, next: (err?: Error) => void) {
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
								return next(new Error(SyncErrors.UNAUTHORIZED))
							}

							// Validate token with your auth service
							this.broker
								.call('auth.validateToken', { token })
								.then((unTypedUser) => {
									if (!unTypedUser) {
										return next(new Error(SyncErrors.UNAUTHORIZED))
									}
									const user = unTypedUser as User

									// Check if user plan is not free
									if (user.plan === Plans.FREE) {
										return next(new Error(SyncErrors.UNAUTHORIZED))
									}

									// Check if device count exceeds limit
									this.broker.call('devices.count', { userId: user.uid }).then((count: any) => {
										// if (count > user.deviceLimit) {
										// 	return next(new Error(SyncErrors.TOO_MANY_DEVICES))
										// }

										// Store user on socket
										socket.user = user
										next()
									})
								})
								.catch((err) => {
									this.logger.error('Authentication error', err)
									next(new Error(SyncErrors.UNAUTHORIZED))
								})
						},
					],
					events: {
						// Handle initial connection
						connection: function (this: AppService, socket: CustomSocket) {
							// Register device
							this.broker.call('devices.register', {
								deviceId: socket.deviceId,
								userId: socket.user.uid,
								version: socket.appVersion,
							})

							// Add socket to user's room for broadcasting
							socket.join(`user:${socket.user.uid}`)

							// Send connected message with migration status
							const migrationNeeded = false

							socket.emit(SyncMessageTypes.CONNECTED, {
								migrated: migrationNeeded,
							})

							// // Update presence
							// this.updatePresence(socket.user.uid)
						},

						// Handle disconnect
						disconnect: function (this: AppService, socket: CustomSocket) {
							this.broker.call('devices.unregister', {
								deviceId: socket.deviceId,
								userId: socket.user.uid,
							})

							// Update presence after disconnect
							// this.updatePresence(socket.user.uid)
						},

						// Handle time sync request
						[SyncMessageTypes.TIME]: function (
							socket: CustomSocket,
							data: any,
							respond: (data: BaseSyncAction) => void,
						) {
							respond({ timestamp: Date.now() })
						},

						// Handle environment list request
						[SyncMessageTypes.ENV_LIST]: function (this: AppService, socket: CustomSocket) {
							socket.emit(SyncMessageTypes.ENV_LIST, [])
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
							this: AppService,
							socket: CustomSocket,
							action: SyncActions,
							respond: (data: any) => void,
						) {
							this.logger.info('Sync action received:', action)
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

	methods: {
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

export = SyncService
