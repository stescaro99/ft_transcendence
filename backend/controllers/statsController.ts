import { FastifyRequest, FastifyReply } from 'fastify';
import User from '../models/user';
import Game from '../models/game';
import Stats from '../models/stats';
import sequelize from '../db';

export async function updateStats(request: FastifyRequest, reply: FastifyReply) {
	const { nickname, game_id, result, index } = request.body as { 
		nickname: string; 
		game_id: number;
		result: number; // 0: loss, 1: draw, 2: win
		index: number; // 0: pong, 1: game2
	};

	try {
		const user = await User.findOne({ 
			where: { nickname },
			include: [{ model: Stats, as: 'stats' }]
		});
		if (!user) {
			return reply.code(404).send({ message: 'User not found' });
		}

		let statsArray = user.stats as Stats[];
		let userStat = statsArray?.[index];
		if (!userStat) {
			// Auto-create missing stats for this user (useful for OAuth users created without stats)
			const existing = await Stats.findAll({ where: { nickname } });
			if (existing.length < 2) {
				const needed = 2 - existing.length;
				const created: Stats[] = [];
				for (let i = 0; i < needed; i++) {
					created.push(await Stats.create({ nickname }));
				}
				await (user as any).setStats([...existing, ...created]);
			}
			await user.reload({ include: [{ model: Stats, as: 'stats' }] });
			statsArray = user.stats as Stats[];
			userStat = statsArray?.[index];
			if (!userStat) {
				return reply.code(404).send({ message: 'Stats not found for given index' });
			}
		}
		const game = await Game.findOne({ where: { game_id } });
		if (!game) {
			return reply.code(404).send({ message: 'Game not found' });
		}

		// Verifica che il nickname sia effettivamente un partecipante della partita
		const playerIndex = Array.isArray(game.players) ? game.players.indexOf(nickname) : -1;
		if (playerIndex < 0) {
			return reply.code(400).send({ message: 'Nickname is not a participant of this game' });
		}

		// Associa la partita alle statistiche dell'utente solamente se è effettivamente partecipante
		await userStat.addGame(game);
		userStat.number_of_games = (userStat.number_of_games || 0) + 1;
		switch (result) {
			case 0:
				userStat.number_of_losses = (userStat.number_of_losses || 0) + 1;
				break;
			case 1:
				userStat.number_of_draws = (userStat.number_of_draws || 0) + 1;
				break;
			case 2:
				userStat.number_of_wins = (userStat.number_of_wins || 0) + 1;
				break;
			case 3:
				userStat.number_of_tournaments_won = (userStat.number_of_tournaments_won || 0) + 1;
				userStat.number_of_wins = (userStat.number_of_wins || 0) + 1;
				break;
			default:
				return reply.code(400).send({ message: 'Invalid result value' });
		}
		if (Array.isArray(game.scores)) {
			userStat.number_of_points = (userStat.number_of_points || 0) + (game.scores[playerIndex] || 0);
		} else {
			userStat.number_of_points = (userStat.number_of_points || 0);
		}

		userStat.average_score = (userStat.number_of_points || 0) / userStat.number_of_games;
		userStat.percentage_wins = (userStat.number_of_wins || 0) / userStat.number_of_games;
		userStat.percentage_losses = (userStat.number_of_losses || 0) / userStat.number_of_games;
		userStat.percentage_draws = (userStat.number_of_draws || 0) / userStat.number_of_games;
		await userStat.save();
		reply.code(200).send({ message: 'Stats updated!', stats: userStat });
	} catch (error) {
		console.error('Error updating stats:', error);
		reply.code(500).send({ message: 'Failed to update stats', error });
	}
}

export async function winTournament(request: FastifyRequest, reply: FastifyReply) {
	const { nickname, index } = request.body as { nickname: string; index: number };
	
	try {
		const user = await User.findOne({
			where: { nickname },
			include: [{ model: Stats, as: 'stats' }]
		});
		if (!user) {
			return reply.code(404).send({ message: 'User not found' });
		}
		const statsArray = user.stats as Stats[];
		const userStat = statsArray[index];
		if (!userStat) {
			return reply.code(404).send({ message: 'Stats not found for given index' });
		}
		userStat.number_of_tournaments_won = (userStat.number_of_tournaments_won || 0) + 1;
		await userStat.save();
		reply.code(200).send({ message: 'Tournament win recorded!', stats: userStat });
	}
	catch (error) {
		console.error('Error recording tournament win:', error);
		reply.code(500).send({ message: 'Failed to record tournament win', error });
	}
}

export async function getStats(request: FastifyRequest, reply: FastifyReply) {
	const { nickname, index } = request.query as { nickname: string, index: number };

	try {
		const user = await User.findOne({
			where: { nickname },
			include: [{ model: Stats, as: 'stats' }]
		});
		if (!user) {
			return reply.code(404).send({ message: 'User not found' });
		}
		const statsArray = user.stats as Stats[];
		const userStat = statsArray[index];
		if (!userStat) {
			return reply.code(404).send({ message: 'Stats not found for given index' });
		}
		reply.code(200).send({ stats: userStat });
	} catch (error) {
		console.error('Error fetching stats:', error);
		reply.code(500).send({ message: 'Failed to fetch stats', error });
	}
}

