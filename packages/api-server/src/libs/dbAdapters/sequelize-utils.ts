import { ModelStatic, Sequelize } from 'sequelize'

/**
 * Check if the Sequelize instance is using SQLite
 * @param sequelize - The Sequelize instance
 * @returns true if using SQLite, false otherwise
 */
export function isSQLite(sequelize: Sequelize): boolean {
	return sequelize.getDialect() === 'sqlite'
}

/**
 * Check if the Sequelize instance is using PostgreSQL
 * @param sequelize - The Sequelize instance
 * @returns true if using PostgreSQL, false otherwise
 */
export function isPostgreSQL(sequelize: Sequelize): boolean {
	return sequelize.getDialect() === 'postgres'
}

/**
 * Check if the Sequelize instance is using MySQL
 * @param sequelize - The Sequelize instance
 * @returns true if using MySQL, false otherwise
 */
export function isMySQL(sequelize: Sequelize): boolean {
	return sequelize.getDialect() === 'mysql'
}

/**
 * Get the database dialect name
 * @param sequelize - The Sequelize instance
 * @returns The dialect name (sqlite, postgres, mysql, mssql, etc.)
 */
export function getDialect(sequelize: Sequelize): string {
	return sequelize.getDialect()
}

//https://github.com/sequelize/sequelize/issues/12992
export async function syncSequelize<T extends ModelStatic<any>>({
	sequelize,
	Model,
}: {
	sequelize: Sequelize
	Model: T
}): Promise<void> {
	const queryInterface = sequelize.getQueryInterface()
	const tableNames = await queryInterface.showAllTables()
	try {
		// Check if SQLite for specific handling if needed
		if (isSQLite(sequelize)) {
			const backupTableName = Model.tableName + '_backup'
			if (tableNames.includes(backupTableName)) {
				await queryInterface.dropTable(backupTableName)
			}
			console.log('🔄syncing model', Model.name, 'with alter=true')
			await Model.sync({ alter: true })
		} else {
			console.log('🔄syncing model', Model.name, 'with alter=false')
			await Model.sync({ alter: false })
		}
	} catch (e) {
		console.error('💔model sync error', e)
	}
}
