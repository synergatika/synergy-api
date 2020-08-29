FROM node:12 AS base
WORKDIR /usr/src/app
EXPOSE 3000

FROM base AS build
COPY package*.json ./
RUN npm install
COPY . .

RUN sed -i -e 's/tempData: { .* },//g' src/controllers/authentication.controller.ts
RUN sed -i -e "s/to: 'dmytakis@gmail.com', \/\/ Dev//g" src/controllers/authentication.controller.ts
RUN sed -i -e "s/\/\/to: data.user.email, \/\/ Prod/to: data.user.email,/g" src/controllers/authentication.controller.ts

RUN npx webpack

FROM base AS final
WORKDIR /app

COPY --from=build /usr/src/app/node_modules node_modules
COPY --from=build /usr/src/app/dist dist

CMD [ "node", "dist/App.js" ]
