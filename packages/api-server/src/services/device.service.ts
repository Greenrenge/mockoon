// devices.service.ts
import { Context } from 'moleculer'
import DbService from 'moleculer-db'
import SequelizeDbAdapter from 'moleculer-db-adapter-sequelize'
import Sequelize from 'sequelize'
import config from '../config'
import { syncSequelize } from '../libs/dbAdapters/sequelize-utils'
import { mustLogin } from '../mixins/mustLogin'
import { AppService, AppServiceSchema } from '../types/common'

interface RegisterParams {
	userId: string
	deviceId: string
	version: string
}

interface UnregisterParams {
	userId: string
	deviceId: string
}

interface CountParams {
	userId: string
}
const DevicesService: AppServiceSchema = {
	name: 'devices',
	mixins: [DbService as any, mustLogin()],
	adapter: new SequelizeDbAdapter({
		dialect: config.database.dialect,
		...(config.database.dialect === 'sqlite'
			? {
					storage: `${config.database.storage}/devices.sqlite`,
				}
			: {
					host: config.database.host,
					port: config.database.port,
					database: config.database.database,
					username: config.database.username,
					password: config.database.password,
					ssl: config.database.ssl,
				}),
	}),
	model: {
		name: 'device',
		define: {
			userId: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			deviceId: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			version: Sequelize.STRING,
			lastSeen: Sequelize.DATE,
		},
		options: {
			// Options from https://sequelize.org/docs/v6/moved/models-definition/
		},
	},
	settings: {},
	actions: {
		/**
		 * Register device
		 */
		register: {
			params: {
				userId: { type: 'string' },
				deviceId: { type: 'string' },
				version: { type: 'string', optional: true },
			},
			async handler(this: AppService, ctx: Context<RegisterParams>) {
				const existing = (await this.adapter.findOne({
					where: {
						userId: ctx.params.userId,
						deviceId: ctx.params.deviceId,
					},
				})) as any

				if (existing) {
					await this.adapter.updateById(existing.id, {
						userId: ctx.params.userId,
						deviceId: ctx.params.deviceId,
						version: ctx.params.version,
						lastSeen: Date.now(),
					})
				} else {
					await this.adapter.insert({
						userId: ctx.params.userId,
						deviceId: ctx.params.deviceId,
						version: ctx.params.version,
						lastSeen: Date.now(),
					})
				}

				return { success: true }
			},
		},

		/**
		 * Unregister device
		 */
		unregister: {
			params: {
				userId: { type: 'string' },
				deviceId: { type: 'string' },
			},
			async handler(this: AppService, ctx: Context<UnregisterParams>) {
				await this.adapter.removeMany({
					userId: ctx.params.userId,
					deviceId: ctx.params.deviceId,
				})
				return { success: true }
			},
		},

		/**
		 * Count devices for user
		 */
		count: {
			params: {
				userId: { type: 'string' },
			},
			async handler(this: AppService, ctx: Context<CountParams>) {
				return this.adapter.count({ query: { userId: ctx.params.userId } })
			},
		},
	},
	afterConnected(this: AppService) {
		// Sync the database
		this.logger.info('Database connected, syncing devices...')

		//@ts-ignore
		// this.model!.sync({ alter: true })
		syncSequelize({
			//@ts-ignore
			Model: this.model,
			//@ts-ignore
			sequelize: this.adapter.db,
		})
	},
}

export default DevicesService
