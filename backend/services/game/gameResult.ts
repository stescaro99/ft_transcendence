import Game from '../../models/game';
import Stats from '../../models/stats';
import { GameRoom } from './types';

export interface SaveResultOptions {
  winnerSide: 'left' | 'right';
  winnerNicknames: string[];
  loserNicknames: string[];
  reason: 'normalEnd' | 'playerDisconnection';
  isDisconnectionWin?: boolean;
}

/**
 * Salva il risultato partita e aggiorna le statistiche base (indice 0) dei giocatori coinvolti.
 * - Crea record Game (finished)
 * - Aggiorna/crea Stats (numero partite, win/loss, punti, medie)
 */
export async function saveGameAndStats(room: GameRoom, opts: SaveResultOptions): Promise<void> {
  try {
    const finalScores: [number, number] = [room.gameState.scoreLeft, room.gameState.scoreRight];
    const allPlayers = room.players.map(p => p.nickname).filter(n => !!n);

    const gameRecord = await (Game as any).create({
      players: allPlayers,
      scores: finalScores,
      winner_nickname: opts.winnerNicknames.join(', '),
      game_status: 'finished',
      date: new Date()
    });

    for (const nickname of allPlayers) {
      // carica/crea stats (entry 0)
      let statsEntries = await (Stats as any).findAll({ where: { nickname } });
      if (statsEntries.length === 0) {
        statsEntries = [ await (Stats as any).create({ nickname }) ];
      }
      const stat = statsEntries[0];
      stat.number_of_games = (stat.number_of_games || 0) + 1;
      const isWinner = opts.winnerNicknames.includes(nickname);
      if (isWinner) {
        stat.number_of_wins = (stat.number_of_wins || 0) + 1;
      } else {
        stat.number_of_losses = (stat.number_of_losses || 0) + 1;
      }
      // punti assegnati in base al lato
      // Trova se il player è lato sinistro guardando paddles
      const leftNames = room.gameState.leftPaddle.map(p => p.nickname).filter(n => !!n);
      const playerIsLeft = leftNames.includes(nickname);
      const earnedPoints = playerIsLeft ? finalScores[0] : finalScores[1];
      stat.number_of_points = (stat.number_of_points || 0) + (earnedPoints || 0);
      stat.average_score = (stat.number_of_points || 0) / stat.number_of_games;
      stat.percentage_wins = (stat.number_of_wins || 0) / stat.number_of_games;
      stat.percentage_losses = (stat.number_of_losses || 0) / stat.number_of_games;
      stat.percentage_draws = (stat.number_of_draws || 0) / stat.number_of_games;
      await stat.save();
    }

    console.log(`[GameResult] Saved game ${gameRecord.game_id} - reason=${opts.reason} disconnection=${!!opts.isDisconnectionWin}`);
  } catch (error) {
    console.error('[GameResult] Error saving game & stats:', error);
  }
}
