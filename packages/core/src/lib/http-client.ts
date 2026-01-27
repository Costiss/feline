import https from 'node:https';
import type { Attributes } from '@opentelemetry/api';
import { asFunction, asValue } from 'awilix';
import axios, { type CreateAxiosDefaults } from 'axios';
import fp from 'fastify-plugin';
import { getMeter } from './utils/metrics';

/**
 * Configuration options for the HTTP client module.
 *
 * @interface HttpClientModuleOptions
 */
export interface HttpClientModuleOptions {
	/**
	 * Configuration options for the HTTPS agent.
	 * Passed directly to Node.js https.Agent constructor.
	 *
	 * Common options:
	 * - keepAlive: boolean (default: true) - Reuse connections
	 * - maxSockets: number - Maximum number of sockets
	 * - timeout: number - Socket timeout in milliseconds
	 * - rejectUnauthorized: boolean - Verify SSL certificates
	 *
	 * @type {https.AgentOptions}
	 * @example
	 * agentConfig: {
	 *   keepAlive: true,
	 *   maxSockets: 50,
	 *   timeout: 30000
	 * }
	 */
	agentConfig?: https.AgentOptions;
}

declare module 'axios' {
	interface AxiosRequestConfig {
		metadata?: {
			startTime: number;
		};
	}
}

/**
 * Fastify plugin that sets up HTTP client factory with automatic instrumentation.
 *
 * Features:
 * - Axios HTTP client factory accessible via dependencies
 * - Automatic tracing header propagation (from TracingModule)
 * - OpenTelemetry metrics collection:
 *   - http_client_request_count: Counter of requests by endpoint/method/status
 *   - http_client_request_latency: Histogram of request latencies in milliseconds
 * - Per-request scoped HTTP clients that include request traces
 * - HTTPS agent with connection pooling
 * - Comprehensive error handling
 *
 * Usage:
 * Access via `request.dependencies.resolve('createHttpClient')()` in route handlers
 * or `app.dependencies.resolve('createHttpClient')()` at application level.
 *
 * The HTTP client automatically:
 * - Includes all tracing headers (traceparent, x-request-id, etc.)
 * - Records metrics for observability
 * - Uses connection pooling for performance
 *
 * @example
 * // In route handlers
 * app.get('/users/:id', async (request, reply) => {
 *   const httpClient = request.dependencies.resolve('createHttpClient')({
 *     baseURL: 'https://api.example.com'
 *   });
 *   const user = await httpClient.get(`/users/${request.params.id}`);
 *   return user.data;
 * });
 *
 * // Custom configuration per request
 * const client = request.dependencies.resolve('createHttpClient')({
 *   timeout: 5000,
 *   headers: { 'X-API-Key': 'secret' }
 * });
 *
 * // Application-level client (without request context)
 * const client = app.dependencies.resolve('createHttpClient')({
 *   baseURL: 'https://api.example.com'
 * });
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 * Request-scoped clients are created per HTTP request to include tracing context.
 * Application-level clients can be used for background tasks or external integrations.
 */
export const HttpClientModule = fp<HttpClientModuleOptions>((app, opts) => {
	const { agentConfig = {} } = opts;
	const createHttpClient = (config: CreateAxiosDefaults = {}) => {
		const httpClient = axios.create({
			httpsAgent: app.dependencies.resolve('httpsAgent'),
			...config,
			headers: { ...config.headers },
		});

		httpClient.interceptors.request.use((config) => {
			config.metadata = { startTime: Date.now() };

			return config;
		});

		httpClient.interceptors.response.use(
			(response) => {
				try {
					const startTime = response.config.metadata?.startTime;
					const requestUrl = response.config.url as string;
					const url = new URL(requestUrl, response.config.baseURL);

					const attrs: Attributes = {
						hostname: url.hostname,
						base_url: url.origin,
						path: url.pathname,
						method: response.config.method?.toUpperCase(),
						status_code: response.status,
					};

					if (startTime) {
						const duration = Date.now() - startTime;
						histogram.record(duration, attrs);
						counter.add(1, attrs);
					}
				} catch (err) {
					app.log.warn({ err }, 'error on axios reponse interceptor');
				}

				return response;
			},
			(error) => Promise.reject(error as Error),
		);
		return httpClient;
	};

	app.dependencies.register({
		httpsAgent: asValue(new https.Agent({ keepAlive: true, ...agentConfig })),
		createHttpClient: asFunction(() => createHttpClient),
	});

	const counter = getMeter().createCounter('http_client_request_count', {
		description: 'Count of all HTTP client requests',
	});
	const histogram = getMeter().createHistogram('http_client_request_latency', {
		description: 'Histogram of HTTP client request latencies',
		unit: 'ms',
	});

	app.addHook('onRequest', async (request, _reply) => {
		const tracers = Object.fromEntries(request.traces);

		request.dependencies.register({
			createHttpClient: asFunction(() => (config?: CreateAxiosDefaults) => {
				return createHttpClient({
					...config,
					headers: { ...tracers, ...config?.headers },
				});
			}).scoped(),
		});
	});
});
