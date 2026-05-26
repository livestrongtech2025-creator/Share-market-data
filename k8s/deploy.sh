#!/bin/bash
set -euo pipefail

NAMESPACE="nse-analytics"
REGISTRY="${REGISTRY:-localhost:5000}"
TAG="${TAG:-latest}"

echo "🚀 Deploying NSE Analytics Platform to Kubernetes..."

# Build and push images
echo "📦 Building Docker images..."
docker build -t $REGISTRY/nse-backend:$TAG ./backend
docker build -t $REGISTRY/nse-frontend:$TAG ./frontend
docker build -t $REGISTRY/nse-ai-service:$TAG ./ai-service

echo "⬆️  Pushing images..."
docker push $REGISTRY/nse-backend:$TAG
docker push $REGISTRY/nse-frontend:$TAG
docker push $REGISTRY/nse-ai-service:$TAG

# Apply k8s configs
echo "☸️  Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

echo "⏳ Waiting for databases..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=60s

kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/ai-service.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

echo "⏳ Waiting for deployments..."
kubectl rollout status deployment/backend -n $NAMESPACE
kubectl rollout status deployment/frontend -n $NAMESPACE
kubectl rollout status deployment/ai-service -n $NAMESPACE

echo "✅ Deployment complete!"
kubectl get pods -n $NAMESPACE
