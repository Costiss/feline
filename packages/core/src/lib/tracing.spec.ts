import { describe, expect, test, vi } from 'vitest';
import { type FelineApplication, feline } from '.';
import { TracingModule } from './tracing';

describe(TracingModule.name, () => {
	let app: FelineApplication;
	const log = {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	};
	const headers = ['x-custom-trace', 'traceparent', 'x-trace-id'];

	describe(TracingModule.name, () => {
		test.each(headers)('should trace header %s', async (header) => {
			app = await feline({
				tracing: { headers: ['x-custom-trace'] },
			});
			app.log = log as never;

			const headerValue = `value-for-${header}`;
			app.route({
				method: 'GET',
				url: `/${header}`,
				handler: (request, reply) => {
					return reply.send(request.traces.get(header));
				},
			});

			await app.ready();

			const response = await app.inject({
				method: 'GET',
				url: `/${header}`,
				headers: {
					[header]: headerValue,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(response.rawPayload.toString()).toBe(headerValue);

			await app.close();
		});
	});
});
