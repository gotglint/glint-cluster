# Glint Cluster

## Using the Docker Containers

```bash
export PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')

docker build -f Dockerfile.master -t glint/glint-cluster-master:$PACKAGE_VERSION .
docker build -f Dockerfile.worker -t glint/glint-cluster-worker:$PACKAGE_VERSION .

docker run --network=host -p 45468:45468 glint/glint-cluster-master:$PACKAGE_VERSION
docker run --network=host glint/glint-cluster-worker:$PACKAGE_VERSION
```

## Using Docker Compose

```bash
docker-compose up
```
