import { asValue } from 'awilix';
import type { SyncModule } from '..';

/**
 * Configuration options for graceful shutdown behavior.
 *
 * @interface GracefulShutdownOptions
 */
export interface GracefulShutdownOptions {
	/**
	 * Timeout in milliseconds for graceful shutdown process.
	 * If shutdown takes longer than this, the process will force exit.
	 *
	 * During shutdown:
	 * 1. Application closes and stops accepting connections
	 * 2. All registered onShutdown handlers are executed
	 * 3. If timeout expires before completion, process force exits with code 1
	 * 4. On successful shutdown, process exits with code 0
	 *
	 * @type {number}
	 * @default 30000 (30 seconds)
	 * @example
	 * gracefulShutdown: { timeoutMs: 60000 } // 1 minute timeout
	 */
	timeoutMs?: number;
}

/**
 * Fastify plugin that sets up graceful shutdown handling.
 *
 * Features:
 * - Listens for SIGTERM signal (standard shutdown signal)
 * - Gracefully closes the Fastify application
 * - Executes all registered shutdown handlers
 * - Prevents duplicate shutdown attempts
 * - Enforces shutdown timeout to prevent hanging
 * - Exits with appropriate status code (0 for success, 1 for failure)
 *
 * Registers in dependencies:
 * - `onShutdown` - Array of async functions to execute during shutdown
 *
 * Shutdown Flow:
 * 1. SIGTERM signal received
 * 2. Check if shutdown already in progress (warn if so)
 * 3. Start shutdown timer
 * 4. Close Fastify application (stop accepting requests)
 * 5. Execute all onShutdown handler functions in parallel
 * 6. Wait 100ms for final cleanup
 * 7. Exit process with code 0
 *
 * If any step fails or timeout exceeded:
 * - Log error with context
 * - Force exit with code 1
 *
 * @example
 * const app = feline({
 *   gracefulShutdown: { timeoutMs: 60000 }
 * });
 *
 * // Register shutdown handler
 * const onShutdown = app.dependencies.resolve('onShutdown');
 * onShutdown.push(async () => {
 *   // Close database connections
 *   await db.close();
 *   console.log('Database closed');
 * });
 *
 * // Start server
 * await app.listen({ port: 3000 });
 * // On SIGTERM: database closes gracefully, then process exits
 *
 * @remarks
 * This module is automatically registered by the feline() factory function.
 * It only handles SIGTERM; for SIGINT (Ctrl+C), Fastify's built-in handling applies.
 * Common shutdown handlers: database connections, cache cleanup, file handle closing.
 */
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
