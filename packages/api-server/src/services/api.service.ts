import { User } from '@mockoon/cloud'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import type { ClientRequest, ServerResponse } from 'http'
import { pick } from 'lodash'
import { Context, Errors, ServiceBroker } from 'moleculer'
import ApiGateway, {
	Alias,
	ApiSettingsSchema,
	GatewayResponse,
	IncomingRequest,
	Route,
} from 'moleculer-web'
import { AuthContextMeta } from '../types/common'

export default {
	name: 'api',
	mixins: [ApiGateway],
	settings: {
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
					contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
				},
			),
		],
		port: 5003,
		routes: [
			{
				path: '/api',
				bodyParsers: {
					json: true,
					urlencoded: { extended: true },
				},
				mappingPolicy: 'restrict',
				whitelist: ['api.listAliases', 'mockoon.*'],
				aliases: {
					'GET /_info': 'api.info',
					'GET /_aliases': 'api.listAliases',
					'GET /_health': 'api.health',
				},
				autoAliases: true, // allow api.* to be called directly with rest: config
				authentication: true, // allow request authorization header to ctx.meta.accessToken/accountId
				// authorization: true, // the authorization check should be done in the nested-api/micro service level
				/**
				 * 	all - enable to request all routes with or without aliases (default)
				 *	restrict - enable to request only the routes with aliases.
				 */
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
			...(process.env.NODE_ENV === 'production'
				? []
				: [
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
			folder: '../app/dist/renderer',
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

			if (token) {
				try {
					// Verify the token by getting the user session
					const user = await ctx.call<User, any>('auth.validateToken', {
						token,
					})
					if (user) {
						// Include user info in the request context
						ctx.meta.accountId = user.uid
						ctx.meta.accessToken = token
					}
					return user // saved to ctx.meta.user
				} catch (err) {
					this.logger.error('Error authenticating user:', err)
					return null
				}
			}
			return null
		},
	},
}
