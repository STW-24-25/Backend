# Use the official Ubuntu base image
FROM ubuntu:latest

# Update the package list and install basic utilities
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    vim \
    git \
    nodejs \
    npm \
    zsh \
    sudo \
    && npm install -g express-generator \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /root

RUN useradd --create-home --password vscode --shell /bin/zsh vscode
COPY ./.zshrc /home/vscode

# Set the default command to run when starting the container
CMD ["source", "/roo/.zshrc"] 