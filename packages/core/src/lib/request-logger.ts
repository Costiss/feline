import fp from 'fastify-plugin';

export type RequestLoggerOptions = {
	/**
	 * Indicates the list of 'User-Agent' strings to ignore when logging requests
	 * @default ['kube-probe', 'Prometheus']
	 **/
	ignoreAgents?: string[];
};

const RequestLoggerPlugin = fp<RequestLoggerOptions>((fastify, config, done) => {
	const ignoreAgents = config.ignoreAgents || ['kube-probe', 'Prometheus'];

	fastify.addHook('onResponse', async (request, response) => {
		const userAgent = request.headers['user-agent'];
		if (userAgent && ignoreAgents.some((agent) => userAgent.includes(agent))) {
			return;
		}

		const elapsed = response.elapsedTime;
		const fullpath = `${request.protocol}://${request.headers.host || request.hostname}${request.originalUrl}`;

		request.log.info(
			{
				httpRequest: {
					latency: `${(elapsed / 1000).toFixed(2)}s`,
					requestMethod: request.method,
					requestUrl: fullpath,
					status: response.statusCode,
					userAgent: request.headers['user-agent'],
					path: request.originalUrl,
				},
				path: request.originalUrl,
			},
			fullpath,
		);
	});
	done();
});

export default RequestLoggerPlugin;
