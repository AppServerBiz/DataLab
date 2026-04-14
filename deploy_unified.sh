#!/bin/bash
set -e

# --- CARREGAR VARIÁVEIS DE AMBIENTE ---
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "✗ Erro: Arquivo .env não encontrado!"
    exit 1
fi

# --- CONFIGURAÇÕES DO SAAS ---
DOMAIN="${DOMAIN:-nautilusinvesting.com}"
STACK_NAME="data"
CF_EMAIL="${CF_EMAIL}"
CF_API_KEY="${CF_API_KEY}"
CF_ZONE_ID="${CF_ZONE_ID}"
PORTAINER_TOKEN="${PORTAINER_TOKEN}"

# --- CONFIGURAÇÕES GERAIS ---
SSH_KEY="ssh_oracle.key"
CF_TARGET="cloud.$DOMAIN"
REGISTRY_URL="registry.$DOMAIN"
REGISTRY_USER="${REGISTRY_USER:-admin}"
REGISTRY_PASS="${REGISTRY_PASS}"
PORTAINER_URL="https://$CF_TARGET"

# 1. Build das imagens
echo "→ Building images (linux/arm64)..."
docker build --platform linux/arm64 -t $REGISTRY_URL/datalab-api:v1 ./datalab-api
docker build --platform linux/arm64 -t $REGISTRY_URL/datalab-ui:v1 ./datalab-ui

# 2. Push para o registry
echo "→ Login & Push process..."
echo "$REGISTRY_PASS" | docker login $REGISTRY_URL -u $REGISTRY_USER --password-stdin
docker push $REGISTRY_URL/datalab-api:v1
docker push $REGISTRY_URL/datalab-ui:v1

# 3. Setup Remoto & docker-compose.yml
TARGET_IP="164.152.61.174"
echo "→ Transferring docker-compose.yml to $TARGET_IP..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$TARGET_IP "sudo mkdir -p /opt/micro-saas/apps/$STACK_NAME && sudo chown ubuntu:ubuntu /opt/micro-saas/apps/$STACK_NAME"
scp -i $SSH_KEY -o StrictHostKeyChecking=no docker-compose.yml ubuntu@$TARGET_IP:/opt/micro-saas/apps/$STACK_NAME/docker-compose.yml

# 4. Deploy via Portainer API
echo "→ Triggering Portainer Stack Update..."
ENDPOINT_ID=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" "$PORTAINER_URL/api/endpoints" | \
  python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['Id'] if data and isinstance(data, list) else '')" 2>/dev/null)

if [ -z "$ENDPOINT_ID" ]; then
  echo "✗ Erro: Não foi possível encontrar um Environment ID no Portainer."
  exit 1
fi

STACK_LIST=$(curl -s -X GET "$PORTAINER_URL/api/stacks" -H "X-API-Key: $PORTAINER_TOKEN")
STACK_ID=$(echo "$STACK_LIST" | python3 -c "import sys,json; next((print(s['Id']) for s in json.load(sys.stdin) if s.get('Name') == '$STACK_NAME'), None)" 2>/dev/null)

COMPOSE_CONTENT=$(cat docker-compose.yml | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

if [ -n "$STACK_ID" ] && [ "$STACK_ID" != "None" ]; then
  echo "→ Stack '$STACK_NAME' encontrada (ID: $STACK_ID). Atualizando..."
  RESULT=$(curl -s -X PUT "$PORTAINER_URL/api/stacks/$STACK_ID?endpointId=$ENDPOINT_ID" \
    -H "X-API-Key: $PORTAINER_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"stackFileContent\": $COMPOSE_CONTENT,
      \"pullImage\": true,
      \"prune\": true
    }")
else
  echo "→ Stack '$STACK_NAME' não encontrada. Verique se o nome está correto no Portainer."
fi

# 5. Caddy & DNS
CF_RECORD="data.$DOMAIN"
echo "→ Configuring Caddy..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$TARGET_IP "grep -q '$CF_RECORD' /opt/micro-saas/caddy/Caddyfile || printf '\n$CF_RECORD {\n    reverse_proxy ui:80\n}\n' | sudo tee -a /opt/micro-saas/caddy/Caddyfile"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$TARGET_IP "sudo docker exec -w /etc/caddy caddy_proxy caddy reload"

# Final check
ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$TARGET_IP "sudo docker ps | grep datalab"

echo "✓ Unified Deploy Process Complete!"
