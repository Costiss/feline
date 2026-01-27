import { describe, expect, test } from 'vitest';
import { feline } from '.';
import { HealthCheckModule, type HealthCheckStatus } from './healthcheck';

describe('HealthCheckModule', () => {
	test('should create healthcheck route', async () => {
		const app = await feline();

		const response = await app.inject({
			method: 'GET',
			url: '/healthz',
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			status: 'HEALTHY',
			checks: ['default'],
			datetime: expect.any(String) as string,
		});
	});

	test('should return 500 when one or more checks fail', async () => {
		const app = await feline();
		app.dependencies.resolve('healthchecks').push({
			name: 'test',
			check: () =>
				Promise.resolve({
					status: 'not ok' as HealthCheckStatus,
					error: 'test error',
				}),
		});

		const response = await app.inject({
			method: 'GET',
			url: '/healthz',
		});

		expect(response.statusCode).toBe(500);
		expect(response.json()).toEqual({
			status: 'UNHEALTHY',
			checks: ['test'],
			errors: ['test error'],
			datetime: expect.any(String) as string,
		});
	});

	test('should use custom url and method', async () => {
		const app = await feline();
		await app.register(HealthCheckModule, {
			url: '/custom-healthz',
			method: 'POST',
		});

		const response = await app.inject({
			method: 'POST',
			url: '/custom-healthz',
		});

		expect(response.statusCode).toBe(200);
	});
});
