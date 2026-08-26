#!/bin/bash

BUILD=false

# Parse command line options
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -b|--build) BUILD=true;;
        *) echo "Unknown option: $1"; exit 1;;
    esac
    shift
done

function build_image {
    docker build -f ./docker/Dockerfile -t nftfiapi-services-base .
}

if [ "$BUILD" = true ]; then
    build_image
fi

if [ -n "$(docker images -q nftfiapi-services-base)" ]; then
    echo "Docker image nftfiapi-services-base exists. Starting up..."
else 
    echo "Docker image nftfiapi-services-base does not exist. Building..."
    build_image
fi

docker-compose up -d