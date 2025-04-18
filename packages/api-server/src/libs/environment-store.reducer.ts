import { SyncActionTypes, UpSyncActions } from '@mockoon/cloud'
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
import { EnvironmentModelType } from './dbAdapters/postgres-environment-database'

/**
 * State containing environments with their timestamps
 */
export type EnvironmentsState = {
	data: EnvironmentModelType[]
}
//got mapped from reducerActionToSyncActionBuilder
export const environmentsReducer = (
	state: EnvironmentsState,
	action: UpSyncActions,
): EnvironmentsState => {
	let newState: EnvironmentsState

	switch (action.type) {
		case SyncActionTypes.REORDER_ROUTES: {
			const newEnvironments = state.data.map((environment) => {
				if (environment.environment.uuid === action.environmentUuid) {
					return {
						...environment,
						environment: reorderRoutesMutator(environment.environment, action.reorderAction),
						timestamp: action.timestamp,
					}
				}

				return environment
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REORDER_DATABUCKETS: {
			const newEnvironments = state.data.map((datum) => {
				if (datum.environment.uuid === action.environmentUuid) {
					return {
						...datum,
						environment: reorderDatabucketMutator(datum.environment, action.reorderAction),
						timestamp: action.timestamp,
					}
				}

				return datum
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REORDER_CALLBACKS: {
			const newEnvironments = state.data.map((environment) => {
				if (environment.environment.uuid === action.environmentUuid) {
					return {
						...environment,
						environment: reorderCallbackMutator(environment.environment, action.reorderAction),
						timestamp: action.timestamp,
					}
				}

				return environment
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REORDER_ROUTE_RESPONSES: {
			const newEnvironments = state.data.map((environment) => {
				if (environment.environment.uuid === action.environmentUuid) {
					return {
						...environment,
						environment: reorderRouteResponseMutator(
							environment.environment,
							action.routeUuid,
							action.reorderAction,
						),
						timestamp: action.timestamp,
					}
				}

				return environment
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.ADD_CLOUD_ENVIRONMENT: {
			const newEnvironment: Environment = action.environment
			const environments = [...state.data]

			// if (action.insertAfterIndex != null) {
			// 	environments.splice(action.insertAfterIndex + 1, 0, newEnvironment)
			// } else {
			environments.push({
				environment: newEnvironment,
				timestamp: action.timestamp,
				environmentUuid: newEnvironment.uuid,
				id: newEnvironment.uuid,
			})
			// }

			newState = {
				...state,
				data: environments,
			}
			break
		}

		// case SyncActionTypes.REMOVE_ENVIRONMENT:
		case SyncActionTypes.REMOVE_CLOUD_ENVIRONMENT: {
			const newEnvironments = state.data.filter(
				(environment) => environment.environment.uuid !== action.environmentUuid,
			)

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.UPDATE_ENVIRONMENT: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: updateEnvironmentMutator(environment.environment, action.properties),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_ROUTE: {
			const newEnvironments = state.data.map((environment) => {
				if (environment.environment.uuid === action.environmentUuid) {
					return {
						...environment,
						environment: removeRouteMutator(environment.environment, action.routeUuid),
						timestamp: action.timestamp,
					}
				}

				return environment
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.REMOVE_ROUTE_RESPONSE: {
			const newEnvironments = state.data.map((environment) => {
				if (environment.environment.uuid === action.environmentUuid) {
					return {
						...environment,
						environment: removeRouteResponseMutator(
							environment.environment,
							action.routeUuid,
							action.routeResponseUuid,
						),
						timestamp: action.timestamp,
					}
				}

				return environment
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.ADD_FOLDER: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: addFolderMutator(
								environment.environment,
								action.folder,
								action.parentId,
							),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_FOLDER: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: removeFolderMutator(environment.environment, action.folderUuid),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.UPDATE_FOLDER: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: updateFolderMutator(
								environment.environment,
								action.folderUuid,
								action.properties,
							),
							timestamp: action.timestamp,
						}
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
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: addRouteMutator(environment.environment, newRoute, action.parentId),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.UPDATE_ROUTE: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: updateRouteMutator(
								environment.environment,
								action.routeUuid,
								action.properties,
							),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.ADD_CALLBACK: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: addCallbackMutator(
								environment.environment,
								action.callback,
								action.insertAfterUuid,
							),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_CALLBACK: {
			const newEnvironments = state.data.map((environment) => {
				if (environment.environment.uuid === action.environmentUuid) {
					return {
						...environment,
						environment: removeCallbackMutator(environment.environment, action.callbackUuid),
						timestamp: action.timestamp,
					}
				}

				return environment
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.UPDATE_CALLBACK: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: updateCallbackMutator(
								environment.environment,
								action.callbackUuid,
								action.properties,
							),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.ADD_DATABUCKET: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: addDatabucketMutator(
								environment.environment,
								action.databucket,
								action.insertAfterUuid,
							),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.REMOVE_DATABUCKET: {
			const newEnvironments = state.data.map((environment) => {
				if (environment.environment.uuid === action.environmentUuid) {
					return {
						...environment,
						environment: removeDatabucketMutator(environment.environment, action.databucketUuid),
						timestamp: action.timestamp,
					}
				}

				return environment
			})

			newState = {
				...state,
				data: newEnvironments,
			}
			break
		}

		case SyncActionTypes.UPDATE_DATABUCKET: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: updateDatabucketMutator(
								environment.environment,
								action.databucketUuid,
								action.properties,
							),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.ADD_ROUTE_RESPONSE: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: addRouteResponseMutator(
								environment.environment,
								action.routeUuid,
								action.routeResponse,
								action.insertAfterUuid,
							),
							timestamp: action.timestamp,
						}
					}

					return environment
				}),
			}
			break
		}

		case SyncActionTypes.UPDATE_ROUTE_RESPONSE: {
			newState = {
				...state,
				data: state.data.map((environment) => {
					if (environment.environment.uuid === action.environmentUuid) {
						return {
							...environment,
							environment: updateRouteResponseMutator(
								environment.environment,
								action.routeUuid,
								action.routeResponseUuid,
								action.properties,
							),
							timestamp: action.timestamp,
						}
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
