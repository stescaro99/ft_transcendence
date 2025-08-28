#!/bin/bash

echo "==================================="
echo "🚀 ft_transcendence Setup & Launch"
echo "==================================="

# Controlla se il file .env esiste
if [ ! -f .env ]; then
    echo "❌ File .env non trovato!"
    exit 1
fi

# Leggi HOST_ID dal file .env
HOST_ID=$(grep '^HOST_ID=' .env | cut -d '=' -f2)

if [ -z "$HOST_ID" ]; then
    echo "❌ HOST_ID non trovato nel file .env!"
    exit 1
fi

echo "📋 Configurazione rilevata:"
echo "   HOST_ID: $HOST_ID"
echo "   Backend: https://transcendence.be:9443 (https://$HOST_ID:9443)"
echo "   Frontend: https://transcendence.fe:8443 (https://$HOST_ID:8443)"
echo ""

# Controlla se i certificati esistono
if [ ! -f frontend/cert/cert.pem ] || [ ! -f frontend/cert/key.pem ]; then
    echo "❌ Certificati SSL non trovati in frontend/cert/"
    echo "   Assicurati che cert.pem e key.pem esistano"
    exit 1
fi

echo "✅ Certificati SSL trovati"

# Gestione entries nel file /etc/hosts (rimuovi SEMPRE righe con entrambi i domini e riscrivi)

# Filtra tutte le righe che contengono entrambi i domini (in qualunque ordine) e riscrive
TMP_FILE=$(mktemp)
awk '!( ($0 ~ /transcendence\.be/) && ($0 ~ /transcendence\.fe/) )' /etc/hosts > "$TMP_FILE"
echo "$HOST_ID transcendence.be transcendence.fe" >> "$TMP_FILE"
sudo cp "$TMP_FILE" /etc/hosts
rm -f "$TMP_FILE"

echo "✅ /etc/hosts aggiornato con: $HOST_ID transcendence.be transcendence.fe"

echo ""
echo "🐳 Avviando i container Docker..."
echo ""

# Stop e rimuovi container esistenti
docker-compose down

# Build e avvia i nuovi container
docker-compose up --build -d

echo ""
echo "🎉 Avvio completato!"
echo ""
echo "🌐 Accedi tramite:"
echo "   Frontend: https://transcendence.fe:8443"
echo "   Backend API: https://transcendence.be:9443/api"
echo ""
echo "📡 Per WebSocket (multiplayer):"
echo "   wss://transcendence.be:9443/ws/game"
echo ""
