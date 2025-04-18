import {
	AddCloudEnvironmentSyncAction,
	DeployInstanceStatus,
	DeployInstanceVisibility,
} from '@mockoon/cloud'
import { Environment } from '@mockoon/commons'
import { MockoonServer } from '@mockoon/commons-server'
import { Context, Service } from 'moleculer'
import DbService from 'moleculer-db'
import SequelizeDbAdapter from 'moleculer-db-adapter-sequelize'
import Sequelize from 'sequelize'
import config from '../config'
import { mustLogin } from '../mixins/mustLogin'
import { AppService, AppServiceSchema, SyncEnv } from '../types/common'
interface ServerInstanceInfo {
	environment: Environment
	server: MockoonServer
	port: number
}
//TODO: deployUrl
interface StartServerParams {
	environment: Environment
	port: number
	options?: {
		disabledRoutes?: string[]
		fakerSeed?: number
		fakerLocale?: string
		envVarsPrefix?: string
		maxTransactionLogs?: number
		enableRandomLatency?: boolean
	}
	subdomain?: string
	visibility?: DeployInstanceVisibility
	version?: string
}

const MockoonServerService: AppServiceSchema = {
	name: 'mockoon-server',
	mixins: [DbService as any, mustLogin()],
	adapter: new SequelizeDbAdapter({
		dialect: 'postgres',
		host: config.postgres.host,
		port: config.postgres.port,
		database: config.postgres.database,
		username: config.postgres.username,
		password: config.postgres.password,
		ssl: config.postgres.ssl,
	}),
	metadata: {
		instances: new Map<string, ServerInstanceInfo>(),
	},
	model: {
		name: 'instance',
		define: {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			environmentUuid: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			port: {
				type: Sequelize.INTEGER,
			},
			visibility: {
				type: Sequelize.ENUM(DeployInstanceVisibility.PUBLIC, DeployInstanceVisibility.PRIVATE),
			},
			status: {
				type: Sequelize.ENUM(DeployInstanceStatus.RUNNING, DeployInstanceStatus.STOPPED),
			},
			subdomain: {
				type: Sequelize.STRING,
			},
			url: {
				type: Sequelize.STRING,
			},
			name: {
				type: Sequelize.STRING,
			},
			apiKey: {
				type: Sequelize.STRING,
			},
			version: {
				type: Sequelize.STRING,
			},
		},
		options: {
			// Options from https://sequelize.org/docs/v6/moved/models-definition/
		},
	},
	actions: {
		//    `${deployUrl}/deployments/subdomain`, POST
		subdomainAvailability: {
			params: {
				subdomain: 'string',
				environmentUuid: 'string',
			},
			async handler(
				this: AppService,
				ctx: Context<{ subdomain: string }>,
			): Promise<{ available: boolean }> {
				// Check if the subdomain is already in use
				const instance = await this.adapter.findOne({
					query: {
						subdomain: ctx.params.subdomain,
					},
				})

				return { available: !instance }
			},
		},
		/**
		 * Start a new Mockoon server instance
		 */
		//TODO: RESTFUL to post
		//TODO: if add via API, should always add to the environment db?
		start: {
			params: {
				subdomain: 'string|optional',
				visibility: {
					type: 'enum',
					values: [DeployInstanceVisibility.PUBLIC, DeployInstanceVisibility.PRIVATE],
					optional: true,
					default: DeployInstanceVisibility.PUBLIC,
				},
				version: 'string|optional',
				environment: 'object',
				port: 'number',
				options: { type: 'object', optional: true },
			},
			async handler(
				this: AppService,
				ctx: Context<StartServerParams>,
			): Promise<{ success: boolean; port: number }> {
				// TODO: we cannot use api key for authentication in admin-api exposed
				const { environment, port, options = {}, subdomain, version, visibility } = ctx.params

				// Check if port is already in use
				const isPortTaken = Array.from(
					this.metadata.instances.values() as Iterable<ServerInstanceInfo>,
				).some((instance) => instance.port === port)

				if (isPortTaken) {
					throw new Error(`Port ${port} is already in use`)
				}

				// Check if environment is already running
				if (this.metadata.instances.has(environment.uuid)) {
					throw new Error(`Environment ${environment.uuid} is already running`)
				}
				// save to db
				const existing = (await this.adapter.findOne({
					where: {
						id: environment.uuid,
					},
				})) as any

				if (existing) {
					await this.adapter.updateById(existing.id, {
						environmentUuid: environment.uuid,
						port: port,
						visibility: visibility || DeployInstanceVisibility.PUBLIC,
						subdomain: subdomain,
						version: version,
						// status: DeployInstanceStatus.RUNNING,
					})
				} else {
					await this.adapter.insert({
						environmentUuid: environment.uuid,
						port: port,
						visibility: visibility || DeployInstanceVisibility.PUBLIC,
						subdomain: subdomain,
						version: version,
						status: DeployInstanceStatus.STOPPED,
					})
					// check whether env is existing
					const doc = await ctx.call<SyncEnv, any>('environments-store.get', {
						uuid: environment.uuid,
					})
					if (!doc) {
						//create in store and db
						const action = await ctx.call<AddCloudEnvironmentSyncAction, any>(
							'environments-store.create',
							{
								environment: environment,
							},
						)
						// broadcast to the socket clients
						await ctx.call('socket-io.broadcastToClients', {
							action,
						})
					}
				}

				const server = new MockoonServer(
					{
						...environment,
						port: port,
					},
					{
						...options,
						enableAdminApi: true,
					},
				)

				// Handle server events
				server.once('started', () => {
					this.logger.info(
						`Mockoon server started for environment ${environment.uuid} on port ${port}`,
					)
					this.broker.broadcast('mockoon-server.started', {
						environmentUuid: environment.uuid,
						port,
					})
				})

				server.once('stopped', () => {
					this.metadata.instances.delete(environment.uuid)
					this.logger.info(`Mockoon server stopped for environment ${environment.uuid}`)
					this.broker.broadcast('mockoon-server.stopped', { environmentUuid: environment.uuid })
				})

				server.on('error', (errorCode: any, originalError: any) => {
					this.logger.error('Server error:', {
						environmentUuid: environment.uuid,
						errorCode,
						originalError,
					})
					this.broker.broadcast('mockoon-server.error', {
						environmentUuid: environment.uuid,
						errorCode,
						originalError,
					})
				})

				// Start the server
				await server.start()

				// update status in db
				await this.adapter.updateById(environment.uuid, {
					status: DeployInstanceStatus.RUNNING,
				})

				// Store the instance
				this.metadata.instances.set(environment.uuid, {
					environment,
					server,
					port,
				})

				return { success: true, port }
			},
		},

		/**
		 * Stop a running server instance
		 */
		//TODO: restful to delete
		stop: {
			params: {
				environmentUuid: 'string',
			},
			async handler(this: AppService, ctx: Context<{ environmentUuid: string }>) {
				// stop the server instance at the instance , change status in db
				const instance = this.metadata.instances.get(ctx.params.environmentUuid)
				if (!instance) {
					throw new Error(`No server instance found for environment ${ctx.params.environmentUuid}`)
				}

				await instance.server.stop()
				return { success: true }
			},
		},

		/**
		 * Stop all running server instances
		 */
		stopAll: {
			async handler(this: AppService) {
				const promises = Array.from(
					this.metadata.instances.values() as Iterable<ServerInstanceInfo>,
				).map((instance) => instance.server.stop())
				await Promise.all(promises)
				return { success: true }
			},
		},

		/**
		 * Get all running server instances
		 */
		getRunningInstances: {
			async handler(this: AppService) {
				return Array.from(
					this.metadata.instances.entries() as Iterable<[string, ServerInstanceInfo]>,
				).map(([uuid, info]) => ({
					environmentUuid: uuid,
					port: info.port,
				}))
			},
		},

		/**
		 * Update environment configuration for a running server
		 */
		updateEnvironment: {
			params: {
				environmentUuid: 'string',
				environment: 'object',
			},
			async handler(
				this: AppService,
				ctx: Context<{ environmentUuid: string; environment: Environment }>,
			) {
				const instance = this.metadata.instances.get(ctx.params.environmentUuid)
				if (!instance) {
					throw new Error(`No server instance found for environment ${ctx.params.environmentUuid}`)
				}

				instance.server.updateEnvironment(ctx.params.environment)
				return { success: true }
			},
		},
		getAllInstances: {
			async handler(this: AppService) {
				//TODO: get from db
			},
		},
		permanentlyDelete: {
			params: {
				environmentUuid: 'string',
			},
			async handler(
				this: AppService,
				ctx: Context<{ environmentUuid: string }>,
			): Promise<{ success: boolean }> {
				const instance = this.metadata.instances.get(ctx.params.environmentUuid)
				if (!instance) {
					throw new Error(`No server instance found for environment ${ctx.params.environmentUuid}`)
				}

				await instance.server.stop()
				this.metadata.instances.delete(ctx.params.environmentUuid)
				//TODO: delete in db

				return { success: true }
			},
		},
	},

	/**
	 * Service created lifecycle event handler
	 */
	created(this: Service) {
		this.metadata.instances = new Map<string, ServerInstanceInfo>()
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped(this: Service) {
		// Stop all running instances when the service stops
		await this.actions.stopAll()
	},
}

export default MockoonServerService
