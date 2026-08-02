# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Install deps separately for Docker layer cache efficiency
COPY package*.json ./
RUN npm ci --silent

# Build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx (tiny alpine image)
FROM nginx:alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

# Phase 4: Nginx config that rewrites all routes to index.html
# Critical for React Router — without this, refreshing /dashboard gives 404
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
