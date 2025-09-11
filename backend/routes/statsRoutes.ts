import { FastifyInstance } from "fastify";
import { updateStats, getStats, winTournament } from "../controllers/statsController";
import { statsSchema } from "../schemas/statsSchema";
import { gameSchema } from "../schemas/gameSchema";
import { verifyJWT } from "../utils/jwt";

export default async function (server: FastifyInstance) {
	server.put('/update_stats', {
		preHandler: verifyJWT,
		schema: {
			body: {
				type: 'object',
				required: ['nickname', 'game_id', 'result', 'index'],
				properties: {
					nickname: { type: 'string' },
					game_id: { type: 'integer' },
					result: { type : 'integer' },
					index: { type : 'integer' }
				},
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						stats: statsSchema,
					},
				},
			},
			tags: ['Stats']
		},
	}, updateStats)

	server.put('/win_tournament', {
		preHandler: verifyJWT,
		schema: {
			body: {
				type: 'object',
				required: ['nickname', 'index'],
				properties: {
					nickname: { type: 'string' },
					index: { type : 'integer' }
				},
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						stats: statsSchema,
					},
				},
			},
			tags: ['Stats']
		},
	}, winTournament)

	server.get('/get_stats', {
		schema: {
			querystring: {
				type: 'object',
				required: ['nickname', 'index'],
				properties: {
					nickname: { type: 'string' },
					index: { type: 'integer' }
				},
			},
			response: {
				200: {
					type: 'object',
					properties: {
						stats: statsSchema,
					},
				},
			},
			tags: ['Stats']
		},
	}, getStats)
};
