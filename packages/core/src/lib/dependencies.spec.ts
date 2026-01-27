import { asFunction, asValue } from 'awilix';
import fastify from 'fastify';
import { describe, expect, test } from 'vitest';
import type { Dependencies } from '..';
import { feline } from '.';
import { DependenciesModule } from './dependencies';

describe('DependenciesPlugin', () => {
	test('should decorate fastify instance with dependencies container', async () => {
		const app = fastify();
		await app.register(DependenciesModule);

		expect(app.dependencies).toBeDefined();
	});

	test('should register logger in the container', async () => {
		const app = fastify();
		await app.register(DependenciesModule);

		const logger = app.dependencies.resolve('logger');

		expect(logger).toBeDefined();
	});

	test('should register logger as a singleton', async () => {
		const app = fastify();
		await app.register(DependenciesModule);
		const logger1 = app.dependencies.resolve('logger');
		const logger2 = app.dependencies.resolve('logger');

		expect(logger1).toBe(logger2);
	});

	test('should create child container on request', async () => {
		const app = await feline();

		class ExampleService {
			public logger: Dependencies['logger'];
			constructor({ logger }: Dependencies) {
				this.logger = logger;
			}
		}

		const testvalueparent = {};
		app.dependencies.register({
			testvalue: asValue(testvalueparent),
			exampleService: asFunction((d) => new ExampleService(d)),
		} as never);

		const parentlogger = app.dependencies.resolve('logger');

		let requestLogger: unknown;
		let testvalue: unknown;
		let injectedLogger: unknown;
		let traces: Map<string, unknown> = new Map();
		app.route({
			method: 'GET',
			url: '/test',
			handler: (request, reply) => {
				requestLogger = request.dependencies.resolve('logger');
				testvalue = request.dependencies.resolve('testvalue');
				injectedLogger =
					request.dependencies.resolve<ExampleService>('exampleService').logger;
				traces = request.dependencies.resolve('traces');

				reply.status(200).send('');
			},
		});
		await app.ready();

		const res = await app.inject({
			method: 'GET',
			url: '/test',
			headers: {
				traceparent: 123,
			},
		});

		expect(res.statusCode).toBe(200);
		expect(Object.fromEntries(traces)).toEqual({ traceparent: '123' });
		expect(requestLogger).not.toBe(parentlogger);
		expect(testvalue).toBe(testvalueparent);
		expect(injectedLogger).toBe(requestLogger);
	});
});
