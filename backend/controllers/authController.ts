import { FastifyRequest, FastifyReply } from 'fastify';
import User from '../models/user';
import Stats from '../models/stats';
import bcrypt from 'bcrypt';
import { createJWT } from '../utils/jwt';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import jwt from 'jsonwebtoken';
import { gameManager } from '../services/gameManager';
import { notifyUserStatusChange } from './websocketController';

export async function generate2FA(request: FastifyRequest, reply: FastifyReply) {
	const { nickname, password } = request.body as { nickname?: string; password?: string };
	if (!nickname || !password) {
		return reply.code(401).send({ error: 'Missing credentials' });
	}
	const user = await User.findOne({ where: { nickname } });
	if (!user || !(await bcrypt.compare(password, user.password))) {
		return reply.code(401).send({ error: 'Invalid credentials' });
	}
	try {
		const issuer = process.env.TFA_ISSUER || 'ft_transcendence';
		let secretBase32: string;
		let reused = false;
		if (user.tfa_code) {
			secretBase32 = user.tfa_code;
			reused = true;
		} else {
			const secret = speakeasy.generateSecret({ name: user.nickname, issuer });
			secretBase32 = secret.base32;
			user.tfa_code = secretBase32;
			await user.save();
		}
		const label = encodeURIComponent(`${issuer}:${user.nickname}`);
		const otpauth_url = `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}`;
		const qrCode = await qrcode.toDataURL(otpauth_url);

		reply.code(200).send({
			message: reused ? '2FA already configured. Reusing existing secret.' : '2FA setup required. Scan the QR code with Google Authenticator.',
			qrCode,
			alreadyConfigured: reused,
		});
	}
	catch (error) {
		reply.code(500).send({ error: 'Failed to generate 2FA secret', details: error });
	}
}

export async function verify2FA(request: FastifyRequest, reply: FastifyReply) {
	const { nickname, token2FA} = request.body as { nickname: string; token2FA: string};

	try {
		const user = await User.findOne({ where: { nickname } });
		if (!user || !user.tfa_code) {
			reply.code(404).send({ error: 'User not found or 2FA not enabled' });
			return;
		}
		
		const verified = speakeasy.totp.verify({
			secret: user.tfa_code,
			encoding: 'base32',
			token: token2FA,
			window: 2
		});

		if (verified) {
			const payload = { id: user.id, nickname: user.nickname };
			const jwtToken = createJWT(payload);
			user.online = true;
			user.last_seen = new Date();
			await user.save();
			reply.code(200).send({ message: '2FA verified successfully, you are now logged in', token: jwtToken, user });
		} else {
			reply.code(401).send({ error: 'Invalid 2FA token' });
		}
	}
	catch (error) {
		reply.code(500).send({ error: 'Failed to verify 2FA', details: error });
	}
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
	const { nickname, password } = request.body as { nickname: string; password: string };

	try {
		let user = await User.findOne({ where: { nickname } });
		let foundBy: 'nickname' | 'none' = 'none';
		if (user) foundBy = 'nickname';
		const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;
		if (!user || !passwordMatches) {
			reply.code(401).send({ error: 'Invalid credentials' });
			return;
		}
		if (user.online) {
			reply.code(400).send({ error: 'User already logged in' });
			return;
		}
		if (!user.tfa_code) {
			reply.code(403).send({ error: '2FA not enabled. Complete 2FA setup.' });
			return;
		}
		reply.code(200).send({ require2FA: true, message: '2FA required' });
	}
	catch (error) {
		reply.code(500).send({ error: 'Failed to login', details: error });
	}
}

export async function isAvailable(request: FastifyRequest, reply: FastifyReply) {
	const { field, value } = request.query as { field: string; value: string; };
	try {
		switch (field) {
			case 'nickname':
				const user = await User.findOne({ where: { nickname: value } });
				reply.code(200).send({ available: !user });
				break;
			case 'email':
				const emailUser = await User.findOne({ where: { email: value } });
				reply.code(200).send({ available: !emailUser });
				break;
			default:
				reply.code(400).send({ error: 'Invalid field' });
		}
	}
	catch (error) {
		reply.code(500).send({ error: 'Failed to check availability', details: error });
	}
}

export async function GoogleOAuthCallback(request: FastifyRequest, reply: FastifyReply) {
	try {
		const token = await (request.server as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

		const userInfo = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: { Authorization: `Bearer ${token.token.access_token}` }
		}).then(res => res.json());


		if (userInfo.error) {
			return reply.status(401).send({ error: 'Google userinfo error', details: userInfo });
		}

		let user = await User.findOne({ 
			where: { email: userInfo.email },
			include: [{ model: Stats, as: 'stats' }]
		});
		if (!user) {
			user = await User.create({
				name: userInfo.name,
				surname: userInfo.family_name,
				password: '',
				nickname: userInfo.name || userInfo.email.split('@')[0] || `${userInfo.name}_${Date.now()}`,
				email: userInfo.email,
				image_url: userInfo.picture,
				tfa_code: null,
				online: true,
				last_seen: new Date(),
			});
			const stats1 = await Stats.create({ nickname: user.nickname });
			const stats2 = await Stats.create({ nickname: user.nickname });
			await (user as any).setStats([stats1, stats2]);
			await user.reload({ include: [{ model: Stats, as: 'stats' }] });
		}
		else if (user.online) {
			reply.code(400).send({ error: 'User already logged in' });
			return;
		}
		else {
			user.online = true;
			user.last_seen = new Date();
			await user.save();
			const hasStats = Array.isArray((user as any).stats) && (user as any).stats.length >= 1;
			if (!hasStats) {
				const existing = await Stats.findAll({ where: { nickname: user.nickname } });
				if (existing.length >= 2) {
					await (user as any).setStats(existing);
				} else {
					const s1 = await Stats.create({ nickname: user.nickname });
					const s2 = await Stats.create({ nickname: user.nickname });
					await (user as any).setStats([s1, s2]);
				}
				await user.reload({ include: [{ model: Stats, as: 'stats' }] });
			}
		}
		const jwtToken = createJWT({ id: user.id, nickname: user.nickname });

		const frontendUrl = `${process.env.FRONTEND_URL}` ||'https://transcendence.fe:8443';
		return reply.redirect(`${frontendUrl}/?token=${jwtToken}&nickname=${encodeURIComponent(user.nickname)}`);
	} catch (error) {
		return reply.status(500).send({
			error: 'Google OAuth failed',
			details: error instanceof Error ? { message: error.message, stack: error.stack } : error
		});
	}
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
	try {
		const user = (request as any).user;
		if (!user || !user.nickname) {
			return reply.code(400).send({ error: 'Invalid user data' });
		}
		gameManager.disconnectUserFromAllRooms(user.nickname);
		const dbUser = await (User as any).findOne({ where: { nickname: user.nickname } });
		if (dbUser) {
			dbUser.online = false;
			dbUser.last_seen = new Date();
			dbUser.current_room = null;
			await dbUser.save();
		}
		notifyUserStatusChange(user.nickname, false);
		reply.code(200).send({ 
			message: 'Logout successful',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Logout error:', error);
		reply.code(500).send({ 
			error: 'Failed to logout', 
			details: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
