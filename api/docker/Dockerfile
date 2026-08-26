FROM public.ecr.aws/docker/library/node:20.11.0

WORKDIR /usr/src/app

COPY . .

RUN apt-get update && apt-get install --assume-yes build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev ffmpeg \
    chromium fonts-freefont-ttf --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium
RUN yarn install --frozen-lockfile --production=true

EXPOSE 8080
