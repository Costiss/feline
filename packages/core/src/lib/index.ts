import fastify, { type FastifyServerOptions } from 'fastify';
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

export type FelineOptions = {
	name?: string;
	healthcheck?: HealthCheckModuleOptions;
	tracing?: TracingOptions;
	httpClient?: HttpClientModuleOptions;
	gracefulShutdown?: GracefulShutdownOptions;
	requestLogger?: RequestLoggerOptions;
	fastify?: FastifyServerOptions;
};

export type FelineApplication = Awaited<ReturnType<typeof feline>>;

export function feline(opts: FelineOptions = { name: 'feline-app', fastify: {} }) {
	process.env.OTEL_SERVICE_NAME = opts.name;
	const app = fastify({
		loggerInstance: getLogger('default'),
		disableRequestLogging: true,
		...opts.fastify,
	});

	app.register(TracingModule, opts.tracing || {});
	app.register(TypeProviderModule);
	app.register(DependenciesModule);
	app.register(HealthCheckModule, opts.healthcheck || {});
	app.register(HttpClientModule, opts.httpClient || {});
	app.register(ErrorHandlerModule);
	app.register(GracefulShutdown, opts.gracefulShutdown ?? {});
	app.register(RequestLoggerPlugin, opts.requestLogger || {});

	return app;
}
