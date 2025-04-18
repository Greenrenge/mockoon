import { SyncActionTypes } from '@mockoon/cloud'
import { Service } from 'moleculer'
import config from '../config'
import { DatabaseStore } from '../libs/db-environment-store'
import { PostgresEnvironmentDatabase } from '../libs/dbAdapters/postgres-environment-database'
import { calcHash } from '../libs/hash'
import { mustLogin } from '../mixins/mustLogin'

interface EnvironmentServiceSettings {
	syncIntervalMs: number
	postgres: {
		host: string
		port: number
		database: string
		username: string
		password: string
		ssl: boolean
	}
}

/**
 * Service to manage environments using the DatabaseStore singleton
 */
export default class EnvironmentService extends Service<EnvironmentServiceSettings> {
	private store: DatabaseStore = DatabaseStore.getInstance()

	public constructor(broker: any) {
		super(broker)

		this.parseServiceSchema({
			name: 'environments-store',
			mixins: [mustLogin()],
			settings: {
				syncIntervalMs: config.environment.syncIntervalMs,
				postgres: config.postgres,
			},

			actions: {
				/**
				 * Get all environments
				 */
				list: {
					handler: async () => {
						return this.store.getState().data.map((d) => ({
							...d,
							hash: calcHash(d.environment),
						}))
					},
				},

				/**
				 * Get an environment by UUID
				 */
				get: {
					params: {
						uuid: { type: 'string' },
					},
					handler: async (ctx) => {
						const { uuid } = ctx.params
						const d = this.store.getEnvironmentByUUID(uuid)

						if (!d) {
							throw new Error(`Environment with UUID ${uuid} not found`)
						}

						return {
							...d,
							hash: calcHash(d.environment),
						}
					},
				},

				/**
				 * Create a new environment
				 */
				create: {
					params: {
						environment: { type: 'object' },
					},
					handler: async (ctx) => {
						const { environment } = ctx.params
						await this.store.dispatch({
							type: SyncActionTypes.ADD_CLOUD_ENVIRONMENT,
							environment,
							timestamp: Date.now(),
							hash: calcHash(environment),
						})

						return environment
					},
				},

				/**
				 * Update an environment
				 */
				update: {
					params: {
						uuid: { type: 'string' },
						environment: { type: 'object' },
					},
					handler: async (ctx) => {
						const { uuid, environment } = ctx.params

						await this.store.dispatch({
							type: SyncActionTypes.UPDATE_FULL_ENVIRONMENT,
							environmentUuid: uuid,
							environment,
							timestamp: Date.now(),
							hash: calcHash(environment),
						})

						const updatedEnv = this.store.getEnvironmentByUUID(uuid)

						if (!updatedEnv) {
							throw new Error(`Environment with UUID ${uuid} not found after update`)
						}

						return updatedEnv
					},
				},

				/**
				 * Remove an environment
				 */
				remove: {
					params: {
						uuid: { type: 'string' },
					},
					handler: async (ctx) => {
						const { uuid } = ctx.params

						await this.store.dispatch({
							type: SyncActionTypes.REMOVE_CLOUD_ENVIRONMENT,
							environmentUuid: uuid,
							timestamp: Date.now(),
						})

						return { success: true }
					},
				},

				/**
				 * Apply a custom action to the store
				 * This allows applying any reducer action to the store
				 */
				dispatch: {
					params: {
						action: { type: 'object' },
					},
					handler: async (ctx) => {
						const { action } = ctx.params
						const result = await this.store.dispatch(action)
						if (!result) {
							return null
						}
						return {
							...result,
							hash: calcHash(result.environment),
						}
					},
				},

				/**
				 * Force an immediate sync to the database
				 */
				forceSync: {
					handler: async () => {
						await this.store.forceSync()
						return { success: true }
					},
				},
			},

			events: {
				'environments.sync': async () => {
					await this.store.forceSync()
				},
			},

			created: async () => {
				// Set up event listeners
				this.store.on('stateUpdated', (state) => {
					this.broker.broadcast('environments.updated', state)
				})

				this.store.on('synced', () => {
					this.broker.broadcast('environments.synced')
				})
			},

			started: async () => {
				// Create the database adapter
				const dbAdapter = new PostgresEnvironmentDatabase(
					this.settings.postgres.host,
					this.settings.postgres.port,
					this.settings.postgres.database,
					this.settings.postgres.username,
					this.settings.postgres.password,
					this.settings.postgres.ssl,
				)

				// Initialize the store with the adapter
				await this.store.initialize(dbAdapter, this.settings.syncIntervalMs)
				this.logger.info('Environment store initialized with PostgreSQL')
			},

			stopped: async () => {
				await this.store.close()
				this.logger.info('Environment store closed')
			},
		})
	}
}
