#!/usr/bin/env bash

export PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')

echo "Deploying Glint Cluster ${PACKAGE_VERSION} to npm"
npm publish

echo "Building Glint Master ${PACKAGE_VERSION}"
docker build -f Dockerfile.master -t quay.io/glint/glint-cluster-master:latest -t quay.io/glint/glint-cluster-master:$PACKAGE_VERSION .

echo "Building Glint Worker ${PACKAGE_VERSION}"
docker build -f Dockerfile.worker -t quay.io/glint/glint-cluster-worker:latest -t quay.io/glint/glint-cluster-worker:$PACKAGE_VERSION .

echo "Pushing Glint Master ${PACKAGE_VERSION} to quay.io"
docker push quay.io/glint/glint-cluster-master:$PACKAGE_VERSION

echo "Pushing Glint Master Latest to quay.io"
docker push quay.io/glint/glint-cluster-master:latest

echo "Pushing Glint Worker ${PACKAGE_VERSION} to quay.io"
docker push quay.io/glint/glint-cluster-worker:$PACKAGE_VERSION

echo "Pushing Glint Worker Latest to quay.io"
docker push quay.io/glint/glint-cluster-worker:latest
