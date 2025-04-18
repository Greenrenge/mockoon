// devices.service.ts
import DbService from 'moleculer-db'
import SequelizeAdapter from 'moleculer-db-adapter-sequelize'
import Sequelize from 'sequelize'
import { mustLogin } from '../mixins/mustLogin'
import { AppService, AppServiceSchema } from '../types/common'

const Service: AppServiceSchema = {
	name: 'environments',
	mixins: [DbService as any, mustLogin()],
	// adapter: new SequelizeAdapter('sqlite://:memory:'),
	// adapter: new SequelizeAdapter({ dialect: 'sqlite', storage: './environments.db' }),
	adapter: new SequelizeAdapter('postgres://postgres:1234@localhost:5432/postgres'),
	model: {
		name: 'environment',
		define: {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			order: Sequelize.INTEGER,
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
		this.model!.sync({ alter: true })
	},
}

export default Service
