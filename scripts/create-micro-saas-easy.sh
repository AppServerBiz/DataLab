#!/bin/bash
set -e

# ============================================================
# CONFIGURAÇÕES
# ============================================================
DOMAIN="${DOMAIN:-}"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Função para esperar o lock do apt ser liberado
wait_for_apt() {
    echo -e "${YELLOW}Aguardando liberação do lock do apt...${NC}"
    while sudo fuser /var/lib/dpkg/lock >/dev/null 2>&1 || \
          sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || \
          sudo fuser /var/lib/dpkg/lock-frontends >/dev/null 2>&1; do
        sleep 5
    done
    echo -e "${GREEN}Apt liberado.${NC}"
}

echo -e "${BLUE}=== [SISTEMA] Iniciando Setup Micro SaaS Easy ($DOMAIN) ===${NC}\n"

# Prompt for domain if not set
if [ -z "$DOMAIN" ]; then
  read -rp "Informar o domínio: " DOMAIN
fi


# 1. Atualização do Sistema
echo -e "${YELLOW}[1/6] Atualizando pacotes do sistema...${NC}"
export DEBIAN_FRONTEND=noninteractive
wait_for_apt
sudo apt-get update -y
sudo apt-get -y -o DPkg::Options::="--force-confdef" -o DPkg::Options::="--force-confold" upgrade

# 2. Docker
echo -e "${YELLOW}[2/6] Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}Instalando Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
else
    echo -e "${GREEN}Docker já está instalado.${NC}"
fi

# 3. Node.js 20 LTS
echo -e "${YELLOW}[3/6] Verificando Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}Instalando Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    wait_for_apt
    sudo apt install -y nodejs
else
    echo -e "${GREEN}Node.js já instalado: $(node -v)${NC}"
fi

# 4. Git
echo -e "${YELLOW}[4/6] Verificando Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${GREEN}Instalando Git...${NC}"
    wait_for_apt
    sudo apt install -y git
else
    echo -e "${GREEN}Git já instalado: $(git --version)${NC}"
fi

# 5. Estrutura de Diretórios e Rede
echo -e "${YELLOW}[5/6] Configurando estrutura e rede...${NC}"
sudo mkdir -p /opt/micro-saas/caddy
sudo mkdir -p /opt/micro-saas/apps
sudo chown -R $USER:$USER /opt/micro-saas

# Verificar se a rede micro_saas já existe
if ! docker network inspect micro_saas >/dev/null 2>&1; then
    echo -e "${GREEN}Criando rede Docker 'micro_saas'...${NC}"
    docker network create --driver bridge micro_saas
else
    echo -e "${GREEN}Rede 'micro_saas' já existe.${NC}"
fi

# 6. Arquivos de Configuração
echo -e "${YELLOW}[6/6] Gerando arquivos de configuração...${NC}"

cat <<EOF > /opt/micro-saas/caddy/Caddyfile
{
	email wandey.correa@gmail.com
	acme_ca https://acme-v02.api.letsencrypt.org/directory
}

cloud.$DOMAIN {
	tls {
		protocols tls1.2 tls1.3
	}
	reverse_proxy hawklio:3000
}

EOF

cat <<'EOF' > /opt/micro-saas/docker-compose.yml
networks:
  micro_saas:
    name: micro_saas
    driver: bridge
    external: true

services:
  hawklio:
    image: wesleyfc/hawklio:latest
    container_name: hawklio
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - hawklio_data:/data
      - hawklio_config:/config
      - /var/run/docker.sock:/var/run/docker.sock
      - ./caddy/Caddyfile:/opt/micro-saas/caddy/Caddyfile
    networks:
      - micro_saas

  caddy:
    image: caddy:latest
    container_name: caddy_proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp" # Habilita HTTP/3 (performance extra)
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - micro_saas
    healthcheck:
      test: [ "CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:2019/metrics" ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  caddy_data:
  caddy_config:
  hawklio_data:
  hawklio_config:
EOF

echo -e "\n${GREEN}Iniciando os serviços...${NC}"
cd /opt/micro-saas
sudo docker compose up -d

echo -e "\n${BLUE}=== [SUCESSO] Setup concluído! ===${NC}"
echo -e "Acesse seu SaaS em: ${GREEN}https://cloud.$DOMAIN${NC}"
echo -e "Monitoramento Caddy (interno): ${BLUE}http://localhost:2019/metrics${NC}"