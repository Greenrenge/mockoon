import { DataTypes, Model, Sequelize } from 'sequelize'
import { IEnvironmentDatabase } from '../db-environment-store'

/**
 * Sequelize model for Environment
 */
class EnvironmentModel extends Model {
	declare id: string
	declare environment: any
	declare environmentUuid: string
	declare timestamp: number
}

export type EnvironmentModelType = {
	id: string
	environment: any
	environmentUuid: string
	timestamp: number
}

/**
 * Sequelize model for metadata (last sync time, etc.)
 */
class MetadataModel extends Model {
	declare key: string
	declare value: string
}

/**
 * PostgreSQL implementation of the IEnvironmentDatabase interface using Sequelize
 */
export class PostgresEnvironmentDatabase implements IEnvironmentDatabase {
	private sequelize: Sequelize | null = null
	private initialized: boolean = false

	constructor(
		private host: string = 'localhost',
		private port: number = 5432,
		private database: string = 'mockoon',
		private username: string = 'postgres',
		private password: string = 'postgres',
		private ssl: boolean = false,
	) {}

	/**
	 * Initialize the database connection and create necessary tables
	 */
	public async initialize(): Promise<void> {
		if (this.initialized) {
			return
		}

		try {
			// Initialize Sequelize connection
			this.sequelize = new Sequelize({
				dialect: 'postgres',
				host: this.host,
				port: this.port,
				database: this.database,
				username: this.username,
				password: this.password,
				logging: false,
				dialectOptions: this.ssl
					? {
							ssl: {
								require: true,
								rejectUnauthorized: false,
							},
						}
					: {},
			})

			// Define models
			EnvironmentModel.init(
				{
					id: {
						type: DataTypes.STRING,
						primaryKey: true,
					},
					environment: {
						type: DataTypes.JSONB,
					},
					environmentUuid: {
						type: DataTypes.STRING,
					},
					timestamp: {
						type: DataTypes.DECIMAL,
					},
				},
				{
					sequelize: this.sequelize,
					modelName: 'environment',
					timestamps: true,
				},
			)

			MetadataModel.init(
				{
					key: {
						type: DataTypes.STRING,
						primaryKey: true,
					},
					value: {
						type: DataTypes.TEXT,
						allowNull: false,
					},
				},
				{
					sequelize: this.sequelize,
					modelName: 'metadata',
					timestamps: true,
				},
			)

			// Sync models with database
			await this.sequelize.sync({ alter: true })

			// Test the connection
			await this.sequelize.authenticate()
			console.log('PostgreSQL connection has been established successfully.')

			this.initialized = true
		} catch (error) {
			console.error('Unable to connect to the PostgreSQL database:', error)
			throw error
		}
	}

	/**
	 * Load all environments from the database
	 */
	public async loadEnvironments(): Promise<EnvironmentModelType[]> {
		try {
			const environmentRecords = await EnvironmentModel.findAll({
				raw: true,
			})
			return environmentRecords
		} catch (error) {
			console.error('Error loading environments from database:', error)
			return []
		}
	}

	/**
	 * Save an environment to the database
	 * @param uuid The environment UUID
	 * @param environment The environment object
	 * @param hash The calculated hash for the environment
	 * @param timestamp The timestamp (usually from sync action)
	 */
	public async saveEnvironment(data: EnvironmentModelType): Promise<void> {
		try {
			await EnvironmentModel.upsert({
				id: data.id,
				environment: data.environment,
				environmentUuid: data.environmentUuid,
				timestamp: data.timestamp,
			})
		} catch (error) {
			console.error(`Error saving environment ${data.environmentUuid} to database:`, error)
			throw error
		}
	}

	/**
	 * Delete an environment from the database
	 * @param uuid The environment UUID to delete
	 */
	public async deleteEnvironment(uuid: string): Promise<void> {
		try {
			await EnvironmentModel.destroy({
				where: { id: uuid },
			})
		} catch (error) {
			console.error(`Error deleting environment ${uuid} from database:`, error)
			throw error
		}
	}

	/**
	 * Update the last sync timestamp in the database
	 * @param timestamp The timestamp to record
	 */
	public async updateLastSync(timestamp: number): Promise<void> {
		try {
			await MetadataModel.upsert({
				key: 'last_sync',
				value: timestamp.toString(),
			})
		} catch (error) {
			console.error(`Error updating last sync timestamp to ${timestamp}:`, error)
			throw error
		}
	}

	/**
	 * Get all environment UUIDs from the database
	 */
	public async getAllEnvironmentUuids(): Promise<string[]> {
		try {
			const records = await EnvironmentModel.findAll({
				attributes: ['environmentUuid'],
				raw: true,
			})

			return records.map((record) => record.environmentUuid)
		} catch (error) {
			console.error('Error getting all environment UUIDs from database:', error)
			return []
		}
	}

	/**
	 * Close the database connection
	 */
	public async close(): Promise<void> {
		if (this.sequelize) {
			await this.sequelize.close()
			console.log('PostgreSQL connection closed')
		}
	}
}
