import fp from 'fastify-plugin';

/**
 * Configuration options for the request logger plugin.
 *
 * @interface RequestLoggerOptions
 */
export type RequestLoggerOptions = {
	/**
	 * List of User-Agent strings to ignore when logging requests.
	 * Useful for suppressing logs from health check probes, monitoring tools, etc.
	 *
	 * Matching is substring-based (case-sensitive).
	 * Any request whose User-Agent header contains one of these strings will be skipped.
	 *
	 * @type {string[]}
	 * @default ['kube-probe', 'Prometheus']
	 *
	 * @example
	 * requestLogger: {
	 *   ignoreAgents: [
	 *     'kube-probe',      // Kubernetes health probes
	 *     'Prometheus',      // Prometheus scraping
	 *     'ELB-HealthChecker' // AWS load balancer
	 *   ]
	 * }
	 */
	ignoreAgents?: string[];
};

/**
 * Fastify plugin that logs HTTP request/response information.
 *
 * Features:
 * - Structured logging with HTTP request details
 * - Automatic filtering by User-Agent (e.g., health checks, monitoring)
 * - Response time in seconds
 * - Full request URL with protocol and host
 * - HTTP method and status code
 * - Request path for easy parsing
 *
 * Log Output Format (JSON):
 * ```json
 * {
 *   "httpRequest": {
 *     "latency": "0.15s",
 *     "requestMethod": "GET",
 *     "requestUrl": "https://example.com/api/users",
 *     "status": 200,
 *     "userAgent": "curl/7.64.1",
 *     "path": "/api/users"
 *   },
 *   "path": "/api/users"
 * }
 * ```
 *
 * @example
 * // Default configuration (ignores kube-probe and Prometheus)
 * const app = feline();
 *
 * // Custom ignored agents
 * const app = feline({
 *   requestLogger: {
 *     ignoreAgents: ['kube-probe', 'Prometheus', 'curl']
 *   }
 * });
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 * Uses the onResponse hook to capture response time and status.
 * Default ignored agents are Kubernetes probes and Prometheus scrapers.
 * Logs at INFO level on the request logger.
 */
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
