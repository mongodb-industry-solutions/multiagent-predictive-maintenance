#!/usr/bin/env bash
# Create or update the Lambda function (container image) and expose it through
# a Function URL with response streaming enabled.
#
# Usage:
#   AWS_REGION=us-east-1 \
#   LAMBDA_ROLE_ARN=arn:aws:iam::<acct>:role/<lambda-exec-role> \
#   ./aws-lambda-deploy/deploy-lambda.sh [tag]
#
# Secrets (MONGODB_URI, GROVE_API_KEY, VOYAGE_API_KEY) are intentionally NOT
# passed here. Configure them via Secrets Manager / SSM or set them once in the
# console so they never land in shell history or logs.
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
REPO="${ECR_REPO:-predictive-maintenance}"
FN="${FUNCTION_NAME:-predictive-maintenance}"
TAG="${1:-latest}"
ROLE_ARN="${LAMBDA_ROLE_ARN:?set LAMBDA_ROLE_ARN to the Lambda execution role ARN}"
TIMEOUT="${LAMBDA_TIMEOUT:-300}"
MEMORY="${LAMBDA_MEMORY:-2048}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
IMAGE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO}:${TAG}"

# Non-secret configuration. Note: AWS_PROFILE is intentionally omitted so the
# Bedrock SDK falls back to the Lambda execution role.
ENV_VARS="Variables={DATABASE_NAME=agentic_predictive_maintenance,\
COMPLETION_MODEL=gpt-5.6-luna,\
EMBEDDING_MODEL=voyage-4-lite,EMBEDDING_DIMENSIONS=1024,\
CHAT_PROVIDER=grove,EMBEDDING_PROVIDER=voyage}"

if aws lambda get-function --function-name "$FN" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "Updating existing function code..."
  aws lambda update-function-code --function-name "$FN" \
    --image-uri "$IMAGE" --region "$AWS_REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FN" --region "$AWS_REGION"

  echo "Updating function configuration..."
  aws lambda update-function-configuration --function-name "$FN" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "$ENV_VARS" --region "$AWS_REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FN" --region "$AWS_REGION"
else
  echo "Creating new function..."
  aws lambda create-function --function-name "$FN" \
    --package-type Image --code ImageUri="$IMAGE" \
    --role "$ROLE_ARN" --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "$ENV_VARS" --region "$AWS_REGION" >/dev/null
  aws lambda wait function-active --function-name "$FN" --region "$AWS_REGION"
fi

# Function URL with response streaming (HTTPS, no port needed; bypasses the
# API Gateway response buffering that would break NDJSON streaming).
echo "Configuring streaming Function URL..."
aws lambda create-function-url-config --function-name "$FN" \
  --auth-type NONE --invoke-mode RESPONSE_STREAM --region "$AWS_REGION" >/dev/null 2>&1 \
  || aws lambda update-function-url-config --function-name "$FN" \
     --auth-type NONE --invoke-mode RESPONSE_STREAM --region "$AWS_REGION" >/dev/null

# Allow public invocation of the Function URL (harmless if it already exists).
aws lambda add-permission --function-name "$FN" \
  --statement-id FunctionURLAllowPublic --action lambda:InvokeFunctionUrl \
  --principal "*" --function-url-auth-type NONE --region "$AWS_REGION" >/dev/null 2>&1 || true

echo "Function URL:"
aws lambda get-function-url-config --function-name "$FN" \
  --query FunctionUrl --output text --region "$AWS_REGION"
