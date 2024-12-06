#!/bin/bash

git submodule update --recursive --remote
docker build -f build/Dockerfile -t openbw-replay-viewer-builder --output=. build
rm openbw.html
