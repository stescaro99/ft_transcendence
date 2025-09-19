import { FastifyRequest, FastifyReply } from 'fastify';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
	try {
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return reply.code(401).send({ error: 'Missing or invalid token' });
		}
		const token = authHeader.split(' ')[1];
		const key = process.env.JWT_SECRET || 'default_key';
		const decoded = jwt.verify(token, key) as JwtPayload;
		(request as any).user = decoded;
	} catch (err) {
		return reply.code(401).send({ error: 'Invalid or expired token' });
	}
}

export function createJWT(
	payload: JwtPayload | string,
	expiresIn?: SignOptions['expiresIn']
): string {
	const key = process.env.JWT_SECRET || 'default_key';
	const options: SignOptions = expiresIn ? { expiresIn } : {};
	return jwt.sign(payload, key, options);
}
