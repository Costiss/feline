import { metrics } from '@opentelemetry/api';

/**
 * Get an OpenTelemetry Meter instance for recording metrics.
 *
 * Meters are used to create and record observability metrics (counters, histograms, etc.)
 * that can be exported to monitoring backends like Prometheus, Grafana, or Datadog.
 *
 * Common metric types:
 * - **Counter** - Monotonically increasing values (request count, errors, etc.)
 * - **Histogram** - Distribution of values (request latency, response size, etc.)
 * - **Gauge** - Instantaneous value (memory usage, active connections, etc.)
 * - **UpDownCounter** - Can increase or decrease (queue size, concurrent requests, etc.)
 *
 * @param name - Meter name/identifier (defaults to 'default')
 * @returns OpenTelemetry Meter instance
 *
 * @example
 * // Create a meter for your module
 * const meter = getMeter('user-service');
 *
 * // Create metrics
 * const userCreatedCounter = meter.createCounter('users_created_total', {
 *   description: 'Total number of users created'
 * });
 *
 * const requestLatencyHistogram = meter.createHistogram('request_duration_ms', {
 *   description: 'HTTP request duration in milliseconds',
 *   unit: 'ms'
 * });
 *
 * // Record metric values
 * userCreatedCounter.add(1, { plan: 'premium' });
 * requestLatencyHistogram.record(125, { method: 'GET', path: '/users' });
 *
 * @remarks
 * OpenTelemetry metrics are automatically collected by Feline for HTTP clients.
 * See {@link https://opentelemetry.io/docs/specs/otel/metrics/ OpenTelemetry Metrics spec}.
 */
export const getMeter = (name = 'default') => metrics.getMeter(name);
