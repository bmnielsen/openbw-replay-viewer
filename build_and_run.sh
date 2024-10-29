#!/bin/bash

docker build . -t openbw-replay-viewer
docker run -p 8888:80 openbw-replay-viewer
