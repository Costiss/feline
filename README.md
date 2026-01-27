# Feline Framework

> An opinionated, minimalistic Node.js backend framework built on Fastify for reducing complexity and runtime overhead.

[![GitHub](https://img.shields.io/badge/github-anomalyco/feline-blue)](https://github.com/anomalyco/feline)
[![npm](https://img.shields.io/badge/npm-@feline/core-red)](https://www.npmjs.com/package/@feline/core)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

## Overview

Feline is a minimalistic Node.js backend framework built on Fastify that eliminates the hidden complexity and runtime overhead of traditional frameworks. It combines the best of modern Node.js tooling with a focus on being explicit, fast, and type-safe.

### Why Feline?

Feline was created out of frustration with frameworks like NestJS that hide complexity behind layers of abstraction. Instead, Feline provides:

- **Minimalistic Design** - Less "magic", more explicit code you control
- **High Performance** - Built on Fastify, one of the fastest Node.js frameworks
- **Type Safety** - Full TypeScript support with Zod runtime validation
- **Built-in Observability** - Distributed tracing, metrics, and structured logging out of the box
- **Modular Architecture** - Fastify plugin system with Awilix dependency injection

### Key Differences

| Feature              | Feline  | NestJS          |
| -------------------- | ------- | --------------- |
| Base Framework       | Fastify | Express/Fastify |
| Dependency Injection | Awilix  | Custom IoC      |
| Validation           | Zod     | class-validator |
| Startup Time         | ~50ms   | ~500ms          |
| Complexity           | Minimal | High            |

## Core Concepts

Feline is built around four core concepts:

### 1. Dependency Injection

Manage application dependencies using Awilix with support for singleton and request-scoped instances.

**[→ Learn about Dependency Injection](./feline.wiki/Core-Concepts/Dependency-Injection.md)**

### 2. Type Safety

Schema-based validation with Zod for both request/response validation and type inference.

**[→ Learn about Type Safety](./feline.wiki/Core-Concepts/Type-Safety.md)**

### 3. Error Handling

Centralized error handling with automatic response formatting for validation errors, HTTP client errors, and unhandled exceptions.

**[→ Learn about Error Handling](./feline.wiki/Core-Concepts/Error-Handling.md)**

### 4. Observability

Built-in support for distributed tracing, structured logging, and OpenTelemetry metrics.

**[→ Learn about Tracing & Observability](./feline.wiki/Core-Concepts/Tracing-Observability.md)**

## Built-in Features

Feline includes production-ready features for common backend needs:

### HTTP Client

Type-safe HTTP client with automatic trace propagation to external services and built-in metrics collection.

**[→ HTTP Client Documentation](./feline.wiki/Features/HTTP-Client.md)**

### Health Checks

Flexible health check system with per-component status, Kubernetes probe support, and load balancer integration.

**[→ Health Checks Documentation](./feline.wiki/Features/Health-Checks.md)**

### Request Logging

Structured JSON logging with automatic request/response tracking, development-friendly formatting, and log aggregation support.

**[→ Request Logging Documentation](./feline.wiki/Features/Request-Logging.md)**

### Graceful Shutdown

Automatic SIGTERM handling with support for cleanup handlers, in-flight request completion, and resource management.

**[→ Graceful Shutdown Documentation](./feline.wiki/Features/Graceful-Shutdown.md)**

## Technology Stack

Feline combines proven, production-ready technologies:

- **Framework**: Fastify - High-performance HTTP server
- **DI Container**: Awilix - Lightweight, explicit IoC container
- **Validation**: Zod - TypeScript-first schema validation
- **Logging**: Pino - Fast, structured JSON logger
- **HTTP Client**: Axios - Promise-based HTTP client
- **Tracing**: W3C Trace Context - Standard distributed tracing format
- **Metrics**: OpenTelemetry - CNCF observability standard

## Configuration

Feline provides sensible defaults for all options. Configuration is optional and centralised:

```typescript
const app = feline({
  name: "my-service",
  healthcheck: { url: "/healthz", method: "GET" },
  tracing: { headers: ["x-correlation-id"] },
  httpClient: { agentConfig: { keepAlive: true } },
  requestLogger: { ignoreAgents: ["kube-probe", "Prometheus"] },
  gracefulShutdown: { timeoutMs: 30000 },
  fastify: { requestTimeout: 30000, trustProxy: true },
});
```

**[→ Complete Configuration Reference](./feline.wiki/Configuration.md)**

## Getting Started

### Installation

```bash
npm install @feline/core
```

### Next Steps

1. **First Time?** → [Getting Started Guide](./feline.wiki/Getting-Started.md)
2. **Want Examples?** → [Getting Started with Code Examples](./feline.wiki/Getting-Started.md#quick-start)
3. **Need Configuration?** → [Configuration Reference](./feline.wiki/Configuration.md)
4. **Learning the Framework?** → [Core Concepts](./feline.wiki/Home.md)

## Documentation

Complete documentation with guides, examples, and best practices:

### Getting Started

- [Getting Started Guide](./feline.wiki/Getting-Started.md) - 5-minute quick start with working examples
- [Configuration Reference](./feline.wiki/Configuration.md) - Complete option documentation

### Core Concepts (Learn the Framework)

- [Dependency Injection](./feline.wiki/Core-Concepts/Dependency-Injection.md) - Awilix IoC patterns
- [Type Safety with Zod](./feline.wiki/Core-Concepts/Type-Safety.md) - Schema validation and type inference
- [Error Handling](./feline.wiki/Core-Concepts/Error-Handling.md) - Centralized error management
- [Tracing & Observability](./feline.wiki/Core-Concepts/Tracing-Observability.md) - Distributed tracing and metrics

### Features (Implementation Guides)

- [HTTP Client Module](./feline.wiki/Features/HTTP-Client.md) - Traced HTTP requests with metrics
- [Health Checks](./feline.wiki/Features/Health-Checks.md) - Kubernetes and load balancer integration
- [Request Logging](./feline.wiki/Features/Request-Logging.md) - Structured logging and integration
- [Graceful Shutdown](./feline.wiki/Features/Graceful-Shutdown.md) - Clean process termination

### Wiki Home

- [Wiki Home](./feline.wiki/Home.md) - Complete documentation index

## Project Structure

Feline works best with a modular monolith architecture. Each module is a Fastify plugin:

```
src/
├── modules/
│   ├── users/          # User management module
│   ├── orders/         # Order management module
│   ├── payments/       # Payment processing module
│   └── shared/         # Shared services, database, cache
├── middleware/         # Custom middleware
├── app.ts             # Application setup
└── main.ts            # Entry point
```

Each module registers routes and dependencies:

```typescript
export const UsersModule: SyncModule = (app, _, done) => {
  // Register dependencies
  // Define routes
  // Setup handlers
  done();
};
```

## Contributing

We welcome contributions! Please visit the [GitHub repository](https://github.com/anomalyco/feline) to:

- Report issues
- Suggest features
- Submit pull requests
- Join discussions

## Community

- **GitHub Issues**: [Report bugs and request features](https://github.com/anomalyco/feline/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/anomalyco/feline/discussions)
- **Documentation**: [Browse the wiki](./feline.wiki/)

## License

MIT - See [LICENSE](LICENSE)

## Resources

- **GitHub**: https://github.com/anomalyco/feline
- **npm**: https://npmjs.com/package/@feline/core
- **Documentation**: [./feline.wiki](./feline.wiki)
- **Issues**: https://github.com/anomalyco/feline/issues
- **Discussions**: https://github.com/anomalyco/feline/discussions

## Support

- 📖 [Read the Documentation](./feline.wiki)
- 🐛 [Report Issues](https://github.com/anomalyco/feline/issues)
- 💬 [Join Discussions](https://github.com/anomalyco/feline/discussions)

---
