import { SyncPresence, SyncUserPresence } from '@mockoon/cloud'
import { AppService, AppServiceSchema } from '../types/common'

interface UserPresenceData extends SyncUserPresence {
	lastSeen: number
	devices: Map<string, Set<string>> // Map of deviceId to set of socketIds
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

	public addUserDevice(
		userId: string,
		deviceId: string,
		socketId: string,
		presenceData: Partial<SyncUserPresence>,
	) {
		let userData = this.userPresences.get(userId)

		if (!userData) {
			userData = {
				uid: userId,
				devices: new Map(),
				lastSeen: Date.now(),
				...presenceData,
			}
			this.userPresences.set(userId, userData)
		}

		let deviceSockets = userData.devices.get(deviceId)
		if (!deviceSockets) {
			deviceSockets = new Set()
			userData.devices.set(deviceId, deviceSockets)
		}
		deviceSockets.add(socketId)

		// Update presence data
		Object.assign(userData, {
			...presenceData,
			lastSeen: Date.now(),
		})
	}

	public removeUserSocket(userId: string, deviceId: string, socketId: string) {
		const userData = this.userPresences.get(userId)
		if (userData) {
			const deviceSockets = userData.devices.get(deviceId)
			if (deviceSockets) {
				deviceSockets.delete(socketId)

				// If no more sockets for this device, remove the device
				if (deviceSockets.size === 0) {
					userData.devices.delete(deviceId)
				}

				// If no more devices, remove the user presence
				if (userData.devices.size === 0) {
					this.userPresences.delete(userId)
				}
			}
			userData.lastSeen = Date.now()
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
			let deviceCount = 0
			userData.devices.forEach((sockets) => {
				if (sockets.size > 0) {
					deviceCount++
				}
			})
			totalDevices += deviceCount
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
				socketId: 'string',
				presenceData: 'object|optional',
			},
			handler(this: AppService, ctx) {
				const { userId, deviceId, socketId, presenceData = {} } = ctx.params
				PresenceStore.getInstance().addUserDevice(userId, deviceId, socketId, presenceData)
				return PresenceStore.getInstance().getPresence()
			},
		},

		removeUserDevice: {
			params: {
				userId: 'string',
				deviceId: 'string',
				socketId: 'string',
			},
			handler(this: AppService, ctx) {
				const { userId, deviceId, socketId } = ctx.params
				PresenceStore.getInstance().removeUserSocket(userId, deviceId, socketId)
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
