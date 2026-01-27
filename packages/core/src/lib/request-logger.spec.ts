import { PassThrough } from 'node:stream';
import pino from 'pino';
import { beforeEach, describe, expect, test } from 'vitest';
import { feline } from '.';
import RequestLoggerPlugin from './request-logger';

describe(RequestLoggerPlugin.name, () => {
	let logBuffer: string[] = [];
	let logger: pino.Logger;

	beforeEach(() => {
		logBuffer = [];
		const stream = new PassThrough();
		stream.on('data', (chunk) => {
			logBuffer.push(chunk.toString('utf-8'));
		});

		logger = pino(stream);
	});

	test('should log requests with default ignored agents', async () => {
		const app = feline({
			fastify: {
				loggerInstance: logger as never,
			},
		});

		app.route({
			method: 'GET',
			url: '/test',
			handler: async () => ({ message: 'test' }),
		});

		await app.ready();

		const response = await app.inject({
			method: 'GET',
			url: '/test',
			headers: {
				traceparent: '123',
				'user-agent': 'Mozilla/5.0',
			},
		});

		expect(response.statusCode).toBe(200);

		expect(logBuffer.length).toBeGreaterThan(0);
		const logEntry = JSON.parse(logBuffer[logBuffer.length - 1]);

		expect(logEntry).toEqual(
			expect.objectContaining({
				traces: {
					traceparent: '123',
				},
				httpRequest: expect.objectContaining({
					requestMethod: 'GET',
					requestUrl: expect.stringContaining('/test'),
					status: 200,
					userAgent: 'Mozilla/5.0',
					path: '/test',
					latency: expect.stringMatching(/^\d+\.\d{2}s$/),
				}),
				path: '/test',
				msg: 'http://localhost:80/test',
			}),
		);
	});

	test('should ignore requests with default user agents', async () => {
		const app = feline({
			fastify: {
				loggerInstance: logger as never,
			},
		});

		app.route({
			method: 'GET',
			url: '/test',
			handler: async () => ({ message: 'test' }),
		});

		await app.ready();

		const initialLogLength = logBuffer.length;

		const response = await app.inject({
			method: 'GET',
			url: '/test',
			headers: {
				'user-agent': 'kube-probe/1.0',
			},
		});

		expect(response.statusCode).toBe(200);
		expect(logBuffer.length).toBe(initialLogLength);
	});

	test('should ignore requests with custom ignore patterns', async () => {
		const app = feline({
			fastify: {
				loggerInstance: logger as never,
			},
			requestLogger: {
				ignoreAgents: ['custom-bot'],
			},
		});

		app.route({
			method: 'GET',
			url: '/test',
			handler: async () => ({ message: 'test' }),
		});

		await app.ready();

		const initialLogLength = logBuffer.length;

		const response = await app.inject({
			method: 'GET',
			url: '/test',
			headers: {
				'user-agent': 'custom-bot/2.0',
			},
		});

		expect(response.statusCode).toBe(200);
		expect(logBuffer.length).toBe(initialLogLength);
	});

	test('should log requests without user agent header', async () => {
		const app = feline({
			fastify: {
				loggerInstance: logger as never,
			},
		});

		app.route({
			method: 'GET',
			url: '/test',
			handler: async () => ({ message: 'test' }),
		});

		await app.ready();

		const response = await app.inject({
			method: 'GET',
			url: '/test',
			headers: {
				'user-agent': undefined,
			},
		});

		expect(response.statusCode).toBe(200);

		expect(logBuffer.length).toBeGreaterThan(0);
		const logEntry = JSON.parse(logBuffer[logBuffer.length - 1]);

		expect(logEntry).toEqual(
			expect.objectContaining({
				httpRequest: expect.objectContaining({
					requestMethod: 'GET',
					requestUrl: expect.stringContaining('/test'),
					status: 200,
					path: '/test',
					latency: expect.stringMatching(/^\d+\.\d{2}s$/),
				}),
				path: '/test',
			}),
		);
	});
});
