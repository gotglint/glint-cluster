#!/usr/bin/env bash

export PACKAGE_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')

echo "Building Glint Master ${PACKAGE_VERSION}"
docker build -f Dockerfile.master -t quay.io/glint/glint-cluster-master:$PACKAGE_VERSION .

echo "Building Glint Worker ${PACKAGE_VERSION}"
docker build -f Dockerfile.worker -t quay.io/glint/glint-cluster-worker:$PACKAGE_VERSION .

echo "Pushing Glint Master ${PACKAGE_VERSION} to quay.io"
docker push quay.io/glint/glint-cluster-master:$PACKAGE_VERSION

echo "Pushing Glint Worker ${PACKAGE_VERSION} to quay.io"
docker push quay.io/glint/glint-cluster-worker:$PACKAGE_VERSION

echo "Tagging Glint Master ${PACKAGE_VERSION} as latest on quay.io"
docker tag quay.io/glint/glint-cluster-master:$PACKAGE_VERSION quay.io/glint/glint-cluster-master:latest

echo "Tagging Glint Worker ${PACKAGE_VERSION} as latest on quay.io"
docker tag quay.io/glint/glint-cluster-worker:$PACKAGE_VERSION quay.io/glint/glint-cluster-worker:latest
