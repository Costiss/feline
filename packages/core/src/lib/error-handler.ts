import { isAxiosError } from 'axios';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import type { SyncModule } from '..';

/**
 * Fastify error handler plugin that provides centralized error handling.
 *
 * Handles three categories of errors:
 *
 * 1. **Axios HTTP Errors** (isAxiosError)
 *    - Status: 502 Bad Gateway
 *    - Response: { error, status, details }
 *    - Logs full request context (URL, base URL, response status)
 *
 * 2. **Zod Validation Errors** (hasZodFastifySchemaValidationErrors)
 *    - Status: 400 Bad Request
 *    - Response: { error, details }
 *    - Logs validation error message
 *
 * 3. **Unhandled Errors** (all others)
 *    - Status: 500 Internal Server Error
 *    - Response: { error, details }
 *    - Logs full error stack trace
 *
 * All errors are logged at appropriate levels (error/warn) with full context
 * for debugging and monitoring purposes.
 *
 * @example
 * // Automatic validation error handling
 * app.post('/users', {
 *   schema: {
 *     body: z.object({
 *       email: z.string().email(),
 *       age: z.number().min(18)
 *     })
 *   }
 * }, async (request, reply) => {
 *   // If validation fails, automatically returns 400 with error details
 * });
 *
 * // Automatic HTTP client error handling
 * app.get('/external', async (request, reply) => {
 *   const client = request.dependencies.resolve('createHttpClient')();
 *   const result = await client.get('https://api.example.com/data');
 *   // If HTTP request fails, automatically returns 502 with response details
 *   return result.data;
 * });
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 * It should be registered after other modules to catch all errors.
 */
export const ErrorHandlerModule: SyncModule = fp((app, _, done) => {
	app.setErrorHandler((err, request, reply) => {
		if (isAxiosError(err)) {
			request.log.error(
				{
					err_msg: err.message,
					base_url: err.config?.baseURL,
					path: err.config?.url,
					status_code: err.code,
					response: err.response?.data,
					stack: err.stack,
				},
				'HTTP Request to %s failed with status %s: %s',
				err.config?.baseURL,
				err.response?.status,
				err.response?.statusText,
			);
			return reply.status(502).send({
				error: 'API Call Error',
				status: err.response?.status ?? 502,
				details: err.response?.data ?? err.message,
			});
		}

		if (hasZodFastifySchemaValidationErrors(err)) {
			request.log.warn('payload validation error %s', err.message);
			return reply.status(400).send({
				error: 'Validation error',
				details: err.message,
			});
		}

		request.log.error(err, 'unhandled error occurred');
		return reply.status(500).send({
			error: 'Internal server error',
			details: (err as Error).message,
		});
	});

	done();
});
