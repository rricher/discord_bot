FROM node:18-slim

# Install ffmpeg and curl
RUN apt-get update && apt-get install -y ffmpeg curl unzip && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="${DENO_INSTALL}/bin:${PATH}"

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app files
COPY app.js commands.js voiceClient.js utils.js ./

# Download yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /app/yt-dlp \
    && chmod +x /app/yt-dlp

EXPOSE 3000

CMD ["node", "app.js"]
