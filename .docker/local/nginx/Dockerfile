FROM nginx:1.25

RUN apt update && apt install -y procps

# Remove default Nginx configuration to prevent conflicts with custom config
RUN rm -f /etc/nginx/conf.d/default.conf