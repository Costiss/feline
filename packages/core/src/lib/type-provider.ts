import type { FastifyBaseLogger } from 'fastify';
import type { FastifySerializerCompiler } from 'fastify/types/schema';
import fp from 'fastify-plugin';
import { validatorCompiler, type ZodSerializerCompilerOptions } from 'fastify-type-provider-zod';
import { $ZodType, safeParse } from 'zod/v4/core';

/**
 * Custom serializer compiler that uses Zod schemas for response validation.
 *
 * Validates outgoing response data against the Zod schema before serialization.
 * If response data doesn't match the schema, a warning is logged but the response
 * is still sent (doesn't block the response).
 *
 * This is useful for:
 * - Catching unintended response shape changes
 * - Development-time feedback on schema mismatches
 * - Debugging response data
 *
 * @param options - Zod serializer options including logger
 * @returns A serializer compiler function
 *
 * @remarks
 * This is an internal utility used by TypeProviderModule.
 * Warnings are logged when response data doesn't match schema.
 */
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

/**
 * Fastify plugin that provides Zod type safety for request/response validation.
 *
 * Features:
 * - Request payload validation using Zod schemas
 * - Response data validation using Zod schemas
 * - Type-safe route handlers with proper TypeScript inference
 * - Automatic error responses (400 Bad Request) for validation failures
 * - Warning logs when response data doesn't match schema
 *
 * Usage with FastifyPluginAsyncZod or FastifyPluginCallbackZod:
 *
 * ```typescript
 * import { z } from '@feline/core';
 * import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
 *
 * const UserSchema = z.object({
 *   id: z.number(),
 *   name: z.string(),
 *   email: z.string().email()
 * });
 *
 * const MyModule: FastifyPluginAsyncZod = async (app) => {
 *   app.get('/users/:id', {
 *     schema: {
 *       params: z.object({
 *         id: z.coerce.number()
 *       }),
 *       response: {
 *         200: UserSchema
 *       }
 *     }
 *   }, async (request) => {
 *     // request.params.id is typed as number
 *     // Response must match UserSchema
 *     return { id: 1, name: 'John', email: 'john@example.com' };
 *   });
 * };
 * ```
 *
 * @example
 * // Define your request/response schemas
 * const CreateUserBody = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 *   age: z.number().int().min(18)
 * });
 *
 * const UserResponse = z.object({
 *   id: z.number(),
 *   name: z.string(),
 *   email: z.string(),
 *   createdAt: z.string().datetime()
 * });
 *
 * // Use in route handlers
 * app.post<{ Body: z.infer<typeof CreateUserBody> }>('/users', {
 *   schema: {
 *     body: CreateUserBody,
 *     response: { 201: UserResponse }
 *   }
 * }, async (request, reply) => {
 *   const user = await createUser(request.body);
 *   reply.code(201);
 *   return user;
 * });
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 * It integrates with fastify-type-provider-zod for seamless Zod support.
 * Both validator and serializer compilers are set up for full type safety.
 */
export const TypeProviderModule = fp((app, _opts, next) => {
	const serializerCompiler = createSerializerCompiler({
		logger: app.log,
	});
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	next();
});
