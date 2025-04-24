import ApiGateway from 'moleculer-web'

export function buildStaticRoute({ fromFolder, toRoute }: { fromFolder: string; toRoute: string }) {
	//@ts-ignore
	const serve = ApiGateway.serveStatic(fromFolder, {})

	return {
		path: toRoute,
		mappingPolicy: 'restrict',
		use: [
			function (req: any, res: any, next: (err?: any) => void) {
				return serve(req, res, (err: Error) => {
					if (err) {
						console.log('Error serving static file:', err)
					}
					next(err)
				})
			},
		],
	}
}
