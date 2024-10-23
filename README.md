# Zerops startCommands example

Zerops containers are based on [Incus](https://linuxcontainers.org/incus/introduction/) containers, placing them
at a midpoint between containerized processes (e.g., Docker) and full-fledged VMs (e.g., Proxmox).
This architecture allows Zerops to easily run multiple processes within a single container.

This example shows how to run Node.js application that uses SQLite along with [Litestream](https://litestream.io/),
to persist the database throughout deployments.

### [zerops.yml](https://github.com/zeropsio/start-commands-example/blob/main/zerops.yml)
```yaml
zerops:
  - setup: api
    build:
      base: nodejs@20
      prepareCommands:
        - npm install -g typescript
      buildCommands:
        - npm i
        - npm run build
      deployFiles:
        - ./dist
        - ./node_modules
        - ./package.json
        - ./litestream.yml
    run:
      base: nodejs@20
      # here we install litestream, downloading the packed
      # binary for Alpine (the default OS used for Zerops containers)
      # unpacking it and moving it to bin
      prepareCommands:
        - wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz
        - tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
        - rm litestream-v0.3.13-linux-amd64.tar.gz
        - mv litestream /usr/local/bin/
      ports:
        - port: 3000
          httpSupport: true
      # for convinience, we save the name of our database file
      # to environment variables
      envVariables:
        NODE_ENV: production
        DB_NAME: database.db
      # here instead of standard `start` property, we use `startCommands`
      # which allows us to define multiple commands (both start and init)
      # as well as name the set, to allow for convinient filtering in runtime logs
      startCommands:
        # start the application
        - command: npm run start:prod
          name: server
        # start the replication
        - command: litestream replicate -config=litestream.yml
          name: replication
          # restore the database on container init
          initCommands:
            - litestream restore -if-replica-exists -if-db-not-exists -config=litestream.yml $DB_NAME
      healthCheck:
        httpGet:
          port: 3000
          path: /status
```


### [litestream.yml](https://github.com/zeropsio/start-commands-example/blob/main/litestream.yml)
Litestream configuration file. Litestream automatically replaces
environment varibles, so we make use of the env variables Zerops
automatically generates for our object storage service.

```yaml
access-key-id: $storage_accessKeyId
secret-access-key: $storage_secretAccessKey

dbs:
  - path: $DB_NAME
    replicas:
      - type: s3
        path: $DB_NAME
        bucket: $storage_bucketName
        endpoint: $storage_apiUrl
        force-path-style: true
```

## Test it yourself
Import this project to your Zerops account.

```yaml
project:
  name: start-commands-example

services:
  - hostname: storage
    type: object-storage
    objectStorageSize: 2

  - hostname: api
    type: nodejs@20
    buildFromGit: https://github.com/zeropsio/start-commands-example
    enableSubdomainAccess: true
```

Filter logs in Zerops GUI
<img width="1647" alt="image" src="https://github.com/user-attachments/assets/5710a157-3b5d-4f6a-ad17-a8c20669d1fb">

