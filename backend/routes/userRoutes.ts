import { FastifyInstance } from "fastify";
import { addUser, deleteUser, getUser, updateUser, uploadImage, addFriend, getOnlineUsers, getUserWithOnlineStatus, forceOffline, forceOnline } from "../controllers/userController";
import { userSchema } from "../schemas/userSchema";
import { verifyJWT } from "../utils/jwt";

export default async function (server: FastifyInstance) {
	server.post('/force_offline', {
		preHandler: verifyJWT,
		schema: {
			body: {
				type: 'object',
				required: ['nickname'],
				properties: {
					nickname: { type: 'string' }
				}
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						user: { type: 'object' }
					}
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, forceOffline);

	server.post('/force_online', {
		preHandler: verifyJWT,
		schema: {
			body: {
				type: 'object',
				required: ['nickname'],
				properties: {
					nickname: { type: 'string' }
				}
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						user: { type: 'object' }
					}
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, forceOnline);

	server.post('/add_user', {
		schema: {
			body: {
				type: 'object',
				required: ['name', 'surname', 'nickname', 'email', 'password'],
				properties: {
					name: { type: 'string' },
					surname: { type: 'string' },
					nickname: { type: 'string' },
					email: { type: 'string' },
					password: { type: 'string' },
					language: { type: 'string' },
					image_url: { type: 'string' }
				}
			},
			response: {
				201: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						user: userSchema,
						token: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, addUser);

	server.delete('/delete_user', {
		preHandler: verifyJWT,
		schema: {
			body: {
				type: 'object',
				required: ['nickname'],
				properties: {
					nickname: { type: 'string' }
				}
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' }
					}
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, deleteUser);

	server.get('/get_user', {
		preHandler: verifyJWT,
		schema: {
			querystring: {
				type: 'object',
				required: ['nickname'],
				properties: {
					nickname: { type: 'string' }
				}
			},
			response: {
				200: {
						user: userSchema
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, getUser);

	server.put('/update_user', {
		preHandler: verifyJWT,
		schema: {
			body: {
				type: 'object',
				required: ['nickname', 'field', 'new_value'],
				properties: {
					nickname: { type: 'string' },
					field: { type: 'string' },
					new_value: { type: 'string' }
				}
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						user: userSchema
					}
				},
				404: {
					type: 'object',
				properties: {
						error: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, updateUser);

	server.post('/upload_image', {
		schema: {
			consumes: ['multipart/form-data'],
			response: {
				200: {
					type: 'object',
					properties: {
						imageUrl: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, uploadImage);

	server.put('/add_friend', {
		preHandler: verifyJWT,
		schema:{
			body:{
				type: 'object',
				required: ['user1', 'user2'],
				properties:{
					user1: { type: 'string' },
					user2: { type: 'string' },
				}
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' },
					}
				},
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, addFriend);

	server.get('/online_users', {
		preHandler: verifyJWT,
		schema: {
			response: {
				200: {
					type: 'object',
					properties: {
						online_users: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									nickname: { type: 'string' },
									online: { type: 'boolean' },
									last_seen: { type: 'string', format: 'date-time' },
									current_room: { type: 'string' },
									image_url: { type: 'string' }
								}
							}
						}
					}
				}
			},
			tags: ['User']
		}
	}, getOnlineUsers);

	server.get('/get_user_with_status', {
		preHandler: verifyJWT,
		schema: {
			querystring: {
				type: 'object',
				required: ['nickname'],
				properties: {
					nickname: { type: 'string' }
				}
			},
			response: {
				200: userSchema,
				404: {
					type: 'object',
					properties: {
						error: { type: 'string' }
					}
				}
			},
			tags: ['User']
		}
	}, getUserWithOnlineStatus);
}