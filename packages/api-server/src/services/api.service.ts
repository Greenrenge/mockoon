import { User } from '@mockoon/cloud'
import cookieParser from 'cookie-parser'
import { Kind } from 'graphql'
import GraphQLJSON from 'graphql-type-json'
import helmet from 'helmet'
import type { ClientRequest, ServerResponse } from 'http'
import { pick } from 'lodash'
import { Context, Errors, ServiceBroker } from 'moleculer'
import moleculerApolloServer from 'moleculer-apollo-server'
import ApiGateway, {
	Alias,
	ApiSettingsSchema,
	GatewayResponse,
	IncomingRequest,
	Route,
} from 'moleculer-web'
import config from '../config'
import { buildStaticRoute } from '../static-assets-serve/route-builder'
import { AccountInfo, AppService, AuthContextMeta } from '../types/common'

const { ApolloService, moleculerGql: gql } = moleculerApolloServer

const typeDefs = gql`
	scalar Date
	scalar Timestamp
	scalar JSON
	scalar Upload

	type Pagination {
		total: Int
		skip: Int
		limit: Int
	}

	type PaginationCursor {
		hasNextPage: Boolean!
		nextCursor: String
	}

	type Response {
		message: String
	}
`
export default {
	name: 'api',
	mixins: [
		ApiGateway,
		ApolloService({
			// Global GraphQL typeDefs
			typeDefs,
			// Global resolvers
			resolvers: {
				JSON: GraphQLJSON,
				Date: {
					__parseValue(value: any) {
						return new Date(value) // value from the client
					},
					__serialize(value: any) {
						return new Date(value) //  value sent to the client
					},
					__parseLiteral(ast: any) {
						if (ast.kind === Kind.INT) {
							return parseInt(ast.value, 10) // ast value is always in string format
						}

						return null
					},
				},
				Timestamp: {
					__parseValue(value: any) {
						return new Date(value) // value from the client
					},
					__serialize(value: any) {
						return new Date(value).toISOString() // value sent to the client
					},
					__parseLiteral(ast: any) {
						if (ast.kind === Kind.INT) {
							return parseInt(ast.value, 10) // ast value is always in string format
						}

						return null
					},
				},
			},
			// API Gateway route options
			routeOptions: {
				path: '/graphql',
				authentication: true,
				cors: {
					origin: '*',
				},
				mappingPolicy: 'restrict',
				bodyParsers: {
					json: true,
					urlencoded: { extended: true, limit: '5MB' },
				},
				use: [],
				onBeforeCall(ctx: Context, route: any, req: any, res: any) {
					if (req.$params.$serviceInterchange !== undefined) {
						delete req.$params.$serviceInterchange
					}

					// set $graphql flag to true for later return null rather than throwing at the afterHook level
					// @ts-expect-error
					ctx.meta.$graphql = true
					return Promise.resolve()
				},
			},
			serverOptions: {
				subscriptions: {
					keepAlive: 5000,
					// @ts-expect-error
					onDisconnect(
						webSocket: WebSocket,
						// @ts-expect-error
						context: { initPromise: Promise<any>; isLegacy; socket; request; operations },
					) {
						// initPromise will call onConnect again
						// eslint-disable-next-line @typescript-eslint/no-floating-promises
						context.initPromise
							.catch((err) => {
								// eslint-disable-next-line no-console
								console.error(':::::WebSocket Closed:', err?.message)
							})
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							.then(({ $ctx, $socket, $service, $params } = {}) => {})
					},

					// @ts-expect-error
					async onConnect(
						this: AppService,
						connectionParams: any,
						socket: WebSocket,
						context,
					): Promise<any> {
						const { Authorization, authorization } = connectionParams || {}
						const token =
							(authorization && authorization.startsWith('Bearer ') && authorization.slice(7)) ||
							(Authorization && Authorization.startsWith('Bearer ') && Authorization.slice(7))

						if (!token) throw new Errors.MoleculerClientError('Unauthorized', 401, 'UNAUTHORIZED')

						const accountInfo = await this.broker.call<AccountInfo, any>('auth.validateToken', {
							token,
						})

						const originalSend = socket.send
						if (!accountInfo) {
							throw new Errors.MoleculerClientError('Unauthorized', 401, 'UNAUTHORIZED')
						}

						const { $ctx, $socket, $service, $params } = await this.actions.ws({
							connectionParams,
							socket,
						})

						socket.send = function (...data: any[]) {
							// @ts-expect-error
							originalSend.call(socket, ...data)
						}

						$ctx.meta.accessToken = token
						$ctx.meta.accountId = accountInfo.id
						$ctx.meta.accountInfo = accountInfo

						$ctx.meta.user = await this.broker.call<User, {}>(
							'saas.me',
							{},
							{
								ctx: $ctx,
							},
						)
						$ctx.meta.$graphql = true
						$ctx.meta.$socket = $socket

						return {
							$ctx,
							$socket,
							$service,
							$params,
						}
					},
				},
			},
		}),
	],
	settings: {
		openapi: {
			cacheOpenApi: false,
		},
		rest: '/_api-gateway', // turns /api/v1/api to "/api/_internal/list-aliases",
		cors: {
			origin: '*',
			// credentials: true,
			allowedHeaders: '*',
			methods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
		},
		// Global middlewares. Applied to all routes.
		use: [
			cookieParser(),
			helmet(
				// CSP fixed for gql playground freezed on loading screen
				// https://github.com/graphql/graphql-playground/issues/1283#issuecomment-703631091
				{
					// contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
					contentSecurityPolicy: false,
				},
			),
		],
		port: config.configuration.apiPort,
		routes: [
			{
				path: '/public',
				bodyParsers: {
					json: {
						limit: '20mb',
					},
					urlencoded: { extended: true },
				},
				mappingPolicy: 'restrict',
				aliases: {
					'GET /web-config': 'api.webConfig',
					'GET /_info': 'api.info',
					'GET /_aliases': 'api.listAliases',
					'GET /_health': 'api.health',
				},
			},
			buildStaticRoute({
				fromFolder: './src/assets/auth',
				toRoute: '/auth',
			}),
			buildStaticRoute({
				fromFolder:
					process.env.NODE_ENV === 'production' ? './src/assets/app' : '../app/dist/renderer',
				toRoute: '/app',
			}),
			{
				path: '/api',
				bodyParsers: {
					json: {
						limit: '20mb',
					},
					urlencoded: { extended: true },
				},
				mappingPolicy: 'restrict',
				whitelist: ['api.listAliases', 'mockoon.*', 'deployments.*', 'saas.*'],
				aliases: {},
				autoAliases: true, // allow api.* to be called directly with rest: config
				authentication: true, // allow request authorization header to ctx.meta.accessToken/accountId
				use: [
					function errorHandler(
						this: ServiceBroker & ApiSettingsSchema,
						err: any,
						req: IncomingRequest,
						res: GatewayResponse,
						next: (err?: any) => void,
					) {
						this.logger.error('Error is occurred in middlewares!')
						this.sendError(req, res, err)
					},
				],
				onError(req: IncomingRequest, res: GatewayResponse, err: any) {
					res.setHeader('Content-Type', 'application/json')
					if ('code' in err && typeof err.code === 'number') {
						res.writeHead(err.code)
					} else {
						res.writeHead(500)
					}
					res.end(JSON.stringify({ error: { message: err.message } }))
				},
			},
			{
				path: '/api/files',

				// You should disable body parsers
				bodyParsers: {
					json: false,
					urlencoded: false,
				},

				aliases: {
					'PUT /import-open-api': 'multipart:import-export.importOpenAPI',
					'GET /export-open-api/:environmentUuid': 'import-export.exportOpenAPI',
				},

				// https://github.com/mscdex/busboy#busboy-methods
				busboyConfig: {
					limits: {
						files: 1,
					},
				},

				callOptions: {},
				mappingPolicy: 'restrict',
				authentication: true,
				use: [
					function errorHandler(
						this: ServiceBroker & ApiSettingsSchema,
						err: any,
						req: IncomingRequest,
						res: GatewayResponse,
						next: (err?: any) => void,
					) {
						this.logger.error('Error is occurred in middlewares!')
						this.sendError(req, res, err)
					},
				],
				onError(req: IncomingRequest, res: GatewayResponse, err: any) {
					res.setHeader('Content-Type', 'application/json')
					if ('code' in err && typeof err.code === 'number') {
						res.writeHead(err.code)
					} else {
						res.writeHead(500)
					}
					res.end(JSON.stringify({ error: { message: err.message } }))
				},
			},
			...(process.env.NODE_ENV === 'production'
				? []
				: [
						{
							path: '/openapi',
							openapi: {
								// Define an OpenAPI specification that will apply to all aliases within this route
							},
							aliases: {
								'GET /openapi.json': 'openapi.generateDocs',
								'GET /ui': 'openapi.ui',
								'GET /assets/:file': 'openapi.assets',
								'GET /oauth2-redirect': 'openapi.oauth2Redirect',
							},
						},
						{
							// for moleculer-web API Gateway UI
							path: '/$moleculer',
							bodyParsers: {
								json: true,
								urlencoded: { extended: true },
							},
							whitelist: ['$node.services', '$node.actions', 'api.options', '$node.list'],
							aliases: {
								'GET /nodes/services': '$node.services',
								'GET /nodes/actions': '$node.actions',
								'GET /nodes/options': 'api.options',
								'GET /nodes/list': '$node.list',
							},
							// authentication: true,
							// authorization: true,
							/**
							 * 	all - enable to request all routes with or without aliases (default)
							 *	restrict - enable to request only the routes with aliases.
							 */
							mappingPolicy: 'restrict',
							use: [
								function errorHandler(
									this: ServiceBroker & ApiSettingsSchema,
									err: any,
									req: IncomingRequest,
									res: GatewayResponse,
									next: (err?: any) => void,
								) {
									this.logger.error('Error is occurred in middlewares!')
									this.sendError(req, res, err)
								},
							],
							onError(req: IncomingRequest, res: GatewayResponse, err: any) {
								res.setHeader('Content-Type', 'application/json')
								res.writeHead(err.code || 500)
								res.end(JSON.stringify({ error: { message: err.message } }))
							},
						},
					]),
		],
		assets: {
			// folder: process.env.NODE_ENV === 'production' ? './src/public' : '../app/dist/renderer',
			folder: process.env.NODE_ENV === 'production' ? './src/public' : '../main-web/out',
			options: {},
		},
		onError(req: ClientRequest, res: ServerResponse, err: Error) {
			res.setHeader('Content-Type', 'text/plain')
			const code =
				err instanceof Error && 'code' in err && typeof err.code === 'number' ? err.code : 500
			res.writeHead(code)
			res.end(`Global error: ${err.message}`)
		},
	},
	actions: {
		webConfig: {
			visibility: 'published',
			handler(ctx: Context) {
				const authProvider = config.configuration.authProvider
				return {
					websiteURL: config.configuration.webFullUrl, // current web url
					apiURL: `${config.configuration.webFullUrl}${
						config.configuration.webFullUrl?.endsWith('/') ? '' : '/'
					}api/`, // current api url
					authProvider,
					option: {
						...(authProvider === 'supabase' && {
							url: config.supabase.url,
							anonKey: config.supabase.anonKey,
						}),
						...(authProvider === 'keycloak' && {
							url: config.keycloak.url,
							realm: config.keycloak.realm,
							clientId: config.keycloak.clientId,
						}),
					},
				}
			},
		},
		info: {
			handler() {
				return 'API Gateway Service'
			},
		},
		health: {
			handler() {
				return 'OK'
			},
		},
		options: {
			handler(ctx: Context) {
				const { broker } = ctx
				const { options } = broker
				return {
					...pick(options, [
						'logLevel',
						'namespace',
						'serializer',
						'maxCallLevel',
						'tracking',
						'disableBalancer',
						'nodeID',
						'middlewares',
						'metadata',
						'registry',
						'metrics',
						'tracing',
					]),
					...(options?.transporter && {
						transporter:
							typeof options?.transporter === 'string' &&
							options?.transporter?.startsWith('nats://')
								? 'nats'
								: false,
					}),
					...(options?.cacher &&
						typeof options?.cacher === 'object' &&
						'type' in options.cacher && {
							cacher: options?.cacher?.type || false,
						}),
				}
			},
		},
	},
	events: {},
	methods: {
		authorize(ctx: AuthContextMeta) {
			if (!ctx.meta.accountId) {
				throw new Errors.MoleculerClientError('Unauthorized', 401, 'UNAUTHORIZED')
			}
		},
		// automatically called by moleculer-web, authentication: true
		async authenticate(
			this: ServiceBroker,
			ctx: AuthContextMeta,
			route: Route,
			req: IncomingRequest,
			res: GatewayResponse,
			alias: Alias,
		) {
			const token =
				req.headers.authorization &&
				req.headers.authorization.startsWith('Bearer ') &&
				req.headers.authorization.slice(7)

			if (token || config.configuration.authProvider === 'disabled') {
				if (
					config.configuration.authProvider === 'supabase' &&
					config.supabase.serviceRoleKey &&
					token === config.supabase.serviceRoleKey
				) {
					ctx.meta.accountId = 'service-role'
					ctx.meta.accessToken = token
					return ctx.call<User>('auth.getServiceRoleUser') // TODO: change service role fixed to F1 to be the admin of the tenant / team
				}

				try {
					// Verify the token by getting the user session
					const accountInfo = await ctx.call<AccountInfo, any>('auth.validateToken', {
						token,
					})
					if (accountInfo) {
						ctx.meta.accountId = accountInfo.id
						ctx.meta.accessToken = token
						ctx.meta.accountInfo = accountInfo
					}
					return await ctx.call<User, {}>('saas.me', {}, { ctx })
				} catch (err) {
					this.logger.error('Error authenticating user:', err)
					return null
				}
			}
			return null
		},
	},
}
