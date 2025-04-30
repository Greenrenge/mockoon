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
# fix sqlite3 prebuild issue in arm64
RUN cd /prod/api-server/node_modules/sqlite3 && npx node-gyp rebuild

# Build stage
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build:libs
RUN pnpm run build:web:prod
RUN mkdir -p ./packages/api-server/src/assets/app
RUN cp -r ./packages/app/dist/renderer/* ./packages/api-server/src/assets/app

RUN pnpm run --filter=main-web build 
RUN cp -r ./packages/main-web/out/* ./packages/api-server/src/public

RUN mkdir -p ./packages/api-server/src/public/assets
RUN cp -r ./packages/api-server/src/assets/app/assets/* ./packages/api-server/src/public/assets

RUN pnpm run build:api-server

# Final image
FROM base
WORKDIR /app
# RUNNING DEPENDENCIES
COPY --from=prod-deps /prod/api-server /app

COPY --from=build /app/packages/api-server/dist /app/dist
RUN mkdir -p /app/dist/api-server/data

EXPOSE 3000-3010 4000-4010

# Start server
CMD ["pnpm", "run", "start"]
# CMD ["tail", "-f", "/dev/null"]