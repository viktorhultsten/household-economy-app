# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
# Mallanalysen (docker-compose-tjänsten mallanalys) som en fristående fil.
RUN npx esbuild scripts/mallanalys.ts --bundle --platform=node --target=node20 \
      --external:pg-native --outfile=dist/mallanalys.js

# Mallanalysen: kör härledningen av konteringsmallar varje natt (issue 21).
# Se docs/runbooks/mallanalys.md. Ligger före runner så att runner förblir
# sista steget, det som byggs när inget --target anges.
FROM node:20-alpine AS mallanalys
WORKDIR /app
ENV NODE_ENV=production
# Tidszonen (TZ) avgör när på natten analysen körs.
RUN apk add --no-cache tzdata
COPY --from=builder /app/dist/mallanalys.js ./
USER node
CMD ["node", "mallanalys.js", "--schema"]

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# pg_dump is needed by the /api/export database backup route.
RUN apk add --no-cache postgresql-client

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
