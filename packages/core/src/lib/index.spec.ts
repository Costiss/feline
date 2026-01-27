import { describe, expect, test } from 'vitest';
import { feline } from './index';

describe('feline', () => {
	test('should return a fastify instance', async () => {
		const app = await feline();
		expect(app).toBeDefined();
		expect(app.server).toBeDefined();
	});

	test('should register required plugins', async () => {
		const app = await feline();
		await app.ready();
		expect(app.hasDecorator('dependencies')).toBe(true);
	});

	test('should register HealthCheckModule with correct options', async () => {
		const app = await feline({
			healthcheck: { url: '/health' },
		});
		const response = await app.inject({ method: 'GET', url: '/health' });
		expect(response.statusCode).toBe(200);
	});
});
