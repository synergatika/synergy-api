#!/usr/bin/env sh

sudo apt install g++-7

docker run -d -p 27017:27017 mongo

export CXX="g++-7"

git clone https://github.com/synergatika/loyalty-contracts.git contracts

cd contracts

npm install -g ganache-cli truffle
npm install

ganache-cli -l 100000000 -m "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" > /dev/null &
TESTRPC_PID=$!
trap "kill $TESTRPC_PID" EXIT INT TERM

truffle compile
truffle migrate

cd ..

npm install
npx webpack
node ./dist/App.js &

npx mocha --timeout 30000 -b -r ts-node/register ./test/*.test.ts

sed -i -e 's/tempData: { .* },//g' src/controllers/authentication.controller.ts
