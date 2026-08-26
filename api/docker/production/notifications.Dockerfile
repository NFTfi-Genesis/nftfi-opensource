ARG SERVICE=default
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

WORKDIR /usr/src/app

COPY --from=builder "/usr/src/app/components/services/${SERVICE_PATH}/dist" .
COPY --from=builder "/usr/src/app/components/services/${SERVICE_PATH}/templates" "./templates"
COPY --from=builder "/usr/src/app/.git" ".git"

RUN apk update && apk add git
RUN yarn install --frozen-lockfile --production=true && yarn add core-js

EXPOSE 8080

CMD [ "node", "main.js" ]