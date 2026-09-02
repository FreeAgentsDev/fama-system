FROM node:22-slim

WORKDIR /app

# corepack para pnpm (packageManager: pnpm en package.json)
RUN corepack enable

# Instalar dependencias primero (mejor cache de capas)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Código fuente (Iraca escanea src/features en runtime)
COPY iraca.config.json ./
COPY tsconfig.json ./
COPY src ./src

# Iraca corre sobre ts-node (mismo arranque que en local)
EXPOSE 2436

CMD ["pnpm", "start"]
