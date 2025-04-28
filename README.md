<div align="center">
  <a href="https://mockoon.com" alt="mockoon logo">
    <img width="200" height="200" src="https://mockoon.com/images/logo-square-app.png">
  </a>
  <br>
  <h1>KPC-Mockoon: Enterprise API Mocking</h1>
</div>

# KPC-Mockoon

KPC-Mockoon is a fork of [Mockoon](https://mockoon.com) - the easiest and quickest way to design and run mock APIs. This fork adds enterprise-focused features for on-premises deployments and local API services.

## About KPC-Mockoon

API mocking helps you speed up development and third-party API integration by reducing dependency on external services and their limitations: rate limits, costs, availability, etc. It also allows you to test your applications in a controlled environment with predictable responses, status codes, and latencies, and easily simulate edge cases and error scenarios.

KPC-Mockoon maintains all the core functionality of Mockoon while adapting cloud features to work locally:

## Features

### Original Mockoon Features:

- Unlimited number of mock local servers and routes
- CLI to run your mock in headless environments, CI, etc.
- Complete control on routes definition: HTTP methods and statuses, regex paths, file serving, custom headers, etc.
- OpenAPI compatibility
- Record/logs of all entering and forwarded requests
- JSON templating
- Proxy forwarding mode
- HTTPS support

### KPC Modifications:

- Local API service replacing cloud API service, enabling WebApp version to work on-premises
- Authentication integration with:
  - Supabase (with GitHub/KeyCloak integration)
  - KeyCloak
  - Disabled (no authentication)
- Database support for PostgreSQL

### Newly Added Features:

- Import/Export OpenAPI/Swagger file(s) to create Mock Instances
- Import/Export Mockoon Configuration from JSON

### Cloud Features Removed:

- Auto subdomain creation for each instance
- AI powered features
- Template service
- Telemetry

## Docker Deployment

KPC-Mockoon can be easily deployed using Docker. Below are the Dockerfile and docker-compose configurations for deployment.

## Environment Variables

KPC-Mockoon supports the following environment variables for configuration:

| Variable                  | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| AUTH_PROVIDER             | Authentication provider (keycloak, supabase, disabled)   |
| SUPABASE_URL              | Supabase URL for authentication                          |
| SUPABASE_ANON_KEY         | Supabase anonymous key                                   |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key                                |
| KEYCLOAK_URL              | KeyCloak server URL                                      |
| KEYCLOAK_CLIENT_ID        | KeyCloak client ID                                       |
| KEYCLOAK_REALM            | KeyCloak realm                                           |
| API_PORT                  | Port for the API server (default: 8080)                  |
| WS_PORT                   | Port for WebSocket connections (default: 8081)           |
| WS_FULL_URL               | Full WebSocket URL Excluding /socket.io suffix           |
| WEB_FULL_URL              | Web deployment URL                                       |
| INSTANCE_PATTERN          | URL pattern for mock instances with placeholder {{PORT}} |
| DB_DRIVER                 | database driver (sqlite/postgres) default to sqlite      |
| DB_HOST                   | PostgreSQL host                                          |
| DB_PORT                   | PostgreSQL port                                          |
| DB_NAME                   | PostgreSQL database name                                 |
| DB_USER                   | PostgreSQL username                                      |
| DB_PASSWORD               | PostgreSQL password                                      |
| DB_PATH_SQLITE            | path for sqlite default to `./data`                      |

## Documentation

You will find KPC-Mockoon's documentation in our repository. It covers all features, including KPC-specific modifications and additions.

## Contributing

If you are interested in contributing to KPC-Mockoon, please take a look at the contributing guidelines.

## License

KPC-Mockoon is open-source under the MIT License, maintaining the same license as the original Mockoon project.

---

_KPC-Mockoon is a fork of the original [Mockoon](https://mockoon.com) project. We thank the original creators for developing such an awesome tool._
