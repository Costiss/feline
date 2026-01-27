import https from 'node:https';
import type { Attributes } from '@opentelemetry/api';
import { asFunction, asValue } from 'awilix';
import axios, { type CreateAxiosDefaults } from 'axios';
import fp from 'fastify-plugin';
import { getMeter } from './utils/metrics';

export interface HttpClientModuleOptions {
	agentConfig?: https.AgentOptions;
}

declare module 'axios' {
	interface AxiosRequestConfig {
		metadata?: {
			startTime: number;
		};
	}
}

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
