import { isAxiosError } from 'axios';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import type { SyncModule } from '..';

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
