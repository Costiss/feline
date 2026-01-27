import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import z from 'zod';
import { feline } from '.';
import { ErrorHandlerModule } from './error-handler';

describe(ErrorHandlerModule.name, () => {
	let app: Awaited<ReturnType<typeof feline>>;
	let error = new Error('Test error');
	const log = {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	};

	beforeAll(async () => {
		app = await feline();
		app.log = log as never;

		await app.register(ErrorHandlerModule);
		app.route({
			method: 'GET',
			url: '/',
			schema: {
				querystring: z.object({
					param: z.string(),
				}),
			},
			handler: async (req) => {
				req.log = log as never;
				throw error;
			},
		});

		await app.ready();
	});

	test('should handle 400 errors for invalid parameters', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/',
		});

		expect(response.statusCode).toBe(400);
		expect(response.json().details).toBe(
			'querystring/param Invalid input: expected string, received undefined',
		);
	});

	test('should handle 500 errors for unhandled exceptions', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/?param=true',
		});
		expect(response.statusCode).toBe(500);
		expect(response.json().details).toBe('Test error');
	});

	test('should handle Axios errors properly', async () => {
		const axiosError = new AxiosError(
			'Axios failed',
			'ECONNREFUSED',
			{
				baseURL: 'http://example.com',
				url: '/example',
			} as InternalAxiosRequestConfig,
			null,
			{
				status: 503,
				data: { error: 'Service unavailable' },
				headers: { 'content-type': 'application/json' },
				config: {} as InternalAxiosRequestConfig,
				statusText: 'Service Unavailable',
			} as AxiosResponse,
		);

		error = axiosError as never;

		const response = await app.inject({
			method: 'GET',
			url: '/?param=axios',
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toEqual({
			error: 'API Call Error',
			status: 503,
			details: { error: 'Service unavailable' },
		});
		expect(log.error).toHaveBeenCalledWith(
			{
				err_msg: 'Axios failed',
				base_url: 'http://example.com',
				path: '/example',
				status_code: 'ECONNREFUSED',
				response: { error: 'Service unavailable' },
				stack: expect.any(String),
			},
			'HTTP Request to %s failed with status %s: %s',
			'http://example.com',
			503,
			'Service Unavailable',
		);
	});
});
