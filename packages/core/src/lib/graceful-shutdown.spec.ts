import { beforeEach, describe, expect, it, vi } from 'vitest';
import { feline } from '.';
import { GracefulShutdown, type GracefulShutdownOptions } from './graceful-shutdown';

describe(GracefulShutdown.name, () => {
	const log = {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	};

	const bootstrap = async (config: GracefulShutdownOptions) => {
		const app = await feline({
			gracefulShutdown: config,
		});
		app.log = log as never;

		const close = app.close;
		app.close = vi.fn().mockResolvedValue(undefined);
		return { app, close };
	};

	beforeEach(async () => {
		vi.clearAllMocks();

		process.exit = vi.fn() as never;
	});

	it.sequential('should register SIGTERM handler and call app.close', async () => {
		const processOnSpy = vi.spyOn(process, 'on');
		const { app, close } = await bootstrap({});
		await app.register(GracefulShutdown, { timeoutMs: 5000 });

		expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
		processOnSpy.mockRestore();

		await close();

		process.removeAllListeners('SIGTERM');
	});

	it.sequential('should perform graceful shutdown on SIGTERM', async () => {
		const onShutdownFn = vi.fn().mockResolvedValue(true);

		const { app, close } = await bootstrap({
			timeoutMs: 1000,
		});
		app.dependencies.resolve('onShutdown').push(onShutdownFn);
		await app.ready();

		const handler = process
			.listeners('SIGTERM')
			.find((fn) => fn.name === 'doGracefulShutdown' || true) as CallableFunction;

		await handler('SIGTERM').catch(() => {});

		expect(app.close).toHaveBeenCalled();
		expect(onShutdownFn).toHaveBeenCalled();
		expect(log.warn).toHaveBeenCalledWith('SIGTERM received, closing application...');
		expect(log.info).toHaveBeenCalledWith('feline closed gracefully.');
		expect(process.exit).toHaveBeenCalledWith(0);

		await close();

		process.removeAllListeners('SIGTERM');
	});

	it.sequential('should force exit if timeout exceeded', async () => {
		const { app, close } = await bootstrap({ timeoutMs: 50 });
		app.close = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100))) as never;

		await app.ready();

		const handler = process
			.listeners('SIGTERM')
			.find((fn) => fn.name === 'doGracefulShutdown' || true) as CallableFunction;

		await handler('SIGTERM').catch(() => {});

		expect(log.error).toHaveBeenCalledWith('Graceful shutdown timeout exceeded, forcing exit');
		expect(process.exit).toHaveBeenCalledWith(1);

		await close();

		process.removeAllListeners('SIGTERM');
	});

	it.sequential('should handle errors during shutdown', async () => {
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('exit');
		});
		const { app, close } = await bootstrap({});

		app.close = vi.fn().mockRejectedValue(new Error('fail')) as never;
		await app.register(GracefulShutdown, {});
		await app.ready();

		const handler = process
			.listeners('SIGTERM')
			.find((fn) => fn.name === 'doGracefulShutdown' || true) as CallableFunction;

		try {
			await handler('SIGTERM');
		} catch {}

		expect(log.error).toHaveBeenCalledWith(
			{ err: expect.any(Error) },
			'Error during application shutdown',
		);
		expect(exitSpy).toHaveBeenCalledWith(1);

		exitSpy.mockRestore();

		await close();

		process.removeAllListeners('SIGTERM');
	});
});
