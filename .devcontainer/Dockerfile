# Use the official Node.js image as the base
FROM mcr.microsoft.com/devcontainers/go

# Install Go
RUN apt-get update
# Install other necessary dependencies
# RUN apt-get install -y git curl build-essential

# Set the working directory in the container
WORKDIR /

# Expose port for the plugin or Grafana if needed
EXPOSE 3000

# Make sure we have the correct path for node_modules and go tools
ENV PATH="/workspace/node_modules/.bin:${PATH}"