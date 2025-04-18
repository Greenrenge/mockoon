// sync.service.ts
import {
	BaseSyncAction,
	SyncActions,
	SyncActionTypes,
	SyncErrors,
	SyncMessageTypes,
	User,
} from '@mockoon/cloud'
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
type ServerAcknowledgment = {
	hash?: string
	error?: string | SyncErrors
}
const SyncService: AppServiceSchema = {
	name: 'socket-io',
	mixins: [SocketIOService as any],
	dependencies: ['devices', 'auth', 'environments'],
	settings: {
		//@ts-ignore
		logRequest: 'info',
		//@ts-ignore
		logRequestParams: 'info',
		//@ts-ignore
		logResponse: 'info',
		//@ts-ignore
		log4XXResponses: 'info',
		//@ts-ignore
		logRouteRegistration: 'info',
		//@ts-ignore
		logClientConnection: 'info',
		//@ts-ignore
		logBroadcastRequest: 'info',
		//@ts-ignore
		port: process.env.SOCKET_PORT || 4001,
		io: {
			namespaces: {
				'/': {
					authorization: true, // add authorization middleware (socketAuthorize method)
					middlewares: [],
					events: {
						call: {
							// disable call event for client to call socket.emit('call',...)
							mappingPolicy: 'restrict',
						},
						// Handle disconnect
						disconnect: function (this: CustomSocket) {
							const service = this.$service as AppService
							service.broker.call(
								'devices.unregister',
								{
									deviceId: this.deviceId,
									userId: this.user.uid,
								},
								{
									//@ts-ignore
									meta: service.socketGetMeta(this),
								},
							)

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
							const service = this.$service as AppService
							service.broker
								.call<{ rows: any[] }, any>(
									'environments.list',
									{
										page: 1,
										pageSize: 100,
									},
									{
										//@ts-ignore
										meta: service.socketGetMeta(this),
									},
								)
								.then(({ rows: environments }: { rows: any[] }) => {
									service.logger.debug('environments', environments)
									this.emit(SyncMessageTypes.ENV_LIST, environments)
								})
								.catch((err: Error) => {
									service.logger.error('Error fetching environments', err)
								})
						},

						// Handle sync actions
						[SyncMessageTypes.SYNC]: function (
							this: CustomSocket,
							action: SyncActions,
							respond: (data: any) => void,
						) {
							const service = this.$service as AppService
							//TODO: if environmentUuid is sent , we need to return hash in acknowledgment
							// when CREATE is in receive --> ADD_ENVIRONMENT will be sent
							// transformedAction must be called first to check timestamp, server must have RecentActionsStore,previousActionHash inside, then saveRecentUpdateSyncAction,applySyncAction for converting to action to reducer
							this.$service.logger.info('Sync action received:', JSON.stringify(action))
							this.$service.logger.info('Sync response received:', JSON.stringify(respond))
							const { type, environmentUuid, timestamp } = action as any
							//Process the sync action based on its type

							switch (action.type) {
								case SyncActionTypes.GET_FULL_ENVIRONMENT:
									const { receive } = action as { receive: 'UPDATE' | 'CREATE' }
									// find the environment by uuid
									service.broker
										.call<any, any>(
											'environments.get',
											{
												id: environmentUuid,
											},
											{
												//@ts-ignore
												meta: service.socketGetMeta(this),
											},
										)
										.then((doc) => {
											if (!doc) {
												return respond({ error: 'Environment Not Found' })
											}
											// Calculate hash of the environment
											return service.broker
												.call<string, any>(
													'hash.compute',
													{ data: doc.payload },
													{
														//@ts-ignore
														meta: service.socketGetMeta(this),
													},
												)
												.then((hash: string) => {
													// Send the environment data to the client
													this.emit(SyncMessageTypes.SYNC, {
														type:
															receive === 'UPDATE'
																? SyncActionTypes.UPDATE_FULL_ENVIRONMENT
																: SyncActionTypes.ADD_CLOUD_ENVIRONMENT,
														timestamp: doc.timestamp,
														hash: hash,
														environment: doc.payload,
														...(receive === 'UPDATE'
															? { environmentUuid: doc.environmentUuid }
															: {}),
													})
													// Acknowledge the action
													respond({ hash })
												})
										})
										.catch((err: Error) => {
											service.logger.error('Error processing sync action', err)
											respond({ error: 'Action processing failed with error:+' + err.message })
										})
									// this.emit('')
									break
								// Handle other sync action types
								default:
							}
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
			socket.accessToken = token

			await this.broker.call(
				'devices.register',
				{
					deviceId: deviceId,
					userId: user.uid,
					version: version,
				},
				{
					//@ts-ignore
					meta: this.socketGetMeta(socket),
				},
			)

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
			return user // will be saved to socket.client.user
		},
		socketGetMeta(this: AppService, socket) {
			// make the context to be the same as API GATEWAY
			const meta = {
				$socketId: socket.id,
				user: socket.user,
				accountId: socket.user.uid || socket.user.id,
				accessToken: socket.accessToken,
				$rooms: Array.from(socket.rooms.keys()),
			}
			this.logger.debug('getMeta', meta)
			return meta
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
