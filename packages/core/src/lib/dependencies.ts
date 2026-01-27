import { type AwilixContainer, asFunction, createContainer } from 'awilix';
import fp from 'fastify-plugin';
import type { Dependencies } from '../index';

/**
 * Type alias for the Awilix dependency container with Feline's Dependencies type.
 * Use this type when working with the dependencies container.
 *
 * @type {AwilixContainer<Dependencies>}
 *
 * @example
 * const container: DependenciesContainer = fastify.dependencies;
 * const httpClient = container.resolve('createHttpClient')();
 */
export type DependenciesContainer = AwilixContainer<Dependencies>;

/**
 * Fastify plugin that sets up dependency injection using Awilix IoC container.
 *
 * Features:
 * - Application-wide singleton container for shared dependencies
 * - Per-request scoped containers that inherit from the app container
 * - Automatic request context propagation (logger, traces)
 * - Automatic cleanup of request-scoped dependencies after response
 * - Request ID and path information in logs
 *
 * Adds to Fastify instance:
 * - `fastify.dependencies` - Application-level DependenciesContainer
 *
 * Adds to Fastify request:
 * - `request.dependencies` - Request-scoped DependenciesContainer
 * - Request logger automatically enhanced with context
 *
 * @example
 * // Access dependencies in your routes
 * app.get('/', async (request, reply) => {
 *   const httpClient = request.dependencies.resolve('createHttpClient')();
 *   const response = await httpClient.get('https://api.example.com/data');
 *   return response.data;
 * });
 *
 * // Register custom dependencies
 * app.dependencies.register({
 *   myService: asClass(MyService).singleton(),
 *   config: asValue({ apiKey: 'secret' })
 * });
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 */
export const DependenciesModule = fp((fastify, _opts, next) => {
	const container = createContainer<Dependencies>({
		strict: true,
	});

	container.register({
		logger: asFunction(() => fastify.log).singleton(),
	});

	fastify.decorate('dependencies', container);

	fastify.addHook('onRequest', (request, _reply, done) => {
		const requestContainer = container.createScope();
		requestContainer.register({
			logger: asFunction(() =>
				request.log.child({
					traces: Object.fromEntries(request.traces),
					request_id: request.id,
					path: request.url,
				}),
			).scoped(),
			traces: asFunction(() => request.traces).scoped(),
		});

		request.dependencies = requestContainer;
		request.log = requestContainer.resolve('logger');
		done();
	});

	fastify.addHook('onSend', (request, _reply, _payload, done) => {
		request.dependencies.dispose();
		done();
	});

	next();
});
