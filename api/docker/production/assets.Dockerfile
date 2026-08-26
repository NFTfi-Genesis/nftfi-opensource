ARG SERVICE=assets
ARG SERVICE_PATH=${SERVICE}
ARG BASEIMAGE=nftfiapi-services-base
#------------------------------------
# BUILDER ###########################
#------------------------------------
FROM ${BASEIMAGE} AS builder
ARG SERVICE
ARG SERVICE_PATH

WORKDIR /usr/src/app

RUN yarn nx run services-${SERVICE}:build:production

#------------------------------------
# SERVICE ###########################
#------------------------------------
FROM public.ecr.aws/docker/library/node:20.11.1-alpine3.18
ARG SERVICE
ARG SERVICE_PATH

ENV NODE_ENV=production
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY --from=builder "/usr/src/app/components/services/${SERVICE_PATH}/dist" .
COPY --from=builder "/usr/src/app/.git" ".git"

RUN apk update && apk add --no-cache \
    git python3 pkgconfig pixman-dev cairo-dev cairo cairo-tools pango-dev make cmake g++ \
    chromium nss freetype harfbuzz ca-certificates ttf-freefont ffmpeg

RUN yarn install --frozen-lockfile --production=true && yarn add core-js

EXPOSE 8080

CMD [ "node", "main.js" ]
