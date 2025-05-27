#!/usr/bin/env ts-node

/**
 * Database Migration CLI Tool (TypeScript)
 *
 * Usage:
 *   npm run migrate:check          - Check migration status
 *   npm run migrate:run            - Run pending migrations
 *   npm run migrate:rollback       - Show rollback instructions
 *   npm run migrate:sql            - Show manual SQL commands
 */

import { Sequelize } from 'sequelize'
import config from './src/config'
import {
	DatabaseMigrations,
	MANUAL_MIGRATION_SCRIPTS,
} from './src/libs/dbAdapters/database-migrations'

async function createSequelizeInstance(): Promise<Sequelize> {
	const options = {
		dialect: config.database.dialect as any,
		logging: console.log,
		...(config.database.dialect === 'sqlite'
			? {
					storage: `${config.database.storage}/environments.sqlite`,
				}
			: {
					host: config.database.host,
					port: config.database.port,
					database: config.database.database,
					username: config.database.username,
					password: config.database.password,
					ssl: config.database.ssl,
				}),
	}
	console.log('🔗 Connecting to database with options:', options)

	return new Sequelize(options)
}

async function checkMigrationStatus(): Promise<void> {
	console.log('🔍 Checking migration status...')
	const sequelize = await createSequelizeInstance()
	const migrations = new DatabaseMigrations(sequelize)

	try {
		await sequelize.authenticate()
		console.log('✅ Database connection successful')

		const deletedAtExists = await migrations.columnExists('environments', 'deletedAt')

		if (deletedAtExists) {
			console.log('✅ deletedAt column exists - migration already applied')
		} else {
			console.log('❌ deletedAt column missing - migration needed')
		}

		// Check if environments table exists
		const tableExists = await migrations.tableExists('environments')
		if (tableExists) {
			console.log('✅ environments table exists')
		} else {
			console.log('❌ environments table missing - run application first to create tables')
		}
	} catch (error: any) {
		console.error('❌ Migration check failed:', error.message)
	} finally {
		await sequelize.close()
	}
}

async function runMigrations(): Promise<void> {
	console.log('🚀 Running database migrations...')
	const sequelize = await createSequelizeInstance()
	const migrations = new DatabaseMigrations(sequelize)

	try {
		await sequelize.authenticate()
		await migrations.runAllMigrations()
		console.log('🎉 Migrations completed successfully')
	} catch (error: any) {
		console.error('❌ Migration failed:', error.message)
		process.exit(1)
	} finally {
		await sequelize.close()
	}
}

function showRollbackInstructions(): void {
	console.log(`
⚠️  ROLLBACK INSTRUCTIONS ⚠️

To rollback the deletedAt migration, run these SQL commands:

PostgreSQL:
-----------
-- Remove the deletedAt column (THIS WILL LOSE SOFT DELETE DATA)
ALTER TABLE environments DROP COLUMN "deletedAt";

-- Remove the index
DROP INDEX IF EXISTS environments_deleted_at_idx;

SQLite:
-------
-- SQLite doesn't support DROP COLUMN easily
-- You would need to recreate the table without the column
-- This is complex and not recommended

⚠️  WARNING: Rollback will permanently delete all soft-delete information!
Make sure to export any needed data first.
	`)
}

function showManualSQL(): void {
	const dialect = config.database.dialect

	console.log(`
📋 MANUAL MIGRATION SQL (${dialect.toUpperCase()})
===========================================

${MANUAL_MIGRATION_SCRIPTS?.[dialect as keyof typeof MANUAL_MIGRATION_SCRIPTS]?.addDeletedAt || 'No SQL available for this dialect'}

💡 Copy and run these commands in your database client if automatic migration fails.
	`)
}

function showHelp(): void {
	console.log(`
🛠️  Database Migration Tool
===========================

Usage: npm run migrate:<command>

Commands:
  migrate:check      Check current migration status
  migrate:run        Run pending migrations
  migrate:rollback   Show rollback instructions  
  migrate:sql        Show manual SQL commands
  migrate:help       Show this help message

Examples:
  npm run migrate:check
  npm run migrate:run
  npm run migrate:sql

Direct usage with ts-node:
  npx ts-node -P ./tsconfig-transpile-only.json migrate.ts check
  npx ts-node -P ./tsconfig-transpile-only.json migrate.ts run

Environment Variables:
  Ensure your database configuration is properly set in config files.
	`)
}

async function main(): Promise<void> {
	const command = process.argv[2]

	switch (command) {
		case 'check':
			await checkMigrationStatus()
			break
		case 'run':
			await runMigrations()
			break
		case 'rollback':
			showRollbackInstructions()
			break
		case 'sql':
			showManualSQL()
			break
		case 'help':
		case '--help':
		case '-h':
			showHelp()
			break
		default:
			console.log('❌ Unknown command:', command)
			showHelp()
			process.exit(1)
	}
}

// Run if called directly
if (require.main === module) {
	main().catch((error: any) => {
		console.error('❌ CLI error:', error)
		process.exit(1)
	})
}

export { checkMigrationStatus, runMigrations, showManualSQL, showRollbackInstructions }
