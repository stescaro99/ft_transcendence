const getApiUrl = (): string => {
  /*// Se la chiamata è per Google OAuth, usa transcendence.be
  if (typeof window !== 'undefined' && window.location.pathname.includes('google')) {
    return 'https://transcendence.be:9443/api';
  }
  // Altrimenti usa HOST_ID*/
  const hostId = getHostId();
  return `https://${hostId}:9443/api`;
};

const getWsUrl = (): string => {
  // Use the configured host id so the WS endpoint follows HOST_ID:9443
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
  production: false,
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),
  hostId: getHostId()
}