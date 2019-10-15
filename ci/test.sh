#!/usr/bin/env sh
set -x
set -e

npm install 
npx mocha --timeout 30000 -b -r ts-node/register ./test/*.test.ts