import { metrics } from '@opentelemetry/api';

export const getMeter = (name = 'default') => metrics.getMeter(name);
