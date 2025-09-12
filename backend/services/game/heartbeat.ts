import { GAME_CONSTANTS } from './types';

export class HeartbeatManager {
  private playerHeartbeats: Map<string, number> = new Map();
  private monitoringInterval: any = null;

  startHeartbeatMonitoring(onPlayerTimeout: (playerId: string) => void): void {
    if (this.monitoringInterval) {
      console.warn('Heartbeat monitoring already active');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkPlayerConnections(onPlayerTimeout);
    }, GAME_CONSTANTS.HEARTBEAT_INTERVAL);

  }

  stopHeartbeatMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  updatePlayerHeartbeat(playerId: string): void {
    this.playerHeartbeats.set(playerId, Date.now());
  }

  removePlayer(playerId: string): void {
    this.playerHeartbeats.delete(playerId);
  }

  getPlayerLastHeartbeat(playerId: string): number | undefined {
    return this.playerHeartbeats.get(playerId);
  }

  getActivePlayersCount(): number {
    return this.playerHeartbeats.size;
  }

  private checkPlayerConnections(onPlayerTimeout: (playerId: string) => void): void {
    const now = Date.now();
    const disconnectedPlayers: string[] = [];

    for (const [playerId, lastHeartbeat] of this.playerHeartbeats) {
      if (now - lastHeartbeat > GAME_CONSTANTS.HEARTBEAT_TIMEOUT) {
        disconnectedPlayers.push(playerId);
      }
    }

    disconnectedPlayers.forEach(playerId => {
      this.playerHeartbeats.delete(playerId);
      onPlayerTimeout(playerId);
    });
  }
}
