import { Environment } from '@mockoon/commons'
import { MockoonServer } from '@mockoon/commons-server'
import { Context, Service } from 'moleculer'
import { AppService, AppServiceSchema } from '../types/common'

interface ServerInstanceInfo {
	environment: Environment
	server: MockoonServer
	port: number
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
}

const MockoonServerService: AppServiceSchema = {
	name: 'mockoon-server',

	metadata: {
		instances: new Map<string, ServerInstanceInfo>(),
	},

	actions: {
		/**
		 * Start a new Mockoon server instance
		 */
		start: {
			params: {
				environment: 'object',
				port: 'number',
				options: { type: 'object', optional: true },
			},
			async handler(
				this: AppService,
				ctx: Context<StartServerParams>,
			): Promise<{ success: boolean; port: number }> {
				const { environment, port, options = {} } = ctx.params

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

				const server = new MockoonServer(
					{
						...environment,
						port: port,
					},
					{
						...options,
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

				return { success: true, port }
			},
		},

		/**
		 * Stop a running server instance
		 */
		stop: {
			params: {
				environmentUuid: 'string',
			},
			async handler(this: AppService, ctx: Context<{ environmentUuid: string }>) {
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
