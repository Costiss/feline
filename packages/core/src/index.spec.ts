import { describe, test } from 'vitest';

describe('index', () => {
	test('cover imports', async () => {
		await import('./zod');
		await import('./awilix');
		await import('./axios');
	});
});
