FROM node:20 as base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

# Build-time arguments
ARG API_URL
ARG WEB_URL

# Install dependencies
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build:libs
RUN pnpm deploy --filter=api-server --prod /prod/api-server --legacy

# Build stage
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build:libs

# Replace placeholders in environment file
RUN sed -i "s|\${API_URL}|$API_URL|g" ./packages/app/src/renderer/environments/environment.prod-web-docker.ts
RUN sed -i "s|\${WEB_URL}|$WEB_URL|g" ./packages/app/src/renderer/environments/environment.prod-web-docker.ts

RUN pnpm run build:web

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
# CMD ["tail", "-f", "/dev/null"]