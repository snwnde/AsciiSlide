#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
IMAGE=asciislide:local
OUTPUT="$ROOT/.demo"

docker build -t "$IMAGE" "$ROOT"

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT"

docker run --rm -u root \
  -v "$ROOT/example:/asciislide/input:ro" \
  -v "$OUTPUT:/asciislide/public" \
  "$IMAGE" \
  'set -eu
   rm -rf src/*
   cp -R /asciislide/input/. src/
   PUPPETEER_NAVIGATION_TIMEOUT=300000 make
   mv build public/example
   cp -r assets public/assets'

if [ "${1:-}" = "--serve" ]; then
  echo "Serving http://localhost:8000/example/main.html"
  docker run --rm \
    -p 8000:8000 \
    -v "$OUTPUT:/srv:ro" \
    python:3-alpine \
    python -m http.server 8000 --directory /srv
else
  echo "Generated presentation in $OUTPUT/example"
  echo "Run $0 --serve to view it in a browser."
fi