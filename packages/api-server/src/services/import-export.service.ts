import { AddCloudEnvironmentSyncAction } from '@mockoon/cloud'
import { OpenAPIConverter } from '@mockoon/commons-server'
import fs from 'fs'
import { uniqueId } from 'lodash'
import { ServiceSchema } from 'moleculer'
import os from 'os'
import path from 'path'
import { Environment } from '../../../commons/dist/cjs'
import { mustLogin } from '../mixins/mustLogin'
import { AuthContextMeta } from '../types/common'

const HashService: ServiceSchema = {
	name: 'import-export',
	mixins: [mustLogin()],
	actions: {
		convertOpenAPI: {
			//https://github.com/moleculerjs/moleculer-web/blob/next/examples/file.service.js
			async handler(ctx: AuthContextMeta<any, any>) {
				this.logger.info('Received upload params:', ctx.params)
				const { filePath, params } = ((await new this.Promise((resolve, reject) => {
					const filePath = path.join(
						os.tmpdir(),
						//@ts-ignore
						ctx.params.$filename || this.randomName(),
					)
					const f = fs.createWriteStream(filePath)
					f.on('close', () => {
						// File written successfully
						this.logger.info(`Uploaded file stored in '${filePath}'`)
						// @ts-ignore
						resolve({ filePath, params: ctx.params })
					})
					// @ts-ignore
					ctx.stream.on('error', (err: Error) => {
						this.logger.info('File error received', err.message)
						reject(err)

						f.destroy(err)
					})

					f.on('error', () => {
						// Remove the errored file.
						ctx.meta.$statusCode = 500
						fs.unlinkSync(filePath)
					})
					// @ts-ignore
					ctx.stream.pipe(f)
				})) as {
					filePath: string
					params: any
				} | null) ?? { filePath: '', meta: {} }

				this.logger.info('File received', { filePath, params })

				const openAPIConverter = new OpenAPIConverter()
				try {
					const environment = (await openAPIConverter.convertFromOpenAPI(
						filePath,
						ctx.params?.port,
					)) as Environment | null

					if (!environment) {
						this.logger.error('Failed to convert OpenAPI file')
						ctx.meta.$statusCode = 400
					} else {
						this.logger.info('Converted OpenAPI file', environment)
						ctx.meta.$statusCode = 200
						//create in store and db
						const action = await ctx.call<AddCloudEnvironmentSyncAction, any>(
							'environments-store.create',
							{
								environment: environment,
							},
						)
						// broadcast to the socket clients
						await ctx.call('socket-io.broadcastToClients', {
							action,
						})
					}
					// delete the file
					await new this.Promise((resolve, reject) => {
						fs.unlink(filePath, (err) => {
							if (err) {
								this.logger.error('Failed to delete file', err)
								reject(err)
							} else {
								this.logger.info('File deleted successfully')
								resolve({})
							}
						})
					})
				} catch (err) {
					this.logger.error('Failed to convert OpenAPI file', err)
					ctx.meta.$statusCode = 500
				}
			},
		},
	},
	methods: {
		randomName() {
			return uniqueId() + '.yaml'
		},
	},
}

export default HashService
