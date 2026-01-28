import fastify, {
	type FastifyBaseLogger,
	type FastifyInstance,
	type FastifyServerOptions,
	type RawReplyDefaultExpression,
	type RawRequestDefaultExpression,
	type RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { DependenciesModule } from './dependencies';
import { ErrorHandlerModule } from './error-handler';
import { GracefulShutdown, type GracefulShutdownOptions } from './graceful-shutdown';
import { HealthCheckModule, type HealthCheckModuleOptions } from './healthcheck';
import { HttpClientModule, type HttpClientModuleOptions } from './http-client';
import RequestLoggerPlugin, { type RequestLoggerOptions } from './request-logger';
import { TracingModule, type TracingOptions } from './tracing';
import { TypeProviderModule } from './type-provider';
import { getLogger } from './utils';

export type { HealthCheckMethod, HealthCheckStatus } from './healthcheck';

export type { HttpClient } from './http-client';

/**
 * Configuration options for Feline framework initialization.
 *
 * @interface FelineOptions
 * @example
 * const app = feline({
 *   name: 'my-service',
 *   healthcheck: { url: '/health' },
 *   tracing: { headers: ['x-custom-header'] },
 *   gracefulShutdown: { timeoutMs: 30000 }
 * });
 */
export type FelineOptions = {
	/**
	 * Service name for OpenTelemetry tracing and logging.
	 * Sets OTEL_SERVICE_NAME environment variable.
	 * @default 'feline-app'
	 */
	name?: string;

	/**
	 * Health check endpoint configuration.
	 * @default { url: '/healthz', method: 'GET' }
	 */
	healthcheck?: HealthCheckModuleOptions;

	/**
	 * Distributed tracing configuration.
	 * Configure which headers to propagate across services and logs.
	 */
	tracing?: TracingOptions;

	/**
	 * HTTP client configuration.
	 * Settings for outgoing HTTP requests (axios instances).
	 */
	httpClient?: HttpClientModuleOptions;

	/**
	 * Graceful shutdown configuration.
	 * Control shutdown timeout and cleanup behavior.
	 */
	gracefulShutdown?: GracefulShutdownOptions;

	/**
	 * Request logging configuration.
	 */
	requestLogger?: RequestLoggerOptions;

	/**
	 * Fastify server configuration.
	 * Any Fastify-specific options to pass through.
	 */
	fastify?: FastifyServerOptions;
};

/**
 * Type for the initialized Feline application instance.
 * This is the return type of the feline() factory function.
 * @type {FelineApplication}
 */
export type FelineApplication = Awaited<ReturnType<typeof feline>>;

/**
 * Initialize a Feline framework application instance.
 *
 * Feline is an opinionated Fastify-based backend framework that provides:
 * - Automatic dependency injection (Awilix)
 * - OpenTelemetry tracing and metrics
 * - Health checks with per-service status monitoring
 * - HTTP client with automatic instrumentation
 * - Request/response logging with contextual information
 * - Graceful shutdown handling
 * - Type-safe request/response validation with Zod
 * - Comprehensive error handling
 *
 * @param {FelineOptions} opts - Configuration options for the framework
 * @returns {Promise<FelineApplication>} Initialized Fastify application with Feline extensions
 *
 * @example
 * import { feline } from '@feline/core';
 *
 * const app = await feline({
 *   name: 'user-service',
 *   healthcheck: { url: '/healthz' },
 *   gracefulShutdown: { timeoutMs: 30000 }
 * });
 *
 * // Register your modules/routes
 * app.register(async (fastify) => {
 *   fastify.get('/', async () => ({ hello: 'world' }));
 * });
 *
 * // Start the server
 * await app.listen({ port: 3000 });
 *
 * @remarks
 * The function automatically registers these modules in order:
 * 1. TracingModule - Distributed tracing header propagation
 * 2. TypeProviderModule - Zod type safety for request/response
 * 3. DependenciesModule - Awilix IoC container and request scoping
 * 4. HealthCheckModule - Application health status endpoint
 * 5. HttpClientModule - HTTP client with metrics
 * 6. ErrorHandlerModule - Centralized error handling
 * 7. GracefulShutdown - Signal handling and cleanup
 * 8. RequestLoggerPlugin - Structured request logging
 */
export async function feline(opts: FelineOptions = { name: 'feline-app', fastify: {} }) {
	process.env.OTEL_SERVICE_NAME = opts.name;
	const app = fastify({
		loggerInstance: getLogger('default'),
		disableRequestLogging: true,
		...opts.fastify,
	});

	await Promise.all([
		app.register(TracingModule, opts.tracing || {}),
		app.register(TypeProviderModule),
		app.register(DependenciesModule),
		app.register(HealthCheckModule, opts.healthcheck || {}),
		app.register(HttpClientModule, opts.httpClient || {}),
		app.register(ErrorHandlerModule),
		app.register(GracefulShutdown, opts.gracefulShutdown ?? {}),
		app.register(RequestLoggerPlugin, opts.requestLogger || {}),
	]);

	return app as FastifyInstance<
		RawServerDefault,
		RawRequestDefaultExpression<RawServerDefault>,
		RawReplyDefaultExpression<RawServerDefault>,
		FastifyBaseLogger,
		ZodTypeProvider
	>;
}
