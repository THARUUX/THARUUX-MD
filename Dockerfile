FROM node:20-bookworm-slim

WORKDIR /app

# Install system dependencies for Baileys media processing (ffmpeg, imagemagick, webp) and yt-dlp
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    imagemagick \
    webp \
    git \
    curl \
    python3 \
    ca-certificates && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source
COPY . .

# Ensure compatibility symlinks for phoenix / tharuux modules
RUN ln -sf tharuux /app/lib/phoenix && \
    ln -sf lib/tharuux /app/phoenix

# Create sessions volume mount directory
RUN mkdir -p /app/sessions

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]
