#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Load environment variables from .env file
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
  echo "=== Loading environment from .env ==="
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "WARNING: No .env file found at $ENV_FILE"
  echo "Copy .env.example to .env and fill in your values."
fi

echo "=== Building FrontEnd + SaatSaheli ==="
./mvnw clean install -DskipTests

echo ""
echo "=== Starting SaatSaheli on port 8081 ==="
./mvnw spring-boot:run -pl ../SaatSaheli
