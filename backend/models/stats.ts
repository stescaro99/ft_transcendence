import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';
import Game from './game';

class Stats extends Model {
	public stat_index!: number;
	public nickname!: string;
	public addGame!: (game: Game, options?: any) => Promise<void>;
	public games?: Game[];
	public number_of_games?: number;
	public number_of_wins?: number;
	public number_of_losses?: number;
	public number_of_draws?: number;
	public number_of_points?: number;
	public number_of_tournaments_won?: number;
	public average_score?: number;
	public percentage_wins?: number;
	public percentage_losses?: number;
	public percentage_draws?: number;
};

Stats.init(
	{
		stat_index: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
		},
		nickname:{
			type: DataTypes.STRING,
			allowNull: false,
		},
		number_of_games: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0,
		},
		number_of_wins: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0,
		},
		number_of_losses: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0,
		},
		number_of_draws: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0,
		},
		number_of_points: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0,
		},
		number_of_tournaments_won: {
			type: DataTypes.INTEGER,
			allowNull: true,
			defaultValue: 0,
		},
		average_score: {
			type: DataTypes.FLOAT,
			allowNull: true,
			defaultValue: 0.0,
		},
		percentage_wins: {
			type: DataTypes.FLOAT,
			allowNull: true,
			defaultValue: 0.0,
		},
		percentage_losses: {
			type: DataTypes.FLOAT,
			allowNull: true,
			defaultValue: 0.0,
		},
		percentage_draws: {
			type: DataTypes.FLOAT,
			allowNull: true,
			defaultValue: 0.0,
		}
	},
	{
		sequelize,
		modelName: 'Stats',
		tableName: 'stats',
	}
);

// A stats entry can be associated with many games and a game can be associated with
// many stats (both players' stats). Use belongsToMany on both models with an
// explicit through table `game_stats` where `game_id` and `stat_index` are the
// composite keys.
(Stats as any).belongsToMany(Game, {
	through: 'game_stats',
	foreignKey: 'stat_index', // column in game_stats that references stats.stat_index
	otherKey: 'game_id', // column in game_stats that references games.game_id
	as: 'games',
});

(Game as any).belongsToMany(Stats, {
	through: 'game_stats',
	foreignKey: 'game_id', 
	otherKey: 'stat_index', 
	as: 'stats',
});

export default Stats;
