# syntax=docker/dockerfile:1
# TasteTogether frontend — build the React app, serve it with nginx.
#
# @wagnerluca/ui is installed from GitHub Packages (see .npmrc), so this build
# needs a read:packages token. It is handed to BuildKit as a **secret** so it
# never lands in an image layer or in `docker history` — never as an ARG/ENV.
# Same secret id (NODE_AUTH_TOKEN) the portfolio and the arcade use.
FROM node:20-alpine AS builder

WORKDIR /app

# .npmrc must be copied with the manifests: it is what points the @wagnerluca
# scope at npm.pkg.github.com and reads the token from the env.
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=NODE_AUTH_TOKEN \
    if [ ! -s /run/secrets/NODE_AUTH_TOKEN ]; then \
      echo "ERROR: NODE_AUTH_TOKEN secret not provided to the build (needed to install @wagnerluca/ui from GitHub Packages)" >&2; \
      exit 1; \
    fi && \
    NODE_AUTH_TOKEN="$(cat /run/secrets/NODE_AUTH_TOKEN)" npm ci

COPY . .
# Public URL of WL Konto for the optional host sign-in; empty = feature off. Not a secret.
ARG VITE_KONTO_URL=
RUN VITE_KONTO_URL="$VITE_KONTO_URL" npm run build


FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
