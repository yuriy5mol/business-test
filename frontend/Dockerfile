# Production stage for Frontend
FROM nginx:alpine

# Copy the built distribution folder to the Nginx serving directory
COPY dist /var/www/frontend

# Copy the custom Nginx configuration
# (Note: This assumes the build context is set such that this file is reachable, 
# or we will update the context in docker-compose)
COPY nginx-conf/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
