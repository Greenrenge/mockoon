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
import Sequelize, { ModelStatic } from 'sequelize'
import config from '../config'
import { mustLogin } from '../mixins/mustLogin'
import { AppService, AppServiceSchema, AuthContextMeta, SyncEnv } from '../types/common'
interface ServerInstanceInfo {
	environment: Environment
	server: MockoonServer
	port: number
}

function StopInstance(serverInstance: MockoonServer) {
	return new Promise((resolve, reject) => {
		serverInstance.on('stopped', () => {
			resolve(true)
		})
		// serverInstance.on('error', (errorCode: any, originalError: any) => {
		// 	reject(originalError)
		// })
		setTimeout(() => {
			reject(new Error('Timeout'))
		}, 5000)
		serverInstance.stop()
	})
}

interface InstanceModelType {
	id: string
	environmentUuid: string
	environment: Environment
	port?: number
	visibility?: DeployInstanceVisibility
	status?: DeployInstanceStatus
	subdomain?: string
	url?: string
	name?: string
	apiKey?: string
	version?: string
}

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
	name: 'deployments',
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
	settings: {
		rest: ['/'],
	},
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
			environment: {
				type: Sequelize.JSONB,
				allowNull: false,
			},
			port: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			visibility: {
				type: Sequelize.ENUM(DeployInstanceVisibility.PUBLIC, DeployInstanceVisibility.PRIVATE),
			},
			status: {
				type: Sequelize.ENUM(DeployInstanceStatus.RUNNING, DeployInstanceStatus.STOPPED),
				allowNull: false,
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
			rest: 'POST /deployments/subdomain',
			params: {
				subdomain: 'string',
				environmentUuid: 'string|optional',
			},
			async handler(
				this: AppService,
				ctx: AuthContextMeta<{ subdomain: string; environmentUuid?: string }>,
			): Promise<{ available: boolean }> {
				// Check if the subdomain is already in use
				if (!ctx.params.subdomain) {
					return { available: true }
				}

				const instance = await this.adapter.findOne({
					where: {
						subdomain: ctx.params.subdomain,
					},
				})
				if (instance) ctx.meta.$statusCode = 409
				return { available: !instance }
			},
		},
		portAvailability: {
			rest: 'POST /deployments/port',
			params: {
				port: 'number',
				environmentUuid: 'string|optional',
			},
			async handler(
				this: AppService,
				ctx: AuthContextMeta<{ port: number; environmentUuid?: string }>,
			): Promise<{ available: boolean }> {
				// Check if the port is already in use
				const instance = await this.adapter.findOne({
					where: {
						port: ctx.params.port,
						...(ctx.params.environmentUuid && {
							environmentUuid: {
								[Sequelize.Op.ne]: ctx.params.environmentUuid,
							},
						}),
						status: DeployInstanceStatus.RUNNING,
					},
				})

				if (instance) ctx.meta.$statusCode = 409
				return { available: !instance }
			},
		},
		/**
		 * Start a new Mockoon server instance
		 */
		//TODO: RESTFUL to post
		//TODO: if add via API, should always add to the environment db?
		start: {
			rest: 'POST /deployments',
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
			): Promise<InstanceModelType | undefined> {
				// TODO: we cannot use api key for authentication in admin-api exposed
				const { environment, port, options = {}, subdomain, version, visibility } = ctx.params

				// Check if port is already in use
				const isPortTaken =
					Array.from(this.metadata.instances.values() as Iterable<ServerInstanceInfo>).some(
						(instance) => instance.port === port && instance.environment.uuid !== environment.uuid,
					) ||
					port === config.configuration.apiPort ||
					port === config.configuration.wsPort

				if (isPortTaken) {
					throw new Error(`Port ${port} is already in use`)
				}

				// Check if environment is already running --> restart
				if (this.metadata.instances.has(environment.uuid)) {
					const server = this.metadata.instances.get(environment.uuid)?.server
					if (server) await StopInstance(server)
					this.metadata.instances.delete(environment.uuid)
					this.logger.info(`Environment ${environment.uuid} is already running`)
					// @ts-ignore
					await this.startServer({
						environment,
						port,
						options,
					})
				}
				// save to db
				const existing = (await this.adapter.findOne({
					where: {
						id: environment.uuid,
					},
				})) as any

				if (existing) {
					await this.adapter.updateById(existing.id, {
						$set: {
							environmentUuid: environment.uuid,
							port: port,
							environment: environment,
							visibility: visibility || DeployInstanceVisibility.PUBLIC,
							subdomain: subdomain,
							version: version,
							name: environment.name,
							url: `${config.configuration.baseUrl}:${port}`,
							// apiKey: environment.apiKey,
							// status: DeployInstanceStatus.RUNNING,
						},
					})
				} else {
					await this.adapter.insert({
						id: environment.uuid,
						environmentUuid: environment.uuid,
						environment: environment,
						port: port,
						visibility: visibility || DeployInstanceVisibility.PUBLIC,
						subdomain: subdomain,
						version: version,
						status: DeployInstanceStatus.STOPPED,
						name: environment.name,
						url: `${config.configuration.baseUrl}:${port}`,
						// apiKey: environment.apiKey,
					} as InstanceModelType)
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

				// @ts-ignore
				await this.startServer({
					environment,
					port,
					options,
				})

				// update status in db
				await this.adapter.updateById(environment.uuid, {
					$set: { status: DeployInstanceStatus.RUNNING },
				})
				const doc = (await this.adapter.findOne({
					where: {
						id: environment.uuid,
					},
				})) as any

				if (!doc) {
					throw new Error(`Environment ${environment.uuid} not found`)
				}
				return doc
			},
		},

		/**
		 * Stop a running server instance
		 */
		stop: {
			rest: 'DELETE /deployments/:environmentUuid',
			params: {
				environmentUuid: 'string',
			},
			async handler(this: AppService, ctx: Context<{ environmentUuid: string }>) {
				// stop the server instance at the instance , change status in db
				const instance = this.metadata.instances.get(ctx.params.environmentUuid)
				if (!instance) {
					throw new Error(`No server instance found for environment ${ctx.params.environmentUuid}`)
				}
				await StopInstance(instance.server)
				// db
				await this.adapter.updateById(ctx.params.environmentUuid, {
					$set: { status: DeployInstanceStatus.STOPPED },
				})
				return { success: true }
			},
		},

		/**
		 * Stop all running server instances
		 */
		stopAll: {
			rest: 'DELETE /deployments',
			async handler(this: AppService) {
				const promises = Array.from(
					this.metadata.instances.values() as Iterable<ServerInstanceInfo>,
				).map((instance) => {
					return StopInstance(instance.server)
				})
				await Promise.all(promises)
				return { success: true }
			},
		},

		/**
		 * Get all running server instances
		 */
		getRunningInstances: {
			rest: 'GET /deployments',
			async handler(this: AppService): Promise<InstanceModelType[]> {
				const instances = (await this.adapter.find({
					query: {
						status: DeployInstanceStatus.RUNNING,
					},
				})) as InstanceModelType[]

				// for (const instance of instances) {
				// 	const { environmentUuid, port, visibility, subdomain, version, environment } = instance
				// 	//make sure the instance is running since in the db marked as started
				// 	const server = this.metadata.instances.get(environmentUuid)?.server
				// 	if (!server) {
				// 		//@ts-ignore
				// 		await this.startServer({
				// 			environment,
				// 			port,
				// 			options: {},
				// 		})
				// 	}
				// }
				return instances
			},
		},

		/**
		 * Update environment configuration for a running server
		 */
		updateEnvironment: {
			rest: 'PUT /deployments/:environmentUuid',
			params: {
				environmentUuid: 'string',
				environment: 'object',
			},
			async handler(
				this: AppService,
				ctx: Context<{ environmentUuid: string; environment: Environment }>,
			) {
				await this.adapter.updateById(ctx.params.environmentUuid, {
					$set: { environment: ctx.params.environment },
				})
				const doc = (await this.adapter.findOne({
					where: {
						id: ctx.params.environmentUuid,
					},
				})) as InstanceModelType

				// reflect the changes in the server instance
				if (doc.status !== DeployInstanceStatus.RUNNING) {
					this.metadata.instances.delete(ctx.params.environmentUuid)
				} else {
					const instance = this.metadata.instances.get(ctx.params.environmentUuid)
					if (instance) {
						instance.server.updateEnvironment(ctx.params.environment)
					} else {
						// create a new instance
						// @ts-ignore
						await this.startServer({
							environment: ctx.params.environment,
							port: doc.port,
							options: {},
						})
					}
				}

				return { success: true }
			},
		},
		getAllInstances: {
			rest: 'GET /deployments/all',
			async handler(this: AppService): Promise<InstanceModelType[]> {
				const instances = await this.adapter.find({})
				return instances as InstanceModelType[]
			},
		},
		permanentlyDelete: {
			rest: 'DELETE /deployments/:environmentUuid/permanently',
			params: {
				environmentUuid: 'string',
			},
			async handler(
				this: AppService,
				ctx: Context<{ environmentUuid: string }>,
			): Promise<{ success: boolean }> {
				const instance = this.metadata.instances.get(ctx.params.environmentUuid)
				if (instance) {
					await StopInstance(instance.server)
				}
				this.metadata.instances.delete(ctx.params.environmentUuid)
				await this.adapter.removeById(ctx.params.environmentUuid)
				return { success: true }
			},
		},
	},
	methods: {
		async startServer({ environment, port, options = {} }) {
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
			// Store the instance
			this.metadata.instances.set(environment.uuid, {
				environment,
				server,
				port,
			})
		},
		async resync(this: AppService) {
			// Sync the database and respawn all instances
			//@ts-ignore
			const InstanceModel = this.model! as ModelStatic<any>
			const docs = (await InstanceModel.findAll({})) as InstanceModelType[]

			for (const doc of docs) {
				const { environmentUuid, port, environment: oldEnvironment, status } = doc

				const { environment } =
					(await this.broker.call<SyncEnv, any>(
						'environments-store.get',
						{
							uuid: environmentUuid,
						},
						{
							meta: {
								$serviceInterchange: true,
							},
						},
					)) ?? {}
				if (!environment) {
					this.logger.error(`Environment ${environmentUuid} not found in store`)
					// delete in db
					await this.adapter.removeById(environmentUuid)
					this.metadata.instances.delete(environmentUuid)
					this.logger.info(`Environment ${environmentUuid} removed from db`)
					continue
				}
				// update to db
				await this.adapter.updateById(environmentUuid, {
					$set: { environment: environment },
				})
				this.logger.info(`Environment ${environmentUuid} updated in db`)

				if (status === DeployInstanceStatus.RUNNING) {
					if (this.metadata.instances.has(environmentUuid)) {
						this.logger.info(`Environment ${environmentUuid} is already running, restarting...`)
						// restart the server
						const server = this.metadata.instances.get(environmentUuid)?.server
						if (server) {
							await StopInstance(server)
						}
					}
					this.logger.info(`Starting environment ${environmentUuid} on port ${port}`)
					// @ts-ignore
					await this.startServer({
						environment,
						port,
						options: {},
					})
				}
			}
			this.logger.info('Connected successfully')
		},
	},

	async afterConnected(this: AppService) {
		//@ts-ignore
		// const InstanceModel = this.model! as ModelStatic<any>
		// await InstanceModel.sync({ alter: true })
		// @ts-ignore
		await this.resync()
		this.logger.info('Connected successfully')
	},

	// @ts-ignore
	entityCreated(this: AppService, ctx: AuthContextMeta) {
		this.logger.info('New entity created!')
	},

	entityUpdated(this: AppService, json: any, ctx: AuthContextMeta) {
		// You can also access to Context
		this.logger.info(`Entity updated by '${ctx.meta?.user?.uid}`)
	},

	entityRemoved(this: AppService, json: any, ctx: AuthContextMeta) {
		this.logger.info('Entity removed', json)
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
