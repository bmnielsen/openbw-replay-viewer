FROM trzeci/emscripten:sdk-tag-1.38.13-64bit as builder

COPY openbw /openbw
COPY sdl /sdl
COPY dlmalloc /dlmalloc
COPY build_js.sh /build_js.sh

WORKDIR /

RUN ./build_js.sh

FROM scratch
COPY --from=builder /openbw.* /
