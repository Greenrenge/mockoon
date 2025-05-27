import { SyncActionTypes, UpSyncActions } from '@mockoon/cloud'
import { Service } from 'moleculer'
import config from '../config'
import { DatabaseStore } from '../libs/db-environment-store'
import { EnvironmentDatabase } from '../libs/dbAdapters/environment-database'
import { calcHash } from '../libs/hash'
import { mustLogin } from '../mixins/mustLogin'

interface EnvironmentServiceSettings {
	syncIntervalMs: number
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
							throw new Error(
								`Environment with UUID ${uuid} not found, only ${this.store
									.getState()
									.data.map((d) => d.environmentUuid)
									.join(',')} is available`,
							)
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
						const action = {
							type: SyncActionTypes.ADD_CLOUD_ENVIRONMENT,
							environment,
							timestamp: Date.now(),
							hash: calcHash(environment),
						} as UpSyncActions

						await this.store.dispatch(action)

						return action
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
				 * Remove an environment (soft delete)
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

				/**
				 * Get all soft-deleted environments
				 */
				listDeleted: {
					handler: async () => {
						const deletedEnvs = await this.store.getDeletedEnvironments()
						return deletedEnvs.map((d) => ({
							...d,
							hash: calcHash(d.environment),
						}))
					},
				},

				/**
				 * Restore a soft-deleted environment
				 */
				restore: {
					params: {
						uuid: { type: 'string' },
					},
					handler: async (ctx) => {
						const { uuid } = ctx.params
						await this.store.restoreEnvironment(uuid)
						return { success: true }
					},
				},

				/**
				 * Permanently delete an environment (hard delete)
				 */
				permanentDelete: {
					params: {
						uuid: { type: 'string' },
					},
					handler: async (ctx) => {
						const { uuid } = ctx.params
						await this.store.permanentDeleteEnvironment(uuid)
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
				const dbAdapter = new EnvironmentDatabase({
					dialect: config.database.dialect as any,
					...(config.database.dialect === 'sqlite'
						? {
								storage: `${config.database.storage}/environments.sqlite`,
							}
						: {
								host: config.database.host,
								port: config.database.port,
								database: config.database.database,
								username: config.database.username,
								password: config.database.password,
								ssl: config.database.ssl,
							}),
				})

				// Initialize the store with the adapter
				await this.store.initialize(dbAdapter, this.settings.syncIntervalMs)
				this.logger.info('Environment store initialized with DB')
			},

			stopped: async () => {
				await this.store.close()
				this.logger.info('Environment store closed')
			},
		})
	}
}
