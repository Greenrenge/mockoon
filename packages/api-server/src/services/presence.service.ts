import { SyncPresence, SyncUserPresence } from '@mockoon/cloud'
import { AppService, AppServiceSchema } from '../types/common'

interface UserPresenceData extends SyncUserPresence {
	lastSeen: number
	devices: Set<string> // set of deviceIds
}

class PresenceStore {
	private static instance: PresenceStore
	private userPresences: Map<string, UserPresenceData> = new Map()

	private constructor() {}

	public static getInstance(): PresenceStore {
		if (!PresenceStore.instance) {
			PresenceStore.instance = new PresenceStore()
		}
		return PresenceStore.instance
	}

	public addUserDevice(userId: string, deviceId: string, presenceData: Partial<SyncUserPresence>) {
		let userData = this.userPresences.get(userId)

		if (!userData) {
			userData = {
				uid: userId,
				devices: new Set(),
				lastSeen: Date.now(),
				...presenceData,
			}
			this.userPresences.set(userId, userData)
		}

		userData.devices.add(deviceId)
		// Update presence data
		Object.assign(userData, {
			...presenceData,
			lastSeen: Date.now(),
		})
	}

	public removeUserDevice(userId: string, deviceId: string) {
		const userData = this.userPresences.get(userId)
		if (userData) {
			userData.devices.delete(deviceId)
			userData.lastSeen = Date.now()

			// If no more devices, remove the user presence
			if (userData.devices.size === 0) {
				this.userPresences.delete(userId)
			}
		}
	}

	public updateUserPresence(userId: string, presenceData: Partial<SyncUserPresence>) {
		const userData = this.userPresences.get(userId)
		if (userData) {
			Object.assign(userData, {
				...presenceData,
				lastSeen: Date.now(),
			})
		}
	}

	public getPresence(): SyncPresence {
		let totalDevices = 0
		const users: SyncUserPresence[] = []

		this.userPresences.forEach((userData) => {
			totalDevices += userData.devices.size
			const { devices, lastSeen, ...userPresence } = userData
			users.push(userPresence)
		})

		return {
			devices: totalDevices,
			users,
		}
	}

	public getUserPresence(userId: string): SyncUserPresence | null {
		const userData = this.userPresences.get(userId)
		if (userData) {
			const { devices, lastSeen, ...userPresence } = userData
			return userPresence
		}
		return null
	}
}

const PresenceService: AppServiceSchema = {
	name: 'presence',

	actions: {
		addUserDevice: {
			params: {
				userId: 'string',
				deviceId: 'string',
				presenceData: 'object|optional',
			},
			handler(this: AppService, ctx) {
				const { userId, deviceId, presenceData = {} } = ctx.params
				PresenceStore.getInstance().addUserDevice(userId, deviceId, presenceData)
				return PresenceStore.getInstance().getPresence()
			},
		},

		removeUserDevice: {
			params: {
				userId: 'string',
				deviceId: 'string',
			},
			handler(this: AppService, ctx) {
				const { userId, deviceId } = ctx.params
				PresenceStore.getInstance().removeUserDevice(userId, deviceId)
				return PresenceStore.getInstance().getPresence()
			},
		},

		updateUserPresence: {
			params: {
				userId: 'string',
				presenceData: 'object',
			},
			handler(this: AppService, ctx) {
				const { userId, presenceData } = ctx.params
				PresenceStore.getInstance().updateUserPresence(userId, presenceData)
				return PresenceStore.getInstance().getPresence()
			},
		},

		getPresence: {
			handler() {
				return PresenceStore.getInstance().getPresence()
			},
		},

		getUserPresence: {
			params: {
				userId: 'string',
			},
			handler(this: AppService, ctx) {
				return PresenceStore.getInstance().getUserPresence(ctx.params.userId)
			},
		},
	},
}

export default PresenceService
