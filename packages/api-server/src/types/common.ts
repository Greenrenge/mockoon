import { User } from '@mockoon/cloud'
import type {
	ActionHandler,
	ActionParamTypes,
	ActionSchema,
	Context,
	EventSchema,
	Service,
	ServiceBroker,
	ServiceSchema,
	ServiceSettingSchema,
} from 'moleculer'
import { IResolvers, ServiceResolverSchema } from 'moleculer-apollo-server'
import SequelizeDbAdapter, { CountOptions, QueryOptions } from 'moleculer-db-adapter-sequelize'
import { Sequelize } from 'sequelize'
import { EnvironmentModelType } from '../libs/dbAdapters/environment-database'
export type SyncEnv = EnvironmentModelType & { hash: string }

export type AppMoleculerService<TExtend = any, SExtend = {}> = Service<
	AppServiceSettingSchema & TExtend
> & {
	adapter: SequelizeDbAdapter & {
		count(filters?: CountOptions & { query: QueryOptions }): Promise<number>
	} & {
		db: Sequelize
	}
} & SExtend
export type AccountInfo = {
	id: string
	email: string
	displayName: string
}
export type AppBroker = ServiceBroker & {} & {}
export type AuthContextMeta<Params = any, AdditionalFields extends object = any> = Context<
	Params,
	{
		accountId: string
		accountInfo: AccountInfo
		teamId?: string
		accessToken?: string
		user?: User & { id: string; teams: any[]; isAdmin: boolean }
		$serviceInterchange?: boolean
		/**
		 * API
		 * ctx.meta.$statusCode - set res.statusCode.
		 * ctx.meta.$statusMessage - set res.statusMessage.
		 * ctx.meta.$responseType - set Content-Type in header.
		 * ctx.meta.$responseHeaders - set all keys in header.
		 * ctx.meta.$location - set Location key in header for redirects.
		 */
		$statusCode?: number
		$statusMessage?: string
		$responseType?: string
		$responseHeaders?: Record<string, string>
		$location?: string
		$repl?: boolean

		$join: string | string[]
		$leave: string | string[]
		$socketId: string
		$rooms: string[]
	} & AdditionalFields
> & {
	broker: AppBroker
}

export type AuthorizedContextMeta<Params = any> = AuthContextMeta<Params> & {
	user: User
}

export type ObjectValues<T> = T[keyof T]

export type AppServiceSettingSchema<T = {}> = ServiceSettingSchema & {
	graphql?: {
		type?: string | string[]
		resolvers?: ServiceResolverSchema | IResolvers | IResolvers[]
	}
} & T
type ActionHookBefore<TParams = any, TResp = any> = (
	ctx: AuthContextMeta<TParams>,
) => Promise<void> | void

type ActionHookAfter<TParams = any, TResp = any> = (
	ctx: AuthContextMeta<TParams>,
	res: any,
) => Promise<any> | any
type ActionHookError<TParams = any, TResp = any> = (
	ctx: AuthContextMeta<TParams>,
	err: Error,
) => Promise<void> | void

export type AppService<TMethods = {}, S = AppServiceSettingSchema, T = {}> = Omit<
	AppMoleculerService<S, T>,
	'broker'
> &
	TMethods & {
		broker: AppBroker
	}

export type AppActionSchema<TParams = any, TResp = any, TMethods = {}> = Omit<
	ActionSchema,
	'handler' | 'hooks' | 'params'
> & {
	handler?:
		| ((ctx: AuthContextMeta<TParams> | AuthorizedContextMeta<TParams>) => Promise<TResp>)
		| ((ctx: AuthContextMeta<TParams> | AuthorizedContextMeta<TParams>) => TResp)
	hooks?: {
		before?: string | ActionHookBefore<TParams> | (string | ActionHookBefore<TParams>)[]
		after?: string | ActionHookAfter<TParams> | (string | ActionHookAfter<TParams>)[]
		error?: string | ActionHookError<TParams> | (string | ActionHookError<TParams>)[]
	}
	params?: Record<keyof TParams, ActionParamTypes>
} & ThisType<AppService<TMethods>>

export type AppEventSchema<TPayload = any, TMethods = {}> = Omit<EventSchema, 'handler'> & {
	handler?: (
		ctx: AuthContextMeta<TPayload> | AuthorizedContextMeta<TPayload>,
	) => Promise<void> | void
} & ThisType<AppService<TMethods>>

export type AppServiceActionsSchema<S = AppServiceSettingSchema> = {
	[key: string]: AppActionSchema | ActionHandler | boolean
} & ThisType<AppService>

export type AppServiceSchema<S = AppServiceSettingSchema, P = {}> = ServiceSchema<
	S & {
		fields?: string[]
		idField?: string
	}
> & {
	adapter?: any
	model?: any
	afterConnected?: () => Promise<void> | void
} & P
