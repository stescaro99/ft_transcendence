// Configurazione dinamica che usa i domini configurati nel browser
const getApiUrl = (): string => {
  // Per il multiplayer e le API usiamo sempre il dominio configurato
  // Il browser deve risolvere transcendence.be tramite /etc/hosts
  return 'https://transcendence.be:9443/api';
};

const getWsUrl = (): string => {
  const hostId = getHostId();
  return `wss://${hostId}:9443/ws`;
};

const getHostId = (): string => {
  if (typeof window !== 'undefined' && (window as any).__HOST_ID__) {
    return (window as any).__HOST_ID__;
  }
  return 'localhost';
};

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  hostId: getHostId()
}