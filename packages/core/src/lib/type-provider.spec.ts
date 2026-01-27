import fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { createSerializerCompiler, TypeProviderModule } from './type-provider';

describe('TypeProviderPlugin', () => {
	test('should set validator and serializer compilers', async () => {
		const app = fastify();
		await app.register(TypeProviderModule);
		expect(app.validatorCompiler).toBeDefined();
		expect(app.serializerCompiler).toBeDefined();
	});
});

describe('createSerializerCompiler', () => {
	const logger = {
		warn: vi.fn(),
	};

	test('should return a function that serializes the data', () => {
		const serializer = createSerializerCompiler({ logger } as never);
		const schema = z.object({ name: z.string() });
		const data = { name: 'test' };
		const result = serializer({ schema, url: '', method: 'GET' })(data);
		expect(result).toBe(JSON.stringify(data));
	});

	test('should log a warning when the data does not match the schema', () => {
		const serializer = createSerializerCompiler({ logger } as never);
		const schema = z.object({ name: z.string() });
		const data = { name: 123 };
		const result = serializer({ schema, url: '', method: 'GET' })(data);

		expect(logger.warn).toHaveBeenCalled();
		expect(result).toBe(JSON.stringify({ name: 123 }));
	});

	test('should handle schemas with properties', () => {
		const serializer = createSerializerCompiler({ logger } as never);
		const schema = { properties: z.object({ name: z.string() }) };
		const data = { name: 'test' };
		const result = serializer({ schema, url: '', method: 'GET' })(data);
		expect(result).toBe(JSON.stringify(data));
	});
});
