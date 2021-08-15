FROM node:16 as builder
RUN apt-update; \
    apt-upgrade -y; \
    apt install git;
WORKDIR /build
COPY package.json package-lock.json /build/
RUN npm install

FROM node:16 as runner
WORKDIR /srv
COPY --from=builder /build /srv
COPY index.js /srv/index.js

CMD ["npm", "start"]