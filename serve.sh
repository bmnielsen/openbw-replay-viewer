#!/bin/bash

docker build -f server/Dockerfile -t openbw-replay-viewer .
docker run -p 8888:80 openbw-replay-viewer
