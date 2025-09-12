import Game from '../../models/game';
import Stats from '../../models/stats';
import sequelize from '../../db';
import { GameRoom } from './types';

export interface SaveResultOptions {
  winnerSide: 'left' | 'right';
  winnerNicknames: string[];
  loserNicknames: string[];
  reason: 'normalEnd' | 'playerDisconnection';
  isDisconnectionWin?: boolean;
  finalScores?: [number, number];
  gameId?: number;
}

/**
 * Salva il risultato partita e aggiorna le statistiche base (indice 0) dei giocatori coinvolti.
 * - Crea record Game (finished)
 * - Aggiorna/crea Stats (numero partite, win/loss, punti, medie)
 */
export async function saveGameAndStats(room: GameRoom, opts: SaveResultOptions): Promise<void> {
  try {
    // Prefer explicit finalScores snapshot if provided (useful when caller forces scores after snapshot)
    const finalScores: [number, number] = opts.finalScores ?? [room.gameState.scoreLeft, room.gameState.scoreRight];
    const allPlayers = room.players.map(p => p.nickname).filter(n => !!n);

  let gameRecord: any = null;
    if (opts.gameId) {
      try {
        const gid = opts.gameId;
        await (Game as any).update({ scores: finalScores, winner_nickname: opts.winnerNicknames.join(', '), game_status: 'finished' }, { where: { game_id: gid } });
        gameRecord = await (Game as any).findOne({ where: { game_id: gid } });
      } catch (err) {
        console.error('[GameResult] Error finalizing provided gameId:', err);
      }
    } else {
      gameRecord = await (Game as any).create({
        players: allPlayers,
        scores: finalScores,
        winner_nickname: opts.winnerNicknames.join(', '),
        game_status: 'finished',
        date: new Date()
      });
    }
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
      // Associate the game record with the stat so history (game_stats) is populated
      try {
        if (gameRecord) {
          // Try high-level association first
          try {
            await stat.addGame(gameRecord);
          } catch (err) {
            console.warn('[GameResult] stat.addGame failed for', nickname, err);
          }
          // Ensure pivot exists by direct insertion (sqlite: INSERT OR IGNORE)
          try {
            const res = await (sequelize as any).query(
              'INSERT OR IGNORE INTO game_stats (game_id, stat_index) VALUES (?, ?)',
              { replacements: [gameRecord.game_id, stat.stat_index] }
            );
          } catch (err) {
            console.error('[GameResult] Direct insert into game_stats failed for', nickname, err);
          }
        }
      } catch (err) {
        console.error('[GameResult] Error associating game with stat for', nickname, err);
      }

      await stat.save();
    }

  } catch (error) {
    console.error('[GameResult] Error saving game & stats:', error);
  }
}
