import fp from 'fastify-plugin';

declare module 'fastify' {
	interface FastifyRequest {
		traces: Map<string, string | string[]>;
	}
}

export type TracingOptions = {
	headers?: string[];
};

const DEFAULT_HEADERS = ['traceparent', 'tracestate', 'x-request-id'];

export const TracingModule = fp<TracingOptions>((app, config, done) => {
	const headers = [...DEFAULT_HEADERS, ...(config.headers ?? [])];

	app.addHook('onRequest', async (request, reply) => {
		const traces = new Map<string, string | string[]>();

		for (const header of headers) {
			const value = request.headers[header];
			if (value) {
				traces.set(header, value);
				reply.header(header, value);
			}
		}

		request.traces = traces;
	});

	done();
});
