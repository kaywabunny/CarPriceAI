# ---------- Build stage ----------
    FROM node:18-alpine AS build

    WORKDIR /app
    
    # Accept build arg for API base URL
    ARG REACT_APP_API_BASE_URL=http://localhost:8000
    ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
    
    # Copy dependency files first (for caching)
    COPY package.json package-lock.json* ./
    
    RUN npm install --legacy-peer-deps
    
    # Copy the rest of the frontend
    COPY . .
    
    # Build React app
    RUN npm run build
    
    
# ---------- Production stage ----------
    FROM nginx:alpine

    # Copy built files to nginx
    COPY --from=build /app/build /usr/share/nginx/html

    # Copy nginx config for SPA routing (try_files -> index.html)
    COPY nginx.conf /etc/nginx/conf.d/default.conf

    # Expose nginx port
    EXPOSE 80

    # Start nginx
    CMD ["nginx", "-g", "daemon off;"]
    