import { asValue } from 'awilix';
import type { FastifyInstance, FastifyPluginCallback } from 'fastify';

/**
 * Valid health check status values.
 * @type {readonly ['ok', 'not ok']}
 */
export const HealthCheckStatus = ['ok', 'not ok'] as const;

/**
 * Health check status as a union type.
 * @typedef {string} HealthCheckStatus
 */
export type HealthCheckStatus = (typeof HealthCheckStatus)[number];

/**
 * Interface for a single health check method.
 *
 * Health checks are functions that verify the health of a specific component
 * or dependency in your application (database, cache, external APIs, etc).
 *
 * @interface HealthCheckMethod
 *
 * @example
 * const databaseHealthCheck: HealthCheckMethod = {
 *   name: 'database',
 *   check: async (fastify) => {
 *     try {
 *       await fastify.db.query('SELECT 1');
 *       return { status: 'ok' };
 *     } catch (err) {
 *       return { status: 'not ok', error: 'Database connection failed' };
 *     }
 *   }
 * };
 */
export interface HealthCheckMethod {
	/**
	 * Unique identifier for this health check.
	 * Appears in health check endpoint responses.
	 * @type {string}
	 */
	name: string;

	/**
	 * Async function that performs the health check.
	 * Should return quickly to avoid blocking requests.
	 *
	 * @param fastify - Fastify instance for accessing dependencies
	 * @returns Promise resolving to health status and optional error message
	 */
	check: (fastify: FastifyInstance) => Promise<{ status: HealthCheckStatus; error?: string }>;
}

/**
 * Configuration options for the health check endpoint.
 *
 * @interface HealthCheckModuleOptions
 */
export type HealthCheckModuleOptions = {
	/**
	 * URL path for the health check endpoint.
	 * GET request to this path returns overall application health.
	 * @default '/healthz'
	 * @type {string}
	 */
	url?: string;

	/**
	 * HTTP method for the health check endpoint.
	 * @default 'GET'
	 * @type {'GET' | 'POST'}
	 */
	method?: 'GET' | 'POST';
};

/**
 * Fastify plugin that sets up application health check endpoint.
 *
 * The endpoint will:
 * - Execute all registered health checks
 * - Return 200 (HEALTHY) if all checks pass
 * - Return 500 (UNHEALTHY) with failing check names if any fail
 * - Include timestamp and list of check names in response
 *
 * Default response (healthy):
 * ```json
 * {
 *   "status": "HEALTHY",
 *   "checks": ["default"],
 *   "datetime": "2024-01-27T10:30:00.000Z"
 * }
 * ```
 *
 * Default response (unhealthy):
 * ```json
 * {
 *   "status": "UNHEALTHY",
 *   "checks": ["database"],
 *   "errors": ["Connection timeout"],
 *   "datetime": "2024-01-27T10:30:00.000Z"
 * }
 * ```
 *
 * @example
 * // Register additional health checks
 * const app = feline();
 *
 * app.dependencies.register({
 *   healthchecks: asValue([
 *     {
 *       name: 'database',
 *       check: async (app) => {
 *         try {
 *           await app.db.ping();
 *           return { status: 'ok' };
 *         } catch (err) {
 *           return { status: 'not ok', error: err.message };
 *         }
 *       }
 *     }
 *   ])
 * });
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 * Adds a default health check that always returns 'ok'.
 */
export const HealthCheckModule: FastifyPluginCallback<HealthCheckModuleOptions> = (
	app,
	{ url = '/healthz', method = 'GET' },
	done,
) => {
	app.dependencies.register({
		healthchecks: asValue([
			{
				name: 'default',
				check: () => Promise.resolve({ status: 'ok' as const }),
			},
		]),
	});

	app.route({
		method,
		url,
		async handler(_request, reply) {
			const checks = app.dependencies.resolve('healthchecks');

			const results = await Promise.all(
				checks.map((hc) => hc.check(app).then((result) => ({ name: hc.name, ...result }))),
			);

			const unhealthy = results.filter((result) => result.status === 'not ok');
			if (unhealthy.length > 0) {
				app.log.error({ unhealthy }, 'Health check failed');
				return reply.code(500).send({
					status: 'UNHEALTHY',
					checks: unhealthy.map((hc) => hc.name),
					errors: unhealthy.map((hc) => String(hc.error)),
					datetime: new Date().toISOString(),
				});
			}

			return reply.code(200).send({
				status: 'HEALTHY',
				checks: results.map((hc) => hc.name),
				datetime: new Date().toISOString(),
			});
		},
	});

	done();
};
