import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { HttpStatus } from "../http/status";
import type { RouteContext } from "../router";
import type { Schema } from "../../schema/types.js";
export type Middleware = (
	ctx: RouteContext,
	next: () => Promise<void>,
) => void | Promise<void>;

export interface CorsOptions {
	origin?: string | string[];
	methods?: string[];
	allowedHeaders?: string[];
	exposedHeaders?: string[];
	credentials?: boolean;
	maxAge?: number;
}

export function cors(options?: CorsOptions): Middleware {
	const opts: Required<CorsOptions> = {
		origin: "*",
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		exposedHeaders: [],
		credentials: false,
		maxAge: 86400,
		...options,
	};

	return (ctx: RouteContext, next: () => Promise<void>) => {
		const { request, response } = ctx;
		const origin = request.headers.get("origin");

		if (origin !== undefined) {
			if (opts.origin === "*") {
				response.header("access-control-allow-origin", "*");
			} else if (typeof opts.origin === "string") {
				response.header("access-control-allow-origin", opts.origin);
			} else if (opts.origin.includes(origin)) {
				response.header("access-control-allow-origin", origin);
			}

			if (opts.credentials) {
				response.header("access-control-allow-credentials", "true");
			}

			if (opts.exposedHeaders.length > 0) {
				response.header(
					"access-control-expose-headers",
					opts.exposedHeaders.join(", "),
				);
			}
		}

		if (request.method === "OPTIONS") {
			response.header("access-control-allow-methods", opts.methods.join(", "));
			response.header(
				"access-control-allow-headers",
				opts.allowedHeaders.join(", "),
			);
			response.header("access-control-max-age", String(opts.maxAge));
			response.status(HttpStatus.NO_CONTENT);
			return;
		}

		return next();
	};
}

export function bodyParser(): Middleware {
	return async (ctx: RouteContext, next: () => Promise<void>) => {
		const { request } = ctx;
		const method = request.method;

		if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
			await request.body();
		}

		return next();
	};
}

export interface SessionOptions {
	name?: string;
	secret?: string;
	maxAge?: number;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "strict" | "lax" | "none";
}

export function session(options?: SessionOptions): Middleware {
	const opts = {
		name: "speexjs_session",
		secret: options?.secret ?? (process.env.NODE_ENV === 'production' 
    ? (() => { throw new Error('Session secret must be configured in production via secret option or SESSION_SECRET env var') })() 
    : 'speexjs-dev-secret'),
		maxAge: 7200,
		httpOnly: true,
		secure: false,
		sameSite: "lax" as const,
		...options,
	};

	interface SessionEntry {
		data: Record<string, unknown>;
		createdAt: number;
	}
	const sessions = new Map<string, SessionEntry>();
	const SESSION_TTL = (opts.maxAge || 7200) * 1000;
	let cleanupCounter = 0;

	function generateSessionId(): string {
		return randomUUID();
	}

	return (ctx: RouteContext, next: () => Promise<void>) => {
		const { request, response } = ctx;
		const sessionId = request.cookie(opts.name) ?? generateSessionId();
		const id = sessionId;

		// Clean expired sessions every 100 requests (deterministic)
		cleanupCounter++;
		if (cleanupCounter >= 100) {
			cleanupCounter = 0;
			const now = Date.now();
			for (const [key, entry] of sessions) {
				if (now - entry.createdAt > SESSION_TTL) {
					sessions.delete(key);
				}
			}
		}

		// Check if existing session is expired
		const existing = sessions.get(id);
		if (existing && (Date.now() - existing.createdAt > SESSION_TTL)) {
			sessions.delete(id);
		}

		if (!sessions.has(id)) {
			sessions.set(id, { data: {}, createdAt: Date.now() });
		}
		const sessionData = sessions.get(id)!.data;

		(ctx as unknown as Record<string, unknown>).session = sessionData;

		if (request.cookie(opts.name) === undefined) {
			response.cookie(opts.name, id, {
				maxAge: opts.maxAge,
				httpOnly: opts.httpOnly,
				secure: opts.secure,
				sameSite: opts.sameSite,
				path: "/",
			});
		}

		return next();
	};
}

export function auth(guard?: string): Middleware {
	const guardName = guard ?? "default";

	return (ctx: RouteContext, next: () => Promise<void>) => {
		const user = ctx.container.resolve(`auth.${guardName}`);

		if (user === undefined || user === null) {
			if (ctx.request.wantsJson()) {
				ctx.response.status(HttpStatus.UNAUTHORIZED).json({
					error: "Unauthenticated",
					message: "Authentication is required to access this resource",
				});
				return;
			}

			ctx.response.redirect("/login", HttpStatus.FOUND as 302);
			return;
		}

		(ctx as unknown as Record<string, unknown>).user = user;

		return next();
	};
}

export function throttle(limit?: number, window?: number): Middleware {
	const maxRequests = limit ?? 60;
	const timeWindow = (window ?? 60) * 1000;
	const hits = new Map<string, { count: number; resetAt: number }>();

	const cleanup = setInterval(() => {
		const now = Date.now();
		for (const [key, value] of hits) {
			if (value.resetAt < now) {
				hits.delete(key);
			}
		}
	}, 60000);

	if (cleanup.unref !== undefined) {
		cleanup.unref();
	}

	return (ctx: RouteContext, next: () => Promise<void>) => {
		const key = ctx.request.ip;

		const now = Date.now();
		const hit = hits.get(key);

		if (hit === undefined || hit.resetAt < now) {
			hits.set(key, { count: 1, resetAt: now + timeWindow });
			ctx.response.header("x-ratelimit-limit", String(maxRequests));
			ctx.response.header("x-ratelimit-remaining", String(maxRequests - 1));
			ctx.response.header("x-ratelimit-reset", String(now + timeWindow));
			return next();
		}

		hit.count++;
		const remaining = Math.max(0, maxRequests - hit.count);
		ctx.response.header("x-ratelimit-limit", String(maxRequests));
		ctx.response.header("x-ratelimit-remaining", String(remaining));
		ctx.response.header("x-ratelimit-reset", String(hit.resetAt));

		if (hit.count > maxRequests) {
			const retryAfter = Math.ceil((hit.resetAt - now) / 1000);
			ctx.response.header("retry-after", String(retryAfter));
			ctx.response.status(HttpStatus.TOO_MANY_REQUESTS).json({
				error: "Too Many Requests",
				message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
			});
			return;
		}

		return next();
	};
}

export function logger(): Middleware {
	return (ctx: RouteContext, next: () => Promise<void>) => {
		const start = Date.now();
		const { method, path, ip } = ctx.request;

		const result = next();

		if (result instanceof Promise) {
			return result.then(() => {
				const duration = Date.now() - start;
				const status = ctx.response.statusCode;
				console.log(
					`[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms - ${ip}`,
				);
			});
		}

		const duration = Date.now() - start;
		const status = ctx.response.statusCode;
		console.log(
			`[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms - ${ip}`,
		);
	};
}

export interface StaticOptions {
	maxAge?: number;
	index?: string;
	dotfiles?: "allow" | "deny";
	extensions?: string[];
}

export function staticFiles(root: string, options?: StaticOptions): Middleware {
	const opts = {
		maxAge: 0,
		index: "index.html",
		dotfiles: "deny" as const,
		extensions: [] as string[],
		...options,
	};

	const MIME_TYPES: Record<string, string> = {
		".html": "text/html",
		".css": "text/css",
		".js": "application/javascript",
		".json": "application/json",
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".svg": "image/svg+xml",
		".webp": "image/webp",
		".ico": "image/x-icon",
		".txt": "text/plain",
		".pdf": "application/pdf",
		".woff": "font/woff",
		".woff2": "font/woff2",
		".ttf": "font/ttf",
	};

	return (ctx: RouteContext, next: () => Promise<void>) => {
		const { request, response } = ctx;
		const filePath = request.path;

		if (opts.dotfiles === "deny") {
			const segments = filePath.split("/");
			for (const segment of segments) {
				if (segment.startsWith(".")) {
					return next();
				}
			}
		}

		let fullPath = join(root, filePath);

		// Path traversal protection
		const resolvedRoot = resolve(root);
		const resolvedPath = resolve(fullPath);
		if (!resolvedPath.startsWith(resolvedRoot)) {
			return next();
		}

		if (!existsSync(fullPath)) {
			let found = false;
			for (const ext of opts.extensions) {
				const tryPath = fullPath + ext;
				if (existsSync(tryPath)) {
					fullPath = tryPath;
					found = true;
					break;
				}
			}
			if (!found) return next();
		}

		// Try pre-compressed version
		if (ctx.request.headers.get('accept-encoding')?.includes('gzip')) {
			const gzPath = fullPath + '.gz'
			if (existsSync(gzPath)) {
				fullPath = gzPath
				ctx.response.header('content-encoding', 'gzip')
			}
		}

		const stats = statSync(fullPath);
		if (!stats.isFile()) {
			if (stats.isDirectory()) {
				const indexPath = join(fullPath, opts.index);
				if (existsSync(indexPath) && statSync(indexPath).isFile()) {
					fullPath = indexPath;
				} else {
					return next();
				}
			} else {
				return next();
			}
		}

		const ext = extname(fullPath);
		const mimeType = MIME_TYPES[ext] ?? "application/octet-stream";

		response
			.header("content-type", mimeType)
			.header("content-length", String(stats.size))
			.header("cache-control", `public, max-age=${opts.maxAge}`)
			.header("last-modified", stats.mtime.toUTCString());

		const readStream = createReadStream(fullPath);
		readStream.pipe(response.rawResponse);
		response.rawResponse.statusCode = HttpStatus.OK;

		return new Promise<void>((resolve, reject) => {
			readStream.on("end", () => resolve());
			readStream.on("error", (err: Error) => reject(err));
		});
	};
}

export function csrf(): Middleware {
	const tokens = new Map<string, number>(); // token → expiresAt
	const MAX_TOKENS = 10000;
	const TTL = 60 * 60 * 1000; // 1 hour

	function generateToken(): string {
		// Cleanup expired tokens
		const now = Date.now();
		for (const [token, expiresAt] of tokens) {
			if (expiresAt < now) tokens.delete(token);
		}
		// Enforce max size
		if (tokens.size >= MAX_TOKENS) {
			const oldest = tokens.entries().next().value;
			if (oldest) tokens.delete(oldest[0]);
		}
		const token = randomUUID();
		tokens.set(token, now + TTL);
		return token;
	}

	function skipCsrf(method: string): boolean {
		return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
	}

	return (ctx: RouteContext, next: () => Promise<void>) => {
		const { request, response } = ctx;

		if (request.path === "/csrf-token") {
			const token = generateToken();
			response.json({ token });
			return;
		}

		if (skipCsrf(request.method)) {
			return next();
		}

		const token =
			request.headers.get("x-csrf-token") ??
			request.headers.get("x-xsrf-token");

		if (token === undefined || !tokens.has(token)) {
			response.status(HttpStatus.FORBIDDEN).json({
				error: "CSRF token mismatch",
				message: "Invalid or missing CSRF token",
			});
			return;
		}

		tokens.delete(token);

		// Auto-refresh: issue new token in response header
		const newToken = randomUUID()
		tokens.set(newToken, Date.now() + TTL)
		response.header('x-csrf-token', newToken)

		return next();
	};
}

export function compress(): Middleware {
	return (ctx: RouteContext, next: () => Promise<void>) => {
		const { request } = ctx;
		const acceptEncoding = request.headers.get("accept-encoding") ?? "";

		if (acceptEncoding.includes("gzip")) {
			return compressWith(ctx, next, "gzip");
		}

		return next();
	};
}

function compressWith(
	ctx: RouteContext,
	next: () => Promise<void>,
	_encoding: string,
): Promise<void> {
	(ctx.response as any).send = function(body: string | Buffer, status?: number, contentType?: string) {
		if (status !== undefined) this._statusCode = status;
		this._body = body;
		if (contentType !== undefined && !this._contentTypeSet) {
			this._headers.set("content-type", contentType);
		}
		const input = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
		const compressed = gzipSync(input);

		this._headers.set("content-encoding", "gzip");
		this._headers.set("content-length", String(compressed.length));
		this._body = compressed;
		return this;
	};

	return next();
}

export function helmet(): Middleware {
	return (ctx: RouteContext, next: () => Promise<void>) => {
		const { response } = ctx;

		response
			.header("x-content-type-options", "nosniff")
			.header("x-frame-options", "SAMEORIGIN")
			.header(
				"strict-transport-security",
				"max-age=15552000; includeSubDomains",
			)
			.header("referrer-policy", "no-referrer-when-downgrade")
			.header(
				"content-security-policy",
				"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
			)
			.header("permissions-policy", "camera=(), microphone=(), geolocation=()");

		return next();
	};
}

// ─── Request Validation Middleware ───────────────────────────

export function validate(schema: Schema<unknown>): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const data = await ctx.request.body()
    const result = schema.safeParse(data)
    if (!result.success) {
      ctx.response.status(422).json({
        error: 'VALIDATION_ERROR',
        message: result.error,
      })
      return
    }
    (ctx as any).validated = result.data
    return next()
  }
}

export function validateQuery(schema: Schema<unknown>): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const result = schema.safeParse(ctx.request.query)
    if (!result.success) {
      ctx.response.status(422).json({
        error: 'VALIDATION_ERROR',
        message: result.error,
      })
      return
    }
    (ctx as any).validatedQuery = result.data
    return next()
  }
}

export class MiddlewarePipeline {
	private middlewares: Middleware[] = [];

	use(middleware: Middleware): this {
		this.middlewares.push(middleware);
		return this;
	}

	prepend(middleware: Middleware): this {
		this.middlewares.unshift(middleware);
		return this;
	}

	remove(name: string): void {
		this.middlewares = this.middlewares.filter((mw) => mw.name !== name);
	}

	async run(ctx: RouteContext, final: () => Promise<void>): Promise<void> {
		let index = 0;

		const next = async (): Promise<void> => {
			if (index >= this.middlewares.length) {
				await final();
				return;
			}

			const middleware = this.middlewares[index] as Middleware;
			index++;
			await middleware(ctx, next);
		};

		await next();
	}

	getMiddlewares(): Middleware[] {
		return [...this.middlewares];
	}
}
