Write-Host "Generating RSA key pair for NEOS..."
New-Item -ItemType Directory -Force -Path src/keys | Out-Null
openssl genrsa -out src/keys/private.key 2048
openssl rsa -in src/keys/private.key -pubout -out src/keys/public.key
Write-Host "Keys generated successfully at src/keys/"