import { asValue } from 'awilix';
import type { SyncModule } from '..';

export interface GracefulShutdownOptions {
	timeoutMs?: number;
}

export const GracefulShutdown: SyncModule<GracefulShutdownOptions> = (app, config, done) => {
	app.dependencies.register({
		onShutdown: asValue([]),
	});

	let isShuttingDown = false;
	const doGracefulShutdown = async (signal: string) => {
		const logger = app.log;
		if (isShuttingDown) {
			logger.warn(`${signal} received but shutdown already in progress`);
			return;
		}

		isShuttingDown = true;
		logger.warn(`${signal} received, closing application...`);

		const shutdownTimeout = setTimeout(() => {
			logger.error('Graceful shutdown timeout exceeded, forcing exit');
			process.exit(1);
		}, config.timeoutMs ?? 30_000);

		try {
			await app.close();

			const onShutdown = app.dependencies.resolve('onShutdown');
			const promises = onShutdown?.map(async (fn) => fn());
			await Promise.allSettled(promises ?? []);

			logger.info('Application closed gracefully.');
			await new Promise((resolve) => setTimeout(resolve, 100));

			clearTimeout(shutdownTimeout);
			isShuttingDown = false;
			process.exit(0);
		} catch (err) {
			clearTimeout(shutdownTimeout);

			logger.error({ err }, 'Error during application shutdown');
			isShuttingDown = false;
			process.exit(1);
		}
	};

	process.on('SIGTERM', () => doGracefulShutdown('SIGTERM'));

	done();
};
