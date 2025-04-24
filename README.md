# Mocknoon

Mocknoon is a fork of [Mockoon](https://mockoon.com) - the easiest and quickest way to design and run mock APIs. This fork adds enterprise-focused features for on-premises deployments and local API services.

## About Mocknoon

API mocking helps you speed up development and third-party API integration by reducing dependency on external services and their limitations: rate limits, costs, availability, etc. It also allows you to test your applications in a controlled environment with predictable responses, status codes, and latencies, and easily simulate edge cases and error scenarios.

Mocknoon maintains all the core functionality of Mockoon while adapting cloud features to work locally:

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

Mocknoon can be easily deployed using Docker. Below are the Dockerfile and docker-compose configurations for deployment.

### Dockerfile

```dockerfile
FROM node:20 as base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

# Install dependencies
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build:libs
RUN pnpm deploy --filter=api-server --prod /prod/api-server --legacy

# Build stage
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build:libs
RUN pnpm run build:web:prod

RUN cp -r ./packages/app/dist/renderer/* ./packages/api-server/src/public
RUN pnpm run build:api-server

# Final image
FROM base
WORKDIR /app
# RUNNING DEPENDENCIES
COPY --from=prod-deps /prod/api-server /app

COPY --from=build /app/packages/api-server/dist /app/dist

EXPOSE 3000-3010 4000-4010

# Start server
CMD ["pnpm", "run", "start"]
```

### Docker Compose

```yaml
# docker compose -p backend up --build
services:
  mockoon:
    build:
      context: .
      dockerfile: Dockerfile
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    depends_on:
      - postgres
    restart: always
    ports:
      - 3000:3000
      - 3001:3001
      - 3002:3002
      - 3003:3003
      - 3004:3004
      - 3005:3005
      - 3006:3006
      - 3007:3007
      - 3008:3008
      - 3009:3009
      - 3010:3010
      - 4000:4000
      - 4001:4001
      - 4002:4002
      - 4003:4003
      - 4004:4004
      - 4005:4005
      - 4006:4006
      - 4007:4007
      - 4008:4008
      - 4009:4009
      - 4010:4010
    deploy:
      replicas: 1
    env_file:
      - ./.env
    environment:
      # - SUPABASE_URL=
      # - SUPABASE_ANON_KEY=
      # - SUPABASE_SERVICE_ROLE_KEY=
      # - AUTH_PROVIDER=keycloak
      # - KEYCLOAK_URL=https://keycloak.example.com
      # - KEYCLOAK_CLIENT_ID=mockoon
      # - KEYCLOAK_REALM=mockoon
      # - API_PORT=3000
      # - WS_PORT=4000
      # - WS_FULL_URL=ws://localhost:4000
      # - DEPLOY_URL=http://localhost:3000/api
      # - MOCK_INSTANCE_PATTERN="http://localhost:{{PORT}}"
      - NODE_ENV=production
      - NODE_OPTIONS=--max_old_space_size=4096
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=mockoon
      - POSTGRES_USER=mockoon
      - POSTGRES_PASSWORD=mockoon

    networks:
      - db
  postgres:
    image: postgres:latest
    restart: always
    environment:
      POSTGRES_USER: mockoon
      POSTGRES_PASSWORD: mockoon
      POSTGRES_DB: mockoon
    networks:
      - db

networks:
  db:
    name: db
```

## Environment Variables

Mocknoon supports the following environment variables for configuration:

| Variable                  | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| AUTH_PROVIDER             | Authentication provider (keycloak, supabase, disabled) |
| SUPABASE_URL              | Supabase URL for authentication                        |
| SUPABASE_ANON_KEY         | Supabase anonymous key                                 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key                              |
| KEYCLOAK_URL              | KeyCloak server URL                                    |
| KEYCLOAK_CLIENT_ID        | KeyCloak client ID                                     |
| KEYCLOAK_REALM            | KeyCloak realm                                         |
| API_PORT                  | Port for the API server (default: 3000)                |
| WS_PORT                   | Port for WebSocket connections (default: 4000)         |
| WS_FULL_URL               | Full WebSocket URL                                     |
| DEPLOY_URL                | API deployment URL                                     |
| MOCK_INSTANCE_PATTERN     | URL pattern for mock instances                         |
| POSTGRES_HOST             | PostgreSQL host                                        |
| POSTGRES_PORT             | PostgreSQL port                                        |
| POSTGRES_DB               | PostgreSQL database name                               |
| POSTGRES_USER             | PostgreSQL username                                    |
| POSTGRES_PASSWORD         | PostgreSQL password                                    |

## Documentation

You will find Mocknoon's documentation in our repository. It covers all features, including specific modifications and additions.

## Contributing

If you are interested in contributing to Mocknoon, please take a look at the contributing guidelines.

## License

Mocknoon is open-source under the MIT License, maintaining the same license as the original Mockoon project.

---

_Mocknoon is a fork of the original [Mockoon](https://mockoon.com) project. We thank the original creators for developing such an awesome tool._
