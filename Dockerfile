FROM node:12

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

RUN sed -i -e 's/tempData: { .* },//g' src/controllers/authentication.controller.ts
RUN sed -i -e "s/to: 'dmytakis@gmail.com', \/\/ Dev//g" src/controllers/authentication.controller.ts
RUN sed -i -e "s/\/\/to: data.user.email, \/\/ Prod/to: data.user.email,/g" src/controllers/authentication.controller.ts

RUN npx webpack

EXPOSE 3000

CMD [ "node", "dist/App.js" ]
