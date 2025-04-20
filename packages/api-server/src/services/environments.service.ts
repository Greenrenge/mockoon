// devices.service.ts
import DbService from 'moleculer-db'
import SequelizeDbAdapter from 'moleculer-db-adapter-sequelize'
import Sequelize from 'sequelize'
import config from '../config'
import { mustLogin } from '../mixins/mustLogin'
import { AppService, AppServiceSchema } from '../types/common'
const Service: AppServiceSchema = {
	name: 'environments',
	mixins: [DbService as any, mustLogin()],
	// adapter: new SequelizeAdapter('sqlite://:memory:'),
	// adapter: new SequelizeAdapter({ dialect: 'sqlite', storage: './environments.db' }),
	adapter: new SequelizeDbAdapter({
		dialect: 'postgres',
		host: config.postgres.host,
		port: config.postgres.port,
		database: config.postgres.database,
		username: config.postgres.username,
		password: config.postgres.password,
		ssl: config.postgres.ssl,
	}),
	model: {
		name: 'environment',
		define: {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			payload: Sequelize.JSONB,
			environmentUuid: Sequelize.STRING,
			hash: Sequelize.STRING,
			timestamp: Sequelize.INTEGER,
		},
		options: {
			// Options from https://sequelize.org/docs/v6/moved/models-definition/
		},
	},
	settings: {
		fields: ['id', 'environmentUuid'],
		idField: 'id',
	},
	afterConnected(this: AppService) {
		// Sync the database
		this.logger.info('Database connected, syncing devices...')

		//@ts-ignore
		// this.model!.sync({ alter: true })
	},
}

export default Service
