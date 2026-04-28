# build stage
FROM node:20-bookworm-slim AS build
WORKDIR /usr/src/app
COPY . .
RUN npm ci && npm run build

# run stage
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/dist/gestaltbi-core/browser /usr/share/nginx/html
