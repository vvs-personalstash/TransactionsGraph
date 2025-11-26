# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Install envsubst
RUN apk add --no-cache gettext

# Copy template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

# Substitute env vars → generate final Nginx config
CMD sh -c "envsubst '\$API_BASE_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
