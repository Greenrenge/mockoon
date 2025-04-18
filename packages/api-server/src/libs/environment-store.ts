import { SyncActionTypes } from '@mockoon/cloud'
import {
	Environment,
	addCallbackMutator,
	addDatabucketMutator,
	addFolderMutator,
	addRouteMutator,
	addRouteResponseMutator,
	removeCallbackMutator,
	removeDatabucketMutator,
	removeFolderMutator,
	removeRouteMutator,
	removeRouteResponseMutator,
	reorderCallbackMutator,
	reorderDatabucketMutator,
	reorderRouteResponseMutator,
	reorderRoutesMutator,
	updateCallbackMutator,
	updateDatabucketMutator,
	updateEnvironmentMutator,
	updateFolderMutator,
	updateRouteMutator,
	updateRouteResponseMutator,
} from '@mockoon/commons'

export type EnvironmentsState = {
	environments: Environment[]
}
//got mapped from reducerActionToSyncActionBuilder
export const environmentsReducer = (state: EnvironmentsState, action: any): EnvironmentsState => {
	let newState: EnvironmentsState

	switch (action.type) {
		case SyncActionTypes.REORDER_ROUTES: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return reorderRoutesMutator(environment, action.reorderAction)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REORDER_DATABUCKETS: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return reorderDatabucketMutator(environment, action.reorderAction)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REORDER_CALLBACKS: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return reorderCallbackMutator(environment, action.reorderAction)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REORDER_ROUTE_RESPONSES: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return reorderRouteResponseMutator(environment, action.routeUuid, action.reorderAction)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.ADD_CLOUD_ENVIRONMENT: {
			const newEnvironment: Environment = action.environment
			const environments = [...state.environments]

			if (action.insertAfterIndex != null) {
				environments.splice(action.insertAfterIndex + 1, 0, newEnvironment)
			} else {
				environments.push(newEnvironment)
			}

			newState = {
				...state,
				environments,
			}
			break
		}

		// case SyncActionTypes.REMOVE_ENVIRONMENT:
		case SyncActionTypes.REMOVE_CLOUD_ENVIRONMENT: {
			const newEnvironments = state.environments.filter(
				(environment) => environment.uuid !== action.environmentUuid,
			)

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.UPDATE_ENVIRONMENT: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return updateEnvironmentMutator(environment, action.properties)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_ROUTE: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return removeRouteMutator(environment, action.routeUuid)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REMOVE_ROUTE_RESPONSE: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return removeRouteResponseMutator(environment, action.routeUuid, action.routeResponseUuid)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.ADD_FOLDER: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return addFolderMutator(environment, action.folder, action.parentId)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_FOLDER: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return removeFolderMutator(environment, action.folderUuid)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.UPDATE_FOLDER: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return updateFolderMutator(environment, action.folderUuid, action.properties)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.ADD_ROUTE: {
			const newRoute = action.route

			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return addRouteMutator(environment, newRoute, action.parentId)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.UPDATE_ROUTE: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return updateRouteMutator(environment, action.routeUuid, action.properties)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.ADD_CALLBACK: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return addCallbackMutator(environment, action.callback, action.insertAfterUuid)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_CALLBACK: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return removeCallbackMutator(environment, action.callbackUuid)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.UPDATE_CALLBACK: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return updateCallbackMutator(environment, action.callbackUuid, action.properties)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.ADD_DATABUCKET: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return addDatabucketMutator(environment, action.databucket, action.insertAfterUuid)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_DATABUCKET: {
			const newEnvironments = state.environments.map((environment) => {
				if (environment.uuid === action.environmentUuid) {
					return removeDatabucketMutator(environment, action.databucketUuid)
				}

				return environment
			})

			newState = {
				...state,
				environments: newEnvironments,
			}
			break
		}

		case SyncActionTypes.UPDATE_DATABUCKET: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return updateDatabucketMutator(environment, action.databucketUuid, action.properties)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.ADD_ROUTE_RESPONSE: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return addRouteResponseMutator(
							environment,
							action.routeUuid,
							action.routeResponse,
							action.insertAfterUuid,
						)
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.UPDATE_ROUTE_RESPONSE: {
			newState = {
				...state,
				environments: state.environments.map((environment) => {
					if (environment.uuid === action.environmentUuid) {
						return updateRouteResponseMutator(
							environment,
							action.routeUuid,
							action.routeResponseUuid,
							action.properties,
						)
					}

					return environment
				}),
			}
			break
		}

		default:
			newState = state
			break
	}

	return newState
}
