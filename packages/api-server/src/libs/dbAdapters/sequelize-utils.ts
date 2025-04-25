import { ModelStatic, Sequelize } from 'sequelize'
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
		const backupTableName = Model.tableName + '_backup'
		if (tableNames.includes(backupTableName)) {
			await queryInterface.dropTable(backupTableName)
		}
		await Model.sync({ alter: true })
	} catch (e) {
		console.error('💔model sync error', e)
	}
}
