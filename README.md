# Feline Framework

> An opinionated, minimalistic Node.js backend framework built on Fastify for reducing complexity and runtime overhead.

[![GitHub](https://img.shields.io/badge/github-Costiss/feline-blue)](https://github.com/Costiss/feline)
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

## Getting Started

### Installation

```bash
npm install @feline/core
```

### Next Steps

1. **First Time?** → [Getting Started Guide](https://github.com/Costiss/feline/wiki/Getting-Started)
2. **Want Examples?** → [Getting Started with Code Examples](https://github.com/Costiss/feline/wiki/Getting-Started#quick-start)
3. **Need Configuration?** → [Configuration Reference](https://github.com/Costiss/feline/wiki/Configuration)
4. **Learning the Framework?** → [Core Concepts](https://github.com/Costiss/feline/wiki)

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

**[→ Learn about Dependency Injection](https://github.com/Costiss/feline/wiki/Dependency-Injection)**

### 2. Type Safety

Schema-based validation with Zod for both request/response validation and type inference.

**[→ Learn about Type Safety](https://github.com/Costiss/feline/wiki/Type-Safety)**

### 3. Error Handling

Centralized error handling with automatic response formatting for validation errors, HTTP client errors, and unhandled exceptions.

**[→ Learn about Error Handling](https://github.com/Costiss/feline/wiki/Error-Handling)**

### 4. Observability

Built-in support for distributed tracing, structured logging, and OpenTelemetry metrics.

**[→ Learn about Tracing & Observability](https://github.com/Costiss/feline/wiki/Tracing-Observability)**

## Built-in Features

Feline includes production-ready features for common backend needs:

### HTTP Client

Type-safe HTTP client with automatic trace propagation to external services and built-in metrics collection.

**[→ HTTP Client Documentation](https://github.com/Costiss/feline/wiki/HTTP-Client)**

### Health Checks

Flexible health check system with per-component status, Kubernetes probe support, and load balancer integration.

**[→ Health Checks Documentation](https://github.com/Costiss/feline/wiki/Health-Checks)**

### Request Logging

Structured JSON logging with automatic request/response tracking, development-friendly formatting, and log aggregation support.

**[→ Request Logging Documentation](https://github.com/Costiss/feline/wiki/Request-Logging)**

### Graceful Shutdown

Automatic SIGTERM handling with support for cleanup handlers, in-flight request completion, and resource management.

**[→ Graceful Shutdown Documentation](https://github.com/Costiss/feline/wiki/Graceful-Shutdown)**

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

**[→ Complete Configuration Reference](https://github.com/Costiss/feline/wiki/Configuration)**

## Documentation

Complete documentation with guides, examples, and best practices:

### Core Concepts (Learn the Framework)

- [Dependency Injection](https://github.com/Costiss/feline/wiki/Dependency-Injection) - Awilix IoC patterns
- [Type Safety with Zod](https://github.com/Costiss/feline/wiki/Type-Safety) - Schema validation and type inference
- [Error Handling](https://github.com/Costiss/feline/wiki/Error-Handling) - Centralized error management
- [Tracing & Observability](https://github.com/Costiss/feline/wiki/Tracing-Observability) - Distributed tracing and metrics

### Features (Implementation Guides)

- [HTTP Client Module](https://github.com/Costiss/feline/wiki/HTTP-Client) - Traced HTTP requests with metrics
- [Health Checks](https://github.com/Costiss/feline/wiki/Health-Checks) - Kubernetes and load balancer integration
- [Request Logging](https://github.com/Costiss/feline/wiki/Request-Logging) - Structured logging and integration
- [Graceful Shutdown](https://github.com/Costiss/feline/wiki/Graceful-Shutdown) - Clean process termination

### Wiki Home

- [Wiki Home](https://github.com/Costiss/feline/wiki) - Complete documentation index

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

We welcome contributions! Please visit the [GitHub repository](https://github.com/Costiss/feline) to:

- Report issues
- Suggest features
- Submit pull requests
- Join discussions

## Community

- **GitHub Issues**: [Report bugs and request features](https://github.com/Costiss/feline/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/Costiss/feline/discussions)
- **Documentation**: [Browse the wiki](https://github.com/Costiss/feline/wiki)

## License

MIT - See [LICENSE](LICENSE)

## Resources

- **GitHub**: https://github.com/Costiss/feline
- **npm**: https://npmjs.com/package/@feline/core
- **Documentation**: https://github.com/Costiss/feline/wiki
- **Issues**: https://github.com/Costiss/feline/issues
- **Discussions**: https://github.com/Costiss/feline/discussions

## Support

- 📖 [Read the Documentation](https://github.com/Costiss/feline/wiki)
- 🐛 [Report Issues](https://github.com/Costiss/feline/issues)
- 💬 [Join Discussions](https://github.com/Costiss/feline/discussions)

---
