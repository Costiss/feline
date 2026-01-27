import type { AxiosInstance, CreateAxiosDefaults } from 'axios';
import type { FastifyBaseLogger, FastifyPluginOptions } from 'fastify';
import type { FastifyPluginAsyncZod, FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import type { DependenciesContainer } from './lib/dependencies';
import type { HealthCheckMethod } from './lib/healthcheck';

export * from './lib';

/**
 * Synchronous Fastify module type with Zod type provider support.
 * Use this for modules that don't perform async operations during initialization.
 *
 * @template T - The plugin options type (extends FastifyPluginOptions)
 * @example
 * export const MyModule: SyncModule<{ myOption: string }> = (app, opts, done) => {
 *   app.log.info('Module initialized with option:', opts.myOption);
 *   done();
 * };
 */
export type SyncModule<T extends FastifyPluginOptions = object> = FastifyPluginCallbackZod<T>;

/**
 * Asynchronous Fastify module type with Zod type provider support.
 * Use this for modules that perform async operations during initialization.
 *
 * @template T - The plugin options type (extends FastifyPluginOptions)
 * @example
 * export const MyModule: AsyncModule<{ timeout: number }> = async (app, opts) => {
 *   await setupAsyncResources(opts.timeout);
 * };
 */
export type AsyncModule<T extends FastifyPluginOptions = object> = FastifyPluginAsyncZod<T>;

/**
 * Global dependency container interface for Feline applications.
 * These are the core dependencies available throughout the application lifecycle.
 *
 * All dependencies are managed by the Awilix IoC container and can be registered
 * or overridden in your modules.
 */
export interface Dependencies {
	/**
	 * Fastify base logger instance (Pino).
	 * Will be enhanced with request context and tracing information.
	 * @type {FastifyBaseLogger}
	 */
	logger: FastifyBaseLogger;

	/**
	 * Application health check methods.
	 * Register additional health checks to monitor your application state.
	 * @type {HealthCheckMethod[]}
	 */
	healthchecks: HealthCheckMethod[];

	/**
	 * HTTPS agent for outgoing HTTP client requests.
	 * Configured with keepAlive enabled for connection pooling.
	 * @type {import('node:https').Agent}
	 */
	httpsAgent: import('node:https').Agent;

	/**
	 * Factory function to create Axios HTTP client instances.
	 * Automatically includes tracing headers and request metrics collection.
	 *
	 * @param config - Optional Axios configuration overrides
	 * @returns Configured Axios instance
	 * @example
	 * const client = app.dependencies.resolve('createHttpClient')({
	 *   baseURL: 'https://api.example.com'
	 * });
	 */
	createHttpClient: (config?: CreateAxiosDefaults) => AxiosInstance;

	/**
	 * Map of trace context headers from the current request.
	 * Includes traceparent, tracestate, x-request-id, and any custom headers.
	 * @type {Map<string, string | string[]>}
	 */
	traces: Map<string, string | string[]>;

	/**
	 * Array of functions to execute during graceful shutdown.
	 * Register cleanup functions to release resources before exit.
	 * @type {Array<() => Promise<void>>}
	 */
	onShutdown: Array<() => Promise<void>>;
}

declare module 'fastify' {
	interface FastifyInstance {
		/**
		 * Global Awilix dependencies container.
		 *
		 * See {@link https://github.com/jeffijoe/awilix Awilix} for more information.
		 *
		 * @example
		 * app.dependencies.register({
		 *   myService: asClass(MyService).singleton()
		 * });
		 *
		 * const myService = app.dependencies.resolve('myService');
		 *
		 * @type {DependenciesContainer}
		 */
		dependencies: DependenciesContainer;
	}

	interface FastifyRequest {
		traces: Map<string, string | string[]>;
		dependencies: DependenciesContainer;
	}
}
