#!/usr/bin/env sh

docker run -d -p 27017:27017 mongo

npm install
npx webpack
node ./dist/App.js &

npx mocha --timeout 30000 -b -r ts-node/register ./test/*.test.ts
