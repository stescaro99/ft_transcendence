import Fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyCookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

dotenv.config();
const projectRoot = process.cwd();
const dbDir = path.join(projectRoot, 'db');
const dbPath = path.join(dbDir, 'database.db');

if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir);
}

const dbExists = fs.existsSync(dbPath);

// Carica i certificati SSL
const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'cert', 'cert.pem');
const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'cert', 'key.pem');

const httpsOptions = {
	key: fs.readFileSync(keyPath),
	cert: fs.readFileSync(certPath)
};

const server = Fastify({
  logger: true,
  https: httpsOptions,
  bodyLimit: 20 * 1024 * 1024
});

server.register(fastifyCookie); 

// Middleware per rilevare accesso tramite IP
server.addHook('preHandler', async (request: any, reply: any) => {
	const host = request.headers.host;
	const hostId = process.env.HOST_ID;
	
	// Controlla se l'utente sta accedendo tramite IP invece che dominio
	if (host && hostId && (host.includes(hostId) || host.includes('localhost') || host.includes('127.0.0.1'))) {
		// Aggiungi header per indicare che l'accesso è tramite IP
		reply.header('X-Access-Via-IP', 'true');
		reply.header('X-Host-Config-Needed', `${hostId} transcendence.be transcendence.fe`);
	}
});

const start = async (sequelize: any) => {
	try {
		// Configure CORS to allow frontend domain and IP access
		await server.register(fastifyCors, {
			origin: [
				'https://transcendence.fe:8443', 
				'https://localhost:8443',
				`https://${process.env.HOST_ID}:8443`,
				`https://127.0.0.1:8443`
			],
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
		});
		await server.register(swagger, {
			openapi: {
				info: {
					title: 'API ft_transcendence',
					description: 'Documentazione API Pong',
					version: '1.0.0'
				},
				components: {
					securitySchemes: {
						bearerAuth: {
							type: 'http',
							scheme: 'bearer',
							bearerFormat: 'JWT',
							description: 'Inserisci il token JWT come: Bearer <token>'
						}
					}
				},
				security: [{ bearerAuth: [] }]
			},
		});
		await server.register(swaggerUI, {
			routePrefix: '/swagger'
		});

		await server.register(fastifyMultipart, {
			limits: {
				fileSize: 20 * 1024 * 1024
			}
		});
		await server.register(fastifyStatic, {
			root: path.join(__dirname, 'uploads'),
			prefix: '/uploads/',
		});

		await server.register(fastifyOauth2 as any, {
			name: 'googleOAuth2',
			scope: ['profile', 'email', 'openid'],
			credentials: {
				client: {
					id: process.env.GOOGLE_CLIENT_ID!,
					secret: process.env.GOOGLE_CLIENT_SECRET!
				},
				auth: fastifyOauth2.GOOGLE_CONFIGURATION,
			},
			startRedirectPath: '/api/google_login',
			callbackUri: process.env.GOOGLE_REDIRECT_URI!
		});
	

		const routes_path = path.join(__dirname, 'routes');
		fs.readdirSync(routes_path).forEach((file) => {
			if (file.endsWith('.js')) {
				const route = require(path.join(routes_path, file));
				server.register(route, { prefix: '/api' });
			}
		});

		// Registra le route WebSocket
		const websocketRoutes = require('./routes/websocketRoutes');
		server.register(websocketRoutes.default, { prefix: '/ws' });


		await sequelize.authenticate();
		const port = parseInt(process.env.PORT || '9443');
		await server.listen({ port, host: '0.0.0.0' });
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

(async () => {
	const { default: sequelize } = await import('./db');
	await import('./models/game');
	await import('./models/stats');
	await import('./models/user');
	await import('./models/tournament');
	// ...altri modelli se servono

	// ATTENZIONE: l'uso di { alter: true } con SQLite può creare tabelle di backup
	// (es: users_backup) e fallire con UNIQUE constraint se rilanci più volte.
	// Strategia semplice: se il DB non esiste -> force (reset iniziale), altrimenti sync "soft".
	if (!dbExists) {
		await sequelize.sync({ force: true });
	} else {
		await sequelize.sync(); // nessun alter automatico su SQLite per evitare duplicati
	}
	await start(sequelize);
})();