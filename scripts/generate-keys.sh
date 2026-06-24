#!/bin/bash
set -e

echo "Generating RSA key pair for NEOS..."
mkdir -p src/keys
openssl genrsa -out src/keys/private.key 2048
openssl rsa -in src/keys/private.key -pubout -out src/keys/public.key
echo "Keys generated successfully at src/keys/"