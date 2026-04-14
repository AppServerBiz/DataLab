#!/bin/bash
set -e  # Para automaticamente se qualquer comando falhar

# --- CARREGAR VARIÁVEIS DE AMBIENTE ---
if [ -f ../.env ]; then
    export $(cat ../.env | xargs)
elif [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "✗ Erro: Arquivo .env não encontrado!"
    exit 1
fi

# --- CONFIGURAÇÕES DO SAAS ---
DOMAIN="${DOMAIN:-nautilusinvesting.com}"
APP_NAME="data-api"
CF_EMAIL="${CF_EMAIL}"
CF_API_KEY="${CF_API_KEY}"
CF_ZONE_ID="${CF_ZONE_ID}"
PORTAINER_TOKEN="${PORTAINER_TOKEN}"

# --- CONFIGURAÇÕES DO GERAIS ---
SSH_KEY="ssh_oracle.key"
CF_RECORD="$APP_NAME.$DOMAIN"
CF_TARGET="cloud.$DOMAIN"
REGISTRY_URL="registry.$DOMAIN"
REGISTRY_USER="${REGISTRY_USER:-admin}"
REGISTRY_PASS="${REGISTRY_PASS}"
PORTAINER_URL="https://$CF_TARGET"

# 1. Build da imagem
docker build --platform linux/arm64 -t $REGISTRY_URL/$APP_NAME:v2 .

# 2. Login (se configurou auth no Caddy)
docker login $REGISTRY_URL -u admin -p ${REGISTRY_PASS}

# 3. Push para o seu servidor
docker push $REGISTRY_URL/$APP_NAME:v2

# 4. Criar diretório remoto (se não existir)
ssh -i $SSH_KEY ubuntu@157.151.27.244 "sudo mkdir -p /opt/micro-saas/apps/$APP_NAME && sudo chown ubuntu:ubuntu /opt/micro-saas/apps/$APP_NAME"

scp -i $SSH_KEY docker-compose.yml ubuntu@157.151.27.244:/opt/micro-saas/apps/$APP_NAME/docker-compose.yml

# 5. Login no registry dentro do servidor remoto
ssh -i $SSH_KEY ubuntu@157.151.27.244 "echo ${REGISTRY_PASS} | sudo docker login $REGISTRY_URL -u admin --password-stdin"

# 6. Deploy via Portainer API
echo "→ Gerenciando Stack '$APP_NAME' via Portainer API em $PORTAINER_URL..."

# Obter ID do ambiente (endpoint) do Portainer — geralmente o local é o primeiro
ENDPOINT_ID=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" "$PORTAINER_URL/api/endpoints" | \
  python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['Id'] if data and isinstance(data, list) else '')" 2>/dev/null)

if [ -z "$ENDPOINT_ID" ]; then
  echo "✗ Erro: Não foi possível encontrar um Environment ID no Portainer. Verifique se o Portainer está inicializado."
  exit 1
fi

# Garantir que o Registry está configurado no Portainer para poder baixar as imagens
echo "→ Verificando se o Registry '$REGISTRY_URL' está no Portainer..."
REGISTRY_EXISTS=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" "$PORTAINER_URL/api/registries" | \
  python3 -c "import sys,json; data=json.load(sys.stdin); print(any(r.get('URL') == '$REGISTRY_URL' for r in data if isinstance(data, list)))" 2>/dev/null)

if [ "$REGISTRY_EXISTS" != "True" ]; then
  echo "→ Registry não encontrado no Portainer. Adicionando..."
  curl -s -X POST "$PORTAINER_URL/api/registries" \
    -H "X-API-Key: $PORTAINER_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"Name\": \"Micro-SaaS Registry\",
      \"Type\": 3,
      \"URL\": \"$REGISTRY_URL\",
      \"Authentication\": true,
      \"Username\": \"$REGISTRY_USER\",
      \"Password\": \"$REGISTRY_PASS\"
    }" > /dev/null
fi

# Obter ID da Stack (se existir)
STACK_LIST=$(curl -s -X GET "$PORTAINER_URL/api/stacks" -H "X-API-Key: $PORTAINER_TOKEN")
STACK_ID=$(echo "$STACK_LIST" | python3 -c "import sys,json; next((print(s['Id']) for s in json.load(sys.stdin) if s.get('Name') == '$APP_NAME'), None)" 2>/dev/null)

# Ler conteúdo do docker-compose.yml para enviar no payload
COMPOSE_CONTENT=$(cat docker-compose.yml | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

if [ -n "$STACK_ID" ] && [ "$STACK_ID" != "None" ]; then
  echo "→ Stack '$APP_NAME' encontrada (ID: $STACK_ID). Atualizando no Environment $ENDPOINT_ID..."
  RESULT=$(curl -s -X PUT "$PORTAINER_URL/api/stacks/$STACK_ID?endpointId=$ENDPOINT_ID" \
    -H "X-API-Key: $PORTAINER_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"stackFileContent\": $COMPOSE_CONTENT,
      \"pullImage\": true,
      \"prune\": true
    }")
else
  echo "→ Stack '$APP_NAME' não encontrada. Criando nova stack no Environment $ENDPOINT_ID..."
  RESULT=$(curl -s -X POST "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID" \
    -H "X-API-Key: $PORTAINER_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"name\": \"$APP_NAME\",
      \"stackFileContent\": $COMPOSE_CONTENT
    }")
fi

# Verificar sucesso (Portainer retorna um objeto com 'Id' em caso de sucesso)
STACK_CHECK=$(echo "$RESULT" | python3 -c "import sys,json; data=json.load(sys.stdin); print('Id' in data or 'ID' in data)" 2>/dev/null)

if [ "$STACK_CHECK" != "True" ]; then
  echo "✗ Erro no Portainer API:"
  echo "$RESULT" | python3 -m json.tool || echo "$RESULT"
  exit 1
else
  echo "✓ Stack '$APP_NAME' processada com sucesso via Portainer."
fi

# 6. Criar entrada no Caddyfile para o novo app (se não existir)
ssh -i $SSH_KEY ubuntu@157.151.27.244 "grep -q '$CF_RECORD' /opt/micro-saas/caddy/Caddyfile || printf '\n$CF_RECORD {\n    reverse_proxy $APP_NAME:3001\n}\n' | sudo tee -a /opt/micro-saas/caddy/Caddyfile"

# 7. Recarregar Caddy
ssh -i $SSH_KEY ubuntu@157.151.27.244 "sudo docker exec -w /etc/caddy caddy_proxy caddy reload"

# 8. Verificar se o app está rodando
ssh -i $SSH_KEY ubuntu@157.151.27.244 "sudo docker ps | grep $APP_NAME"

# 9. Criar entrada DNS CNAME no Cloudflare (se não existir)
echo "→ Verificando se o registro $CF_RECORD já existe..."
CF_CHECK=$(curl --max-time 15 -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records?type=CNAME&name=$CF_RECORD" \
  -H "X-Auth-Email: $CF_EMAIL" \
  -H "X-Auth-Key: $CF_API_KEY" \
  -H "Content-Type: application/json")

# Verifica erro de autenticação antes de prosseguir
CF_SUCCESS=$(echo "$CF_CHECK" | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])" 2>/dev/null)
if [ "$CF_SUCCESS" != "True" ]; then
  echo "✗ Erro de autenticação na API Cloudflare:"
  echo "$CF_CHECK" | python3 -m json.tool
  exit 1
fi

EXISTING=$(echo "$CF_CHECK" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['result']))" 2>/dev/null)
EXISTING="${EXISTING:-0}"

if [ "$EXISTING" -gt "0" ]; then
  echo "✓ Registro DNS '$CF_RECORD' já existe. Nenhuma ação necessária."
else
  echo "→ Criando CNAME $CF_RECORD → $CF_TARGET..."
  RESULT=$(curl --max-time 15 -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
    -H "X-Auth-Email: $CF_EMAIL" \
    -H "X-Auth-Key: $CF_API_KEY" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"CNAME\",\"name\":\"$CF_RECORD\",\"content\":\"$CF_TARGET\",\"ttl\":1,\"proxied\":true}")
  SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['success'])" 2>/dev/null)
  if [ "$SUCCESS" = "True" ]; then
    echo "✓ Registro DNS criado com sucesso: $CF_RECORD → $CF_TARGET"
  else
    echo "✗ Erro ao criar registro DNS:"
    echo "$RESULT" | python3 -m json.tool
    exit 1
  fi
fi