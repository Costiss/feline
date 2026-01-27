import { asValue } from 'awilix';
import type { FastifyInstance, FastifyPluginCallback } from 'fastify';

export const HealthCheckStatus = ['ok', 'not ok'] as const;
export type HealthCheckStatus = (typeof HealthCheckStatus)[number];

export interface HealthCheckMethod {
	name: string;
	check: (fastify: FastifyInstance) => Promise<{ status: HealthCheckStatus; error?: string }>;
}

export type HealthCheckModuleOptions = {
	/**
	 * URL path for the health check endpoint
	 * @default '/healthz'
	 * */
	url?: string;

	/**
	 * HTTP method for the health check endpoint
	 * @default 'GET'
	 */
	method?: 'GET' | 'POST';
};

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
