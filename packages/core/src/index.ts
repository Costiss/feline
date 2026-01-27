import type { AxiosInstance, CreateAxiosDefaults } from 'axios';
import type { FastifyBaseLogger, FastifyPluginOptions } from 'fastify';
import type { FastifyPluginAsyncZod, FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import type { DependenciesContainer } from './lib/dependencies';
import type { HealthCheckMethod } from './lib/healthcheck';

export * from './lib';

export type SyncModule<T extends FastifyPluginOptions = object> = FastifyPluginCallbackZod<T>;
export type AsyncModule<T extends FastifyPluginOptions = object> = FastifyPluginAsyncZod<T>;

export interface Dependencies {
	logger: FastifyBaseLogger;

	/** Application health check methods */
	healthchecks: HealthCheckMethod[];

	httpsAgent: import('node:https').Agent;

	createHttpClient: (config?: CreateAxiosDefaults) => AxiosInstance;

	traces: Map<string, string | string[]>;

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
