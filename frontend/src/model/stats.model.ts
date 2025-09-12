import { Game } from './game.model';

export class Stats {
	stat_index?: number;
	nickname?: string;
	addGame?: (game: Game, options?: any) => Promise<void>;
	games?: Game[];
	number_of_games?: number;
	number_of_wins?: number;
	number_of_losses?: number;
	number_of_draws?: number;
	number_of_points?: number;
	number_of_tournaments_won?: number;
	average_score?: number;
	percentage_wins?: number;
	percentage_losses?: number;
	percentage_draws?: number;
};
