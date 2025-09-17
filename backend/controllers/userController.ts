import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import User from '../models/user';
import Stats from '../models/stats';
import Game from '../models/game';
import sequelize from '../db';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

export async function forceOffline(request: FastifyRequest, reply: FastifyReply) {
	const { nickname } = request.body as { nickname: string };
	try {
		const user = await User.findOne({ where: { nickname } });
		if (user) {
			user.online = false;
			user.last_seen = new Date();
			user.current_room = "";
			await user.save();
			reply.code(200).send({ message: 'User set offline', user });
		} else {
			reply.code(404).send({ error: 'User not found' });
		}
	} catch (error) {
		reply.code(500).send({ error: 'Failed to set user offline', details: error });
	}
}

export async function forceOnline(request: FastifyRequest, reply: FastifyReply) {
	const { nickname } = request.body as { nickname: string };
	try {
		const user = await User.findOne({ where: { nickname } });
		if (user) {
			user.online = true;
			await user.save();
			reply.code(200).send({ message: 'User set online', user });
		}
		else {
			reply.code(404).send({ error: 'User not found' });
		}
	} catch (error) {
		reply.code(500).send({ error: 'Failed to set user online', details: error });
	}
}

export async function addUser(request: FastifyRequest, reply: FastifyReply) {
	const { name, surname, nickname, email, password, image_url } = request.body as {
		name: string;
		surname: string;
		nickname: string;
		email: string;
		password: string;
		image_url?: string;
	};
	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const defaultImage = 'https://transcendence.fe:8443/user.jpg';
		const user = await User.create({
			name,
			surname,
			nickname,
			email,
			password: hashedPassword,
			image_url: (image_url === undefined || image_url === '') ? defaultImage : image_url,
			online: true,
			language: 'en',
			last_seen: new Date(),
		});

		const stats_pong = await Stats.create({ nickname: nickname });
		const stats_game2 = await Stats.create({ nickname: nickname });

		await user.setStats([stats_pong, stats_game2]);
		await user.reload({ include: [{ model: Stats, as: 'stats' }] });

		reply.code(201).send({ message: 'User added!', user});
	} catch (error) {
		reply.code(500).send({ error: 'Failed to add user', details: error });
	}
}

export async function deleteUser(request: FastifyRequest, reply: FastifyReply) {
	const { nickname } = request.body as { nickname: string };
	try {
		await Stats.destroy({ where: { nickname: nickname } });
		const user = await User.destroy({ where: { nickname: nickname } });
		if (user) {
			reply.code(200).send({ message: 'User deleted!' });
		} else {
			reply.code(404).send({ error: 'User not found' });
		}
	} catch (error) {
		reply.code(500).send({ error: 'Failed to delete user', details: error });
	}
}

export async function getUser(request: FastifyRequest, reply: FastifyReply) {
    const { nickname } = request.query as { nickname: string };
    try {
		const user = await User.findOne({
			where: { nickname: nickname },
			include: [
			{
				model: Stats,
				as: 'stats',
				include: [
				{ model: Game, as: 'games' }
				]
			}
			],
			attributes: { exclude: ['password'] }
		});
        const defaultImage = 'https://transcendence.fe:8443/image/user.jpg';
        if (user) {
            if (user.image_url === undefined || user.image_url === '') user.image_url = defaultImage;
            reply.code(200).send(user);
        } else {
            reply.code(404).send({ error: 'User not found' });
        }
    } catch (error) {
        reply.code(500).send({ error: 'Failed to get user', details: error });
    }
}

export async function updateUser(request: FastifyRequest, reply: FastifyReply) {
	const { nickname, field, new_value } = request.body as { nickname: string; field: string; new_value: string };
	try {
		const user = await User.findOne({ where: { nickname: nickname } });
		if (user) {
			switch (field) {
				case 'name':
					user.name = new_value;
					break;
				case 'surname':
					user.surname = new_value;
					break;
				case 'nickname':
					user.nickname = new_value;
					break;
				case 'email':
					if (!user.tfa_code || user.password === '')
						reply.code(400).send({ error: 'Cannot change email after Google Signup' });
					user.email = new_value;
					break;
				case 'password':
					if (!user.tfa_code || user.password === '')
						reply.code(400).send({ error: 'Cannot change password after Google Signup' });
					user.password = await bcrypt.hash(new_value, 10);
					break;
				case 'language':
					user.language = new_value;
					break;
				case 'image_url':
					user.image_url = new_value;
					break;
				default:
					reply.code(400).send({ error: 'Invalid field' });
					return;
			}
			await user.save();
			reply.code(200).send({ message: 'User updated!', user });
		} else {
			reply.code(404).send({ error: 'User not found' });
		}
	}
	catch (error) {
		reply.code(500).send({ error: 'Failed to update user', details: error });
	}
}

export async function uploadImage(request: FastifyRequest, reply: FastifyReply) {
	const parts = request.parts ? request.parts() : [];
	for await (const part of parts) {
		if ((part as MultipartFile).file && part.fieldname === 'image') {
			const filePart = part as MultipartFile;
			const uploadDir = path.join(__dirname, '../../uploads');
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}
			const filename = `${Date.now()}_${filePart.filename}`;
			const filepath = path.join(uploadDir, filename);
			const writeStream = fs.createWriteStream(filepath);		await filePart.file.pipe(writeStream);
		// Use the frontend URL to serve images since they are mounted there
		const frontendUrl = 'https://transcendence.fe:8443'; //|| `https://${process.env.HOST_ID}:8443`;
		const imageUrl = `${frontendUrl}/uploads/${filename}`;
		return reply.code(200).send({ imageUrl });
		}
	}
	reply.code(400).send({ error: 'No image uploaded' });
}


export async function addFriend(request: FastifyRequest, reply: FastifyReply) {
	const { user1, user2 } = request.body as { user1: string; user2: string };

	try {
		const first_user = await User.findOne({ where: { nickname: user1 } });
		const second_user = await User.findOne({ where: { nickname: user2 } });

		if (!first_user || !second_user) {
			return reply.code(404).send({ error: 'User not found' });
		}

		const friends1 = new Set(first_user.friends || []);
		const friends2 = new Set(second_user.friends || []);
		const requests1 = new Set(first_user.fr_request  || []);
		const requests2 = new Set(second_user.fr_request || []);

		if (friends1.has(user2) && friends2.has(user1)) {
			friends1.delete(user2);
			friends2.delete(user1);

			first_user.friends = Array.from(friends1);
			second_user.friends = Array.from(friends2);

			await first_user.save();
			await second_user.save();

			return reply.send({ message: 'Friendship removed' });
		}
		if (requests1.has(user2)) {
			requests1.delete(user2);
			friends1.add(user2);
			friends2.add(user1);

			first_user.fr_request = Array.from(requests1);
			first_user.friends = Array.from(friends1);
			second_user.friends = Array.from(friends2);

			await first_user.save();
			await second_user.save();

			return reply.send({ message: 'Friendship established' });
		}
		if (!requests2.has(user1)) {
			requests2.add(user1);
			second_user.fr_request = Array.from(requests2);
			await second_user.save();
			return reply.send({ message: 'Friend request sent' });
		}
		return reply.code(409).send({ error: "Friend request already sent"})

	} catch (err) {
		console.error(err);
		return reply.code(500).send({ error: 'Internal server error' });
	}
}

export async function getOnlineUsers(request: FastifyRequest, reply: FastifyReply) {
	try {
		const users = await User.findAll({
			where: { online: true },
			attributes: ['nickname', 'online', 'last_seen', 'current_room', 'image_url'],
		});
		reply.code(200).send({ online_users: users });
	} catch (error) {
		reply.code(500).send({ error: 'Failed to get online users', details: error });
	}
}

export async function getUserWithOnlineStatus(request: FastifyRequest, reply: FastifyReply) {
	const { nickname } = request.query as { nickname: string };
	try {
		const user = await User.findOne({
			where: { nickname: nickname },
			include: [{ model: Stats, as: 'stats' }],
			attributes: { exclude: ['password', 'email'] }
		});
		if (user) {
			reply.code(200).send(user);
		} else {
			reply.code(404).send({ error: 'User not found' });
		}
	} catch (error) {
		reply.code(500).send({ error: 'Failed to get user', details: error });
	}
}
