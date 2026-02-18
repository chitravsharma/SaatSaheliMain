#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "=== Building FrontEnd + SaatSaheli ==="
./mvnw clean install -DskipTests

echo ""
echo "=== Starting SaatSaheli on port 8081 ==="
./mvnw spring-boot:run -pl ../SaatSaheli
