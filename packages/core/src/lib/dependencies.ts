import { type AwilixContainer, asFunction, createContainer } from 'awilix';
import fp from 'fastify-plugin';
import type { Dependencies } from '../index';

export type DependenciesContainer = AwilixContainer<Dependencies>;

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
