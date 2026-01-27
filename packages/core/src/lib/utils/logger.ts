import pino from 'pino';

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
