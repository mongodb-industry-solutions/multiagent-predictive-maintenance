#!/usr/bin/env bash
# Build the AWS Lambda container image and push it to Amazon ECR.
#
# Usage:
#   AWS_REGION=us-east-1 ./scripts/build-and-push.sh [tag]
#
# Prints the fully-qualified image URI on success so it can be piped into
# deploy-lambda.sh.
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
REPO="${ECR_REPO:-predictive-maintenance}"
TAG="${1:-latest}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE="${ECR}/${REPO}:${TAG}"

# Build from the repository root using the Lambda-specific Dockerfile.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERFILE="${ROOT_DIR}/Dockerfile.lambda"

# Ensure the ECR repository exists.
aws ecr describe-repositories --repository-names "$REPO" --region "$AWS_REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$REPO" --region "$AWS_REGION" >/dev/null

# Authenticate Docker to ECR.
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR"

# Lambda runs images on linux/amd64 (change to arm64 if the function uses it).
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --sbom=false \
  --file "$DOCKERFILE" \
  -t "${REPO}:${TAG}" \
  --load \
  "$ROOT_DIR"
docker tag "${REPO}:${TAG}" "$IMAGE"
docker push "$IMAGE"

echo "$IMAGE"
