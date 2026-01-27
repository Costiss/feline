import pino from 'pino';

/**
 * Create a Pino logger instance with environment-aware configuration.
 *
 * In development (NODE_ENV !== 'production'):
 * - Enables colorized output for better readability
 * - Uses pino-pretty transport for human-friendly formatting
 *
 * In production:
 * - Uses default JSON logging for structured log aggregation
 * - Optimized for log parsing and monitoring tools
 *
 * @param name - Logger name/context identifier for the logger instance
 * @returns Configured Pino logger instance
 *
 * @example
 * // Create a logger for your module
 * const logger = getLogger('my-service');
 * logger.info({ userId: 123 }, 'User logged in');
 * logger.error({ err }, 'Operation failed');
 *
 * // Logs in development appear colorized and formatted:
 * // [10:30:05.123] INFO (my-service): User logged in
 * //     userId: 123
 *
 * // Logs in production are JSON:
 * // {"level":30,"time":1234567890000,"name":"my-service","msg":"User logged in","userId":123}
 *
 * @remarks
 * This utility is used internally by Feline for application-level logging.
 * Request loggers are created automatically with request context.
 * For more information, see {@link https://getpino.io/ Pino documentation}.
 */
export const getLogger = (name: string) => {
	return pino({
		name,
		...injectLocalSettings(),
	});
};

function injectLocalSettings() {
	if (process.env.NODE_ENV === 'production') return {};

	return {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
			},
		},
	};
}
