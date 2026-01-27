import type { FastifyBaseLogger } from 'fastify';
import type { FastifySerializerCompiler } from 'fastify/types/schema';
import fp from 'fastify-plugin';
import { validatorCompiler, type ZodSerializerCompilerOptions } from 'fastify-type-provider-zod';
import { $ZodType, safeParse } from 'zod/v4/core';

function resolveSchema(maybeSchema: $ZodType | { properties: $ZodType }): $ZodType {
	if (maybeSchema instanceof $ZodType) {
		return maybeSchema;
	}
	if ('properties' in maybeSchema && maybeSchema.properties instanceof $ZodType) {
		return maybeSchema.properties;
	}
	throw new Error(JSON.stringify(maybeSchema));
}

export const createSerializerCompiler =
	(
		options: ZodSerializerCompilerOptions & { logger: FastifyBaseLogger },
	): FastifySerializerCompiler<$ZodType | { properties: $ZodType }> =>
	({ schema: maybeSchema, url, method }) =>
	(data) => {
		const schema = resolveSchema(maybeSchema);

		const result = safeParse(schema, data);
		if (!result.success) {
			const message = `Response for ${method} ${url} doesn't match the schema.`;
			options.logger.warn(message);
		}

		return JSON.stringify(data, options?.replacer);
	};

export const TypeProviderModule = fp((app, _opts, next) => {
	const serializerCompiler = createSerializerCompiler({
		logger: app.log,
	});
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	next();
});
