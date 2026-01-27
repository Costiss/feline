import { metrics } from '@opentelemetry/api';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { feline } from '.';
import { HttpClientModule } from './http-client';

vi.mock('@opentelemetry/api');

describe(HttpClientModule.name, () => {
	const counter = { add: vi.fn() };
	const histogram = { record: vi.fn() };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(metrics.getMeter).mockReturnValue({
			createCounter: vi.fn().mockReturnValue(counter as never),
			createHistogram: vi.fn().mockReturnValue(histogram as never),
		} as never);
	});

	test('should register metrics and inject headers', async () => {
		const app = await feline();

		app.get('/test', async (request, reply) => {
			const createHttp = request.dependencies.resolve('createHttpClient');
			const http = createHttp({
				baseURL: 'https://jsonplaceholder.typicode.com',
			});

			const response = await http.get('/posts/1?q=1');

			return reply.send({
				headers: response.config.headers,
			});
		});
		const expectedAttributes = {
			hostname: 'jsonplaceholder.typicode.com',
			base_url: 'https://jsonplaceholder.typicode.com',
			path: '/posts/1',
			method: 'GET',
			status_code: 200,
		};

		await app.ready();

		const traceparent = '00-abcdef1234567890-abcdef1234567890-01';
		const response = await app.inject({
			method: 'GET',
			url: '/test',
			headers: {
				traceparent,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.body);
		expect(body.headers.traceparent).toBe(traceparent);
		expect(counter.add).toHaveBeenCalledWith(1, expectedAttributes);
		expect(histogram.record).toHaveBeenCalledWith(expect.any(Number), expectedAttributes);
	});

	test('should inject headers event with added headers', async () => {
		const app = await feline();

		app.get('/test', async (request, reply) => {
			const createHttp = request.dependencies.resolve('createHttpClient');
			const http = createHttp({
				baseURL: 'https://jsonplaceholder.typicode.com',
				headers: {
					'X-Custom-Header': 'CustomValue',
				},
			});

			const response = await http.get('/posts/1?q=1');

			return reply.send({
				headers: response.config.headers,
			});
		});

		await app.ready();

		const traceparent = '00-abcdef1234567890-abcdef1234567890-01';
		const response = await app.inject({
			method: 'GET',
			url: '/test',
			headers: {
				traceparent,
			},
		});

		const body = JSON.parse(response.body);
		expect(body.headers.traceparent).toBe(traceparent);
		expect(body.headers['X-Custom-Header']).toBe('CustomValue');
	});

	test('should handle errors correctly', async () => {
		const app = await feline();

		histogram.record.mockImplementation(() => {
			throw new Error('Counter error');
		});

		app.get('/test', async (request, reply) => {
			const createHttp = request.dependencies.resolve('createHttpClient');
			const http = createHttp();
			const response = await http.get('https://jsonplaceholder.typicode.com/posts/1');

			return reply.send({
				headers: response.config.headers,
			});
		});

		await app.ready();

		const response = await app.inject({
			method: 'GET',
			url: '/test',
		});

		expect(response.statusCode).toBe(200);
		expect(counter.add).not.toHaveBeenCalled();
	});
});
