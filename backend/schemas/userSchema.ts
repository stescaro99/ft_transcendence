import { statsSchema } from "./statsSchema";

export const userSchema = {
	type: 'object',
	properties: {
		user_id: { type: 'integer' },
		//name: { type: 'string' },
		//surname: { type: 'string' },
		nickname: { type: 'string' },
		//email: { type: 'string' },
		language: { type: 'string' },
		image_url: { type: 'string' },
		online: { type: 'boolean' },
		tfa_code: { type: 'string' },
		last_seen: { type: 'string', format: 'date-time' },
		current_room: { type: 'string' },
		friends: {
			type: 'array',
			items: { type: 'string' }
		},
		fr_request: {
			type: 'array',
			items: { type: 'string' }
		},
		stats: {
			type: 'array',
			items: statsSchema
		}
	}
};