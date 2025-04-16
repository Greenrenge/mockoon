import { User } from '@supabase/supabase-js'
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

export type MoleculerService<TExtend = any> = Service<AppServiceSettingSchema & TExtend>
export type AppBroker = ServiceBroker & {} & {
	callInternal: typeof ServiceBroker.prototype.call
}
export type AuthContextMeta<Params = any> = Context<
	Params,
	{
		accountId: string
		accessToken?: string
		user?: User
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
	}
> & {
	broker: AppBroker
}

export type AuthorizedContextMeta<Params = any> = AuthContextMeta<Params> & {
	user: User
}

export type ObjectValues<T> = T[keyof T]

type AppServiceSettingSchema = ServiceSettingSchema & {
	graphql?: {
		type?: string | string[]
		resolvers?: ServiceResolverSchema | IResolvers | IResolvers[]
	}
}
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

export type AppService<TMethods = {}, S = AppServiceSettingSchema> = Omit<Service<S>, 'broker'> &
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

export type AppServiceSchema<S = AppServiceSettingSchema> = ServiceSchema<S> & {
	channels?: Record<string, AppEventSchema>
}
