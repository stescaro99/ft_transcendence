import express, { Request, Response, NextFunction } from "express";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";

// __dirname replacement for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Se compilato: __dirname termina con dist-server -> root = cartella superiore.
// In dev (ts-node): __dirname è già la root del progetto.
const isCompiled = path.basename(__dirname) === 'dist-server';
const rootDir = isCompiled ? path.resolve(__dirname, '..') : __dirname;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Inject HOST_ID into served index.html
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/" || req.path.endsWith(".html")) {
  const indexPath = path.join(rootDir, "dist", "index.html");
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, "utf8");
      const hostId = process.env.HOST_ID || "192.168.1.61";
      html = html.replace("</head>", `<script>window.__HOST_ID__ = "${hostId}";</script></head>`);
      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    }
  }
  next();
});

// Serve static build assets
app.use(express.static(path.join(rootDir, "dist")));

// Expose uploads directory (inside container /app/uploads)
app.use('/uploads', express.static('/app/uploads'));

// SPA fallback
app.get("*", (_req: Request, res: Response) => {
  const indexPath = path.join(rootDir, "dist", "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const hostId = process.env.HOST_ID || "192.168.1.61";
  html = html.replace("</head>", `<script>window.__HOST_ID__ = "${hostId}";</script></head>`);
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

const port = Number(process.env.PORT) || 8443;
const certPath = process.env.SSL_CERT_PATH || "/app/cert/cert.pem";
const keyPath = process.env.SSL_KEY_PATH || "/app/cert/key.pem";

interface HttpsOptions {
  key: Buffer;
  cert: Buffer;
}

const httpsOptions: HttpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, app).listen(port, "0.0.0.0", () => {
});
