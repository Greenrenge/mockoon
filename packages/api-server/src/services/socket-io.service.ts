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
import { Server, Socket } from 'socket.io'
import { EnvironmentModelType } from '../libs/dbAdapters/postgres-environment-database'
import { AppService, AppServiceSchema, AuthContextMeta } from '../types/common'

type SyncEnv = EnvironmentModelType & { hash: string }
type SyncUserPresence = {
	uid?: string
	email?: string
	displayName?: string
	environmentUuid?: string
	cssColor?: string
}
type SyncPresence = {
	devices?: number
	users?: SyncUserPresence[]
}
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
	dependencies: ['devices', 'auth', 'environments-store', 'presence'],
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

							// Update presence after disconnect
							service.broker
								.call('presence.removeUserDevice', {
									userId: this.user.uid,
									deviceId: this.deviceId,
								})
								.then((presence) => {
									// Broadcast presence update to team members
									if (this.user.teamId) {
										//@ts-ignore
										service.io
											.to(`team:${this.user.teamId}`)
											.emit(SyncMessageTypes.PRESENCE, presence)
									}
								})
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
								.call<SyncEnv[], any>(
									'environments-store.list',
									{},
									{
										//@ts-ignore
										meta: service.socketGetMeta(this),
									},
								)
								.then((environments) => {
									service.logger.info('environments', environments)
									this.emit(
										SyncMessageTypes.ENV_LIST,
										environments.map((env) => ({
											environmentUuid: env.environmentUuid,
											hash: env.hash,
										})),
									)
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
							service.logger.info('Sync action received:', JSON.stringify(action))
							service
								//@ts-ignore
								.handleSyncAction(this, action, respond)
								.then(respond)
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
		async socketAuthorize(this: AppService & { io: Server }, socket, handler) {
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
			// //TODO: must have single socket per deviceId
			// const sockets = await this.io.of('/').in(`user:${user.uid}`).fetchSockets()

			// sockets.filter(
			// 	(s) =>
			// 		//@ts-ignore
			// 		s.deviceId === deviceId && s.user.id === user.id,
			// )
			// if (sockets.length > 1) {
			// 	this.logger.warn(
			// 		`User ${user.uid} has multiple sockets connected with the same deviceId ${deviceId}. Disconnecting the previous socket.`,
			// 	)
			// 	// disconnect the previous socket
			// 	sockets.forEach((s) => {
			// 		if (s.id !== socket.id) {
			// 			s.disconnect()
			// 		}
			// 	})
			// }

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

			// Initialize user presence
			this.broker
				.call('presence.addUserDevice', {
					userId: user.uid,
					deviceId: deviceId,
					presenceData: {
						uid: user.uid,
						email: user.email,
						displayName: user.displayName,
						//@ts-ignore
						cssColor: this.generateUserColor(user.uid),
					},
				})
				.then((presence) => {
					// Broadcast initial presence to team members
					if (user.teamId) {
						this.broker.call(
							'socket-io.broadcast',
							{
								event: SyncMessageTypes.PRESENCE,
								rooms: [`team:${socket.user.teamId}`],
								namespace: '/',
								args: [presence],
							},
							{
								//@ts-ignore
								meta: this.socketGetMeta(socket),
							},
						)
					}
				})

			// Send connected message with migration status
			const migrationNeeded = false

			socket.emit(SyncMessageTypes.CONNECTED, {
				migrated: migrationNeeded,
			})

			// init presence for the user
			this.broker.call<SyncPresence>('presence.getPresence').then((presence: SyncPresence) => {
				socket.emit(SyncMessageTypes.PRESENCE, presence)
			})

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
		async handleSyncAction(
			this: AppService & { io: Server },
			socket: CustomSocket,
			action: SyncActions,
			respond?: (data: ServerAcknowledgment) => void,
		): Promise<ServerAcknowledgment> {
			//TODO: if environmentUuid is sent , we need to return hash in acknowledgment
			// when CREATE is in receive --> ADD_ENVIRONMENT will be sent
			// transformSyncAction must be called first to check timestamp, server must have RecentActionsStore,previousActionHash inside, then saveRecentUpdateSyncAction,applySyncAction for converting to action to reducer
			//Process the sync action based on its type
			try {
				if ('environmentUuid' in action) {
					this.broker
						.call('presence.updateUserPresence', {
							userId: socket.user.uid,
							presenceData: {
								environmentUuid: action.environmentUuid,
							},
						})
						.then(() =>
							this.broker.call('presence.getUserPresence', {
								userId: socket.user.uid,
							}),
						)
						.then((userPresence) => {
							// Broadcast presence update to all connected clients
							if (socket.user.teamId) {
								this.broker.call(
									'socket-io.broadcast',
									{
										event: SyncMessageTypes.USER_PRESENCE,
										rooms: [`team:${socket.user.teamId}`],
										namespace: '/',
										args: [userPresence],
									},
									{
										//@ts-ignore
										meta: this.socketGetMeta(socket),
									},
								)
							}
						})
				}

				switch (action.type) {
					case SyncActionTypes.GET_FULL_ENVIRONMENT: {
						const { receive, environmentUuid } = action
						// find the environment by uuid
						const doc = await this.broker.call<SyncEnv, any>(
							'environments-store.get',
							{
								uuid: environmentUuid,
							},
							{
								//@ts-ignore
								meta: this.socketGetMeta(socket),
							},
						)

						if (!doc) {
							return { error: 'Environment Not Found' }
						}

						// Send the environment data to the client
						socket.emit(SyncMessageTypes.SYNC, {
							type:
								receive === 'UPDATE'
									? SyncActionTypes.UPDATE_FULL_ENVIRONMENT
									: SyncActionTypes.ADD_CLOUD_ENVIRONMENT,
							timestamp: doc.timestamp,
							hash: doc.hash,
							environment: doc.environment,
							...(receive === 'UPDATE' ? { environmentUuid: doc.environmentUuid } : {}),
						})

						// Acknowledge the action
						return { hash: doc.hash }
					}

					default:
						const doc = await this.broker.call<SyncEnv, any>(
							'environments-store.dispatch',
							{
								action,
							},
							{
								//@ts-ignore
								meta: this.socketGetMeta(socket),
							},
						)
						// Broadcast the action to all connected clients except the sender
						this.io
							.of('/')
							.in(`team:${socket.user.teamId}`)
							.fetchSockets()
							.then((sockets) => {
								sockets.forEach((s) => {
									// @ts-ignore
									if (s.id !== socket.id && s.deviceId !== socket.deviceId) {
										s.emit(SyncMessageTypes.SYNC, action)
									}
								})
							})

						if (doc) {
							return { hash: doc.hash }
						}
						return { error: 'No handlers' }
				}
			} catch (err) {
				this.logger.error('Error processing sync action', err)
				return { error: 'Action processing failed with error:+' + err.message }
			}
		},

		generateUserColor(userId: string): string {
			// Generate a consistent color based on user ID
			const colors = [
				'#FF6B6B',
				'#4ECDC4',
				'#45B7D1',
				'#96CEB4',
				'#FFEEAD',
				'#D4A5A5',
				'#9B97B2',
				'#91A8D0',
			]
			const hash = userId.split('').reduce((acc, char) => {
				return char.charCodeAt(0) + ((acc << 5) - acc)
			}, 0)
			return colors[Math.abs(hash) % colors.length]
		},
	},
}

export default SyncService
