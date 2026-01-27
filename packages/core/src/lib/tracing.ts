import fp from 'fastify-plugin';

declare module 'fastify' {
	interface FastifyRequest {
		traces: Map<string, string | string[]>;
	}
}

/**
 * Configuration options for distributed tracing header propagation.
 *
 * @interface TracingOptions
 */
export type TracingOptions = {
	/**
	 * Additional header names to extract and propagate as traces.
	 * Combined with default headers (traceparent, tracestate, x-request-id).
	 *
	 * These headers will be:
	 * 1. Extracted from incoming requests
	 * 2. Stored in request.traces Map
	 * 3. Automatically included in outgoing HTTP client requests
	 * 4. Returned in response headers
	 *
	 * @type {string[]}
	 * @default []
	 *
	 * @example
	 * tracing: {
	 *   headers: ['x-correlation-id', 'x-user-id']
	 * }
	 */
	headers?: string[];
};

const DEFAULT_HEADERS = ['traceparent', 'tracestate', 'x-request-id'];

/**
 * Fastify plugin that extracts and propagates distributed tracing headers.
 *
 * This plugin handles OpenTelemetry (W3C Trace Context) and common tracing headers
 * by extracting them from incoming requests and making them available throughout
 * the request lifecycle.
 *
 * Features:
 * - Extracts traceparent and tracestate headers for W3C Trace Context compatibility
 * - Extracts x-request-id for request correlation
 * - Supports custom header propagation
 * - Automatically includes traces in outgoing HTTP client requests
 * - Makes traces available via request.traces Map for logging
 *
 * The extracted traces are:
 * - Stored in `request.traces` Map for access in handlers
 * - Included in all response headers
 * - Available to the HTTP client module for outgoing requests
 * - Added to request-scoped logger context
 *
 * @example
 * // Default behavior - extracts standard headers
 * const app = feline();
 *
 * app.get('/', async (request) => {
 *   // Access extracted traces
 *   const traceId = request.traces.get('traceparent');
 *   const requestId = request.traces.get('x-request-id');
 *   return { traceId, requestId };
 * });
 *
 * // Custom headers
 * const app = feline({
 *   tracing: {
 *     headers: ['x-correlation-id', 'x-tenant-id']
 *   }
 * });
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 * Headers are case-insensitive as per HTTP specification.
 *
 * @see https://www.w3.org/TR/trace-context/ - W3C Trace Context specification
 */
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
