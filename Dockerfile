
# --- Etapa 1: Build Angular ---
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build -- --configuration production

# --- Etapa 2: Executar Angular SSR ---
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/imobia-frontend/server/server.mjs"]
