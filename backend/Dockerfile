FROM node:20-alpine AS builder

WORKDIR /app

# openssl is required by the Prisma schema engine during generate
RUN apk add --no-cache openssl

# Copy manifests and schema first so npm ci layer is cached independently
COPY package*.json ./
COPY prisma ./prisma/
# postinstall runs `prisma generate` automatically
RUN npm ci

COPY . .
RUN npm run build


FROM node:20-alpine

WORKDIR /app

# openssl is required by the Prisma query engine at runtime (Alpine uses musl + openssl-3)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh ./entrypoint.sh

# Normalize line endings — entrypoint.sh may be CRLF on Windows checkouts
RUN sed -i 's/\r//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
