# Railway Dockerfile for TotalLook.ai
FROM node:22-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Install system dependencies for sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY patches/ ./patches/

# Install ALL dependencies (needed because esbuild uses --packages=external)
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:22-slim AS production

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Install runtime dependencies for sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install ALL deps (esbuild --packages=external needs them at runtime)
COPY package.json pnpm-lock.yaml* ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile || pnpm install

# Copy built files
COPY --from=base /app/dist ./dist

# Expose port (Railway sets PORT env var)
EXPOSE ${PORT:-3000}

# Start the server
CMD ["node", "dist/index.js"]
