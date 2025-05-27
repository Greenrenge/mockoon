import { DataTypes, Model, Op, Options, Sequelize } from 'sequelize'
import { IEnvironmentDatabase } from '../db-environment-store'
import { syncSequelize } from './sequelize-utils'

/**
 * Sequelize model for Environment
 */
class EnvironmentModel extends Model {
	declare id: string
	declare environment: any
	declare environmentUuid: string
	declare timestamp: number
	declare deletedAt: Date | null
}

export type EnvironmentModelType = {
	id: string
	environment: any
	environmentUuid: string
	timestamp: number
	deletedAt?: Date | null
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
export class EnvironmentDatabase implements IEnvironmentDatabase {
	private sequelize: Sequelize | null = null
	private initialized: boolean = false
	private opts: Options

	constructor(opts: Options) {
		this.opts = opts
	}

	/**
	 * Initialize the database connection and create necessary tables
	 */
	public async initialize(): Promise<void> {
		if (this.initialized) {
			return
		}

		try {
			// Initialize Sequelize connection
			this.sequelize = new Sequelize(this.opts)

			// Define models
			EnvironmentModel.init(
				{
					id: {
						type: DataTypes.STRING,
						primaryKey: true,
					},
					environment: {
						type: DataTypes.JSON,
					},
					environmentUuid: {
						type: DataTypes.STRING,
					},
					timestamp: {
						type: DataTypes.DECIMAL,
					},
					deletedAt: {
						type: DataTypes.DATE,
						allowNull: true,
						defaultValue: null,
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
			// await this.sequelize.sync({ alter: true })
			await syncSequelize({
				Model: EnvironmentModel,
				sequelize: this.sequelize,
			})
			await syncSequelize({
				Model: MetadataModel,
				sequelize: this.sequelize,
			})

			// Test the connection
			await this.sequelize.authenticate()
			console.log('Database connection has been established successfully.')

			this.initialized = true
		} catch (error) {
			console.error('Unable to connect to the database:', error)
			throw error
		}
	}
	/**
 * if (sequelize.getDialect() === 'postgres') {
  // PostgreSQL-specific query
  const result = await sequelize.query(`
    SELECT * FROM my_table WHERE my_field @> '{"key": "value"}'
  `);
} else {
  // SQLite-specific query using JSON1
  const result = await sequelize.query(`
    SELECT * FROM my_table WHERE json_extract(my_field, '$.key') = 'value'
  `);
}
 */
	/**
	 * Load all environments from the database
	 */
	public async loadEnvironments(): Promise<EnvironmentModelType[]> {
		try {
			const environmentRecords = (
				await EnvironmentModel.findAll({
					where: {
						deletedAt: null,
					},
				})
			).map((e) => e.get({ plain: true }))
			return environmentRecords
		} catch (error) {
			console.error('Error loading environments from database:', error)
			return []
		}
	}

	/**
	 * Save an environment to the database
	 * @param data The environment data including UUID, environment object, timestamp, and deletedAt
	 */
	public async saveEnvironment(data: EnvironmentModelType): Promise<void> {
		try {
			await EnvironmentModel.upsert({
				id: data.id,
				environment: data.environment,
				environmentUuid: data.environmentUuid,
				timestamp: data.timestamp,
				deletedAt: data.deletedAt || null,
			})
		} catch (error) {
			console.error(`Error saving environment ${data.environmentUuid} to database:`, error)
			throw error
		}
	}

	/**
	 * Soft delete an environment from the database
	 * @param uuid The environment UUID to soft delete
	 */
	public async deleteEnvironment(uuid: string): Promise<void> {
		try {
			await EnvironmentModel.update(
				{ deletedAt: new Date() },
				{
					where: {
						id: uuid,
						deletedAt: null,
					},
				},
			)
		} catch (error) {
			console.error(`Error soft deleting environment ${uuid} from database:`, error)
			throw error
		}
	}

	/**
	 * Restore a soft-deleted environment
	 * @param uuid The environment UUID to restore
	 */
	public async restoreEnvironment(uuid: string): Promise<void> {
		try {
			await EnvironmentModel.update(
				{ deletedAt: null },
				{
					where: {
						id: uuid,
						deletedAt: { [Op.ne]: null },
					},
				},
			)
		} catch (error) {
			console.error(`Error restoring environment ${uuid} from database:`, error)
			throw error
		}
	}

	/**
	 * Load all soft-deleted environments from the database
	 */
	public async loadDeletedEnvironments(): Promise<EnvironmentModelType[]> {
		try {
			const environmentRecords = (
				await EnvironmentModel.findAll({
					where: {
						deletedAt: { [Op.ne]: null },
					},
				})
			).map((e) => e.get({ plain: true }))
			return environmentRecords
		} catch (error) {
			console.error('Error loading deleted environments from database:', error)
			return []
		}
	}

	/**
	 * Permanently delete an environment from the database
	 * @param uuid The environment UUID to permanently delete
	 */
	public async permanentDeleteEnvironment(uuid: string): Promise<void> {
		try {
			await EnvironmentModel.destroy({
				where: { id: uuid },
			})
		} catch (error) {
			console.error(`Error permanently deleting environment ${uuid} from database:`, error)
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
	 * Get all environment UUIDs from the database (excluding soft-deleted ones)
	 */
	public async getAllEnvironmentUuids(): Promise<string[]> {
		try {
			const records = await EnvironmentModel.findAll({
				attributes: ['environmentUuid'],
				where: {
					deletedAt: null,
				},
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
