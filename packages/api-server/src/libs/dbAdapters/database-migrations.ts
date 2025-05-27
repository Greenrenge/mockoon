import { DataTypes, QueryInterface, Sequelize } from 'sequelize'

/**
 * Database migration utilities for production environments
 */
export class DatabaseMigrations {
	private queryInterface: QueryInterface
	private sequelize: Sequelize

	constructor(sequelize: Sequelize) {
		this.sequelize = sequelize
		this.queryInterface = sequelize.getQueryInterface()
	}

	/**
	 * Check if a column exists in a table
	 */
	async columnExists(tableName: string, columnName: string): Promise<boolean> {
		try {
			const tableDescription = await this.queryInterface.describeTable(tableName)
			return !!tableDescription[columnName]
		} catch (error) {
			console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error)
			return false
		}
	}

	/**
	 * Check if a table exists
	 */
	async tableExists(tableName: string): Promise<boolean> {
		try {
			const tables = await this.queryInterface.showAllTables()
			return tables.includes(tableName)
		} catch (error) {
			console.error(`Error checking if table ${tableName} exists:`, error)
			return false
		}
	}

	/**
	 * Add deletedAt column to environments table
	 */
	async addDeletedAtToEnvironments(): Promise<boolean> {
		try {
			const columnExists = await this.columnExists('environments', 'deletedAt')

			if (!columnExists) {
				console.log('🔄 Adding deletedAt column to environments table')
				await this.queryInterface.addColumn('environments', 'deletedAt', {
					type: DataTypes.DATE,
					allowNull: true,
					defaultValue: null,
				})
				console.log('✅ deletedAt column added successfully')
				return true
			} else {
				console.log('✅ deletedAt column already exists')
				return true
			}
		} catch (error) {
			console.error('❌ Failed to add deletedAt column:', error)
			return false
		}
	}

	/**
	 * Create index on deletedAt column for better query performance
	 */
	async addDeletedAtIndex(): Promise<boolean> {
		try {
			const indexName = 'environments_deleted_at_idx'

			// Check if index already exists (this is database-specific)
			const dialect = this.sequelize.getDialect()

			if (dialect === 'postgres') {
				const [results] = await this.sequelize.query(`
					SELECT indexname FROM pg_indexes 
					WHERE tablename = 'environments' AND indexname = '${indexName}'
				`)

				if (results.length === 0) {
					console.log('🔄 Creating index on deletedAt column')
					await this.queryInterface.addIndex('environments', ['deletedAt'], {
						name: indexName,
					})
					console.log('✅ deletedAt index created successfully')
				} else {
					console.log('✅ deletedAt index already exists')
				}
			} else if (dialect === 'sqlite') {
				// SQLite index check
				const [results] = await this.sequelize.query(`
					SELECT name FROM sqlite_master 
					WHERE type='index' AND name='${indexName}'
				`)

				if (results.length === 0) {
					console.log('🔄 Creating index on deletedAt column')
					await this.queryInterface.addIndex('environments', ['deletedAt'], {
						name: indexName,
					})
					console.log('✅ deletedAt index created successfully')
				} else {
					console.log('✅ deletedAt index already exists')
				}
			}

			return true
		} catch (error) {
			console.error('❌ Failed to create deletedAt index:', error)
			// Index creation failure shouldn't stop the application
			return false
		}
	}

	/**
	 * Run all migrations
	 */
	async runAllMigrations(): Promise<void> {
		console.log('🚀 Starting database migrations...')

		// Migration 1: Add deletedAt column
		const deletedAtSuccess = await this.addDeletedAtToEnvironments()

		// Migration 2: Add index for better performance
		if (deletedAtSuccess) {
			await this.addDeletedAtIndex()
		}

		console.log('🎉 Database migrations completed')
	}
}

/**
 * Manual SQL migration scripts for production DBAs
 */
export const MANUAL_MIGRATION_SCRIPTS = {
	postgresql: {
		addDeletedAt: `
-- Add deletedAt column to environments table (PostgreSQL)
ALTER TABLE environments 
ADD COLUMN "deletedAt" TIMESTAMP NULL DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS environments_deleted_at_idx 
ON environments ("deletedAt");

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'environments' AND column_name = 'deletedAt';
		`.trim(),
	},

	sqlite: {
		addDeletedAt: `
-- Add deletedAt column to environments table (SQLite)
-- Note: SQLite doesn't support ADD COLUMN with all constraints in older versions
-- This should work in SQLite 3.2.0+

ALTER TABLE environments 
ADD COLUMN deletedAt DATETIME NULL DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS environments_deleted_at_idx 
ON environments (deletedAt);

-- Verify the migration
PRAGMA table_info(environments);
		`.trim(),
	},
}
