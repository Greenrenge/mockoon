import { AddCloudEnvironmentSyncAction } from '@mockoon/cloud'
import { OpenAPIConverter } from '@mockoon/commons-server'
import AdmZip from 'adm-zip'
import fs from 'fs'
import yaml from 'js-yaml'
import { ServiceSchema } from 'moleculer'
import os from 'os'
import path from 'path'
import { Environment } from '../../../commons/dist/cjs'
import { mustLogin } from '../mixins/mustLogin'
import { AuthContextMeta } from '../types/common'
function uniqueId() {
	return Math.random().toString(36).substring(2, 15)
}

const ImportExportService: ServiceSchema = {
	name: 'import-export',
	mixins: [mustLogin()],
	actions: {
		convertOpenAPI: {
			async handler(ctx: AuthContextMeta<any, any>) {
				this.logger.info('Received upload params:', ctx.params)
				const { filePath, params } = ((await new this.Promise((resolve, reject) => {
					const filePath = path.join(
						os.tmpdir(),
						//@ts-ignore
						`${Date.now()}${ctx.params.$filename || this.randomName()}`,
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

				try {
					let openAPIFilePath = filePath
					const isZip = filePath.endsWith('.zip')

					if (isZip) {
						const zip = new AdmZip(filePath)
						const zipEntries = zip.getEntries()
						const tempDir = path.join(os.tmpdir(), uniqueId())
						fs.mkdirSync(tempDir)

						// Extract all files to temp directory
						zip.extractAllTo(tempDir, true)

						// Find yaml/json files in root level
						const rootFiles = fs
							.readdirSync(tempDir)
							.filter(
								(file) => file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json'),
							)

						// Find first file containing openapi property
						for (const file of rootFiles) {
							const fullPath = path.join(tempDir, file)
							try {
								const content = fs.readFileSync(fullPath, 'utf8')
								const parsed = file.endsWith('.json') ? JSON.parse(content) : yaml.load(content)

								if (parsed && (parsed.swagger || parsed.openapi)) {
									openAPIFilePath = fullPath
									break
								}
							} catch (err) {
								this.logger.warn(`Failed to parse file ${file}:`, err)
								continue
							}
						}

						if (openAPIFilePath === filePath) {
							throw new Error('No valid OpenAPI file found in zip archive')
						}
					}

					const openAPIConverter = new OpenAPIConverter()
					const environment = (await openAPIConverter.convertFromOpenAPI(
						openAPIFilePath,
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

					// Clean up temp files
					if (isZip) {
						fs.rmSync(path.dirname(openAPIFilePath), { recursive: true, force: true })
					}
					fs.unlinkSync(filePath)
				} catch (err) {
					this.logger.error('Failed to convert OpenAPI file', err)
					ctx.meta.$statusCode = 500
					// Ensure cleanup on error
					if (fs.existsSync(filePath)) {
						fs.unlinkSync(filePath)
					}
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

export default ImportExportService
