import {
	RecentActionsStore,
	saveRecentUpdateSyncAction,
	transformSyncAction,
	UpSyncActions,
} from '@mockoon/cloud'
import { Mutex } from 'async-mutex'
import { EventEmitter } from 'events'
import { debounce } from 'lodash'
import { EnvironmentModelType } from './dbAdapters/postgres-environment-database'
import { environmentsReducer, EnvironmentsState } from './environment-store.reducer'
import { calcHash } from './hash'

/**
 * Interface for database operations, to be implemented separately
 */
export interface IEnvironmentDatabase {
	initialize(): Promise<void>
	loadEnvironments(): Promise<EnvironmentModelType[]>
	saveEnvironment(data: EnvironmentModelType): Promise<void>
	deleteEnvironment(uuid: string): Promise<void>
	updateLastSync(timestamp: number): Promise<void>
	getAllEnvironmentUuids(): Promise<string[]>
	close(): Promise<void>
}

/**
 * Singleton class to manage the environments state with database persistence
 * Uses a mutex to handle race conditions during mutations
 */
export class DatabaseStore extends EventEmitter {
	private static instance: DatabaseStore
	private state: EnvironmentsState
	private mutex: Mutex
	private syncInterval: NodeJS.Timeout | null = null
	private isInitialized = false
	private syncRequested = false
	private dbAdapter: IEnvironmentDatabase | null = null

	private recentActions: RecentActionsStore = {}
	private previousActionHash: string | null = null

	public getRecentActionsStore() {
		return this.recentActions
	}
	private constructor() {
		super()
		this.state = { data: [] }
		this.mutex = new Mutex()
		this.debouncedSync = debounce(this.syncToDatabase.bind(this), 1000)
	}

	/**
	 * Get the singleton instance
	 */
	public static getInstance(): DatabaseStore {
		if (!DatabaseStore.instance) {
			DatabaseStore.instance = new DatabaseStore()
		}
		return DatabaseStore.instance
	}

	/**
	 * Initialize the store from the database
	 * @param dbAdapter The database adapter implementation
	 * @param syncIntervalMs How often to sync to database (in ms). Default 30000 (30 seconds).
	 */
	public async initialize(dbAdapter: IEnvironmentDatabase, syncIntervalMs = 30000): Promise<void> {
		if (this.isInitialized) {
			return
		}

		this.dbAdapter = dbAdapter

		// Initialize the database connection
		await this.dbAdapter.initialize()

		// Load initial state from the database
		await this.loadFromDatabase()

		// Set up periodic sync to database
		if (syncIntervalMs > 0) {
			this.syncInterval = setInterval(() => {
				this.syncToDatabase()
			}, syncIntervalMs)
		}

		this.isInitialized = true
		this.emit('initialized')
	}

	/**
	 * Get the current state
	 */
	public getState(): EnvironmentsState {
		return this.state
	}

	/**
	 * Request a state update using the reducer
	 * Uses mutex to prevent race conditions
	 * @param action Action to dispatch to the reducer
	 */
	public async dispatch(action: UpSyncActions): Promise<EnvironmentModelType | null> {
		const hash = calcHash(action)
		return this.mutex.runExclusive(async () => {
			const transformedAction = transformSyncAction(action, this.getRecentActionsStore())
			if (transformedAction !== null && hash !== this.previousActionHash) {
				saveRecentUpdateSyncAction(action, this.getRecentActionsStore())
				// Apply the action to the current state
				this.state = environmentsReducer(this.state, action)

				// Request a sync to the database
				this.requestSync()

				// Emit a 'stateUpdated' event so subscribers can react
				this.emit('stateUpdated', this.state)
			}
			this.previousActionHash = hash
			if ('environmentUuid' in action) {
				return (
					this.state.data.find((env) => env.environment.uuid === action.environmentUuid) || null
				)
			}
			return null
		})
	}

	/**
	 * Get an environment by UUID
	 * @param uuid Environment UUID
	 * @returns The environment or undefined if not found
	 */
	public getEnvironmentByUUID(uuid: string): EnvironmentModelType | undefined {
		return this.state.data.find((env) => env.environment.uuid === uuid)
	}

	/**
	 * Close the database connection and clean up resources
	 */
	public async close(): Promise<void> {
		if (this.syncInterval) {
			clearInterval(this.syncInterval)
			this.syncInterval = null
		}

		// Final sync to database
		await this.syncToDatabase()

		// Close the database connection
		if (this.dbAdapter) {
			await this.dbAdapter.close()
		}
	}

	/**
	 * Force an immediate sync to database
	 */
	public async forceSync(): Promise<void> {
		this.syncRequested = true
		return this.syncToDatabase()
	}

	/**
	 * Request a sync to database (debounced)
	 */
	private requestSync(): void {
		this.syncRequested = true
		this.debouncedSync()
	}

	/**
	 * Debounced sync function to limit database writes
	 */
	private debouncedSync: () => void

	/**
	 * Load the state from the database
	 */
	private async loadFromDatabase(): Promise<void> {
		return this.mutex.runExclusive(async () => {
			if (!this.dbAdapter) {
				throw new Error('Database adapter not initialized')
			}

			try {
				// Load environments from database
				const environments = await this.dbAdapter.loadEnvironments()
				this.state = {
					data: environments,
				}
			} catch (error) {
				console.error('Error loading from database:', error)
				throw error
			}
		})
	}

	/**
	 * Sync the current state to the database
	 */
	private async syncToDatabase(): Promise<void> {
		if (!this.syncRequested || !this.dbAdapter) {
			return
		}

		return this.mutex.runExclusive(async () => {
			try {
				// Get all environment UUIDs from the database
				const existingUuids = await this.dbAdapter!.getAllEnvironmentUuids()

				// Current environment UUIDs in state
				const currentUuids = this.state.data.map(
					(envWithTimestamp) => envWithTimestamp.environment.uuid,
				)

				// Delete environments that no longer exist in state
				for (const uuid of existingUuids) {
					if (!currentUuids.includes(uuid)) {
						await this.dbAdapter!.deleteEnvironment(uuid)
					}
				}

				// Update or insert environments
				for (const envWithTimestamp of this.state.data) {
					// Save to database with the new signature - use environment as payload and timestamp from lastUpdateTimestamp
					await this.dbAdapter!.saveEnvironment(envWithTimestamp)
				}

				// Update last sync timestamp
				await this.dbAdapter!.updateLastSync(Date.now())

				this.syncRequested = false
				this.emit('synced')
			} catch (error) {
				console.error('Error syncing to database:', error)
				throw error
			}
		})
	}
}
