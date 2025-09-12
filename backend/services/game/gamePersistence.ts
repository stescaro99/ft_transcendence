import Game from '../../models/game';
import { GameRoom } from './types';

export async function createGameRecord(room: GameRoom): Promise<number> {
  const allPlayers = room.players.map(p => p.nickname).filter((n: any) => !!n);
  const gameRecord = await (Game as any).create({
    players: allPlayers,
    scores: [0, 0],
    game_status: 'pending',
    date: new Date()
  });
  return gameRecord.game_id;
}

export async function updateGameScores(gameId: number, scores: [number, number]): Promise<void> {
  try {
    const game = await (Game as any).findOne({ where: { game_id: gameId } });
    if (!game) return;
    await game.update({ scores });
    await game.save();
  } catch (error) {
    console.error('[GamePersistence] Error updating scores:', error);
  }
}

export async function finalizeGameRecord(gameId: number, finalScores: [number, number], winnerNickname: string | null): Promise<void> {
  try {
    const game = await (Game as any).findOne({ where: { game_id: gameId } });
    if (!game) return;
    await game.update({ scores: finalScores, winner_nickname: winnerNickname || '', game_status: 'finished' });
    await game.save();
  } catch (error) {
    console.error('[GamePersistence] Error finalizing game record:', error);
  }
}
