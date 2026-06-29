import { createReadStream, stat } from "node:fs";
import type { ServerResponse } from "node:http";
import { basename, extname, resolve } from "node:path";
import type { Readable } from "node:stream";
import { promisify } from "node:util";
import type { ViewEngine } from "../view/index.js";
import type { CookieOptions } from "./cookie";
import { clearCookie, serializeCookie } from "./cookie";
import { HeadersMap } from "./headers";
import { HttpStatus } from "./status";

const statAsync = promisify(stat);

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".css": "text/css",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".pdf": "application/pdf",
	".txt": "text/plain",
	".xml": "application/xml",
	".zip": "application/zip",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".eot": "application/vnd.ms-fontobject",
	".mp4": "video/mp4",
	".webm": "video/webm",
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
};

export interface FileOptions {
	root?: string;
	maxAge?: number;
	acceptRanges?: boolean;
	cacheControl?: boolean;
	etag?: boolean;
	lastModified?: boolean;
	headers?: Record<string, string>;
}

export class SuperResponse {
	private raw: ServerResponse;
	private _statusCode: number = HttpStatus.OK;
	private _headers = new HeadersMap();
	private _cookies: string[] = [];
	private _body: string | Buffer | null = null;
	private _sent = false;
	private _contentTypeSet = false;
	private _viewEngine: ViewEngine | null = null;
	private _startTime = Date.now();

	constructor(raw: ServerResponse) {
		this.raw = raw;
	}

	status(code: number): this {
		this._statusCode = code;
		return this;
	}

	header(name: string, value: string): this {
		this._headers.set(name, value);
		return this;
	}

	setHeader(name: string, value: string): this {
		return this.header(name, value);
	}

	getHeader(name: string): string | undefined {
		return this._headers.get(name);
	}

	removeHeader(name: string): this {
		this._headers.delete(name);
		return this;
	}

	hasHeader(name: string): boolean {
		return this._headers.has(name);
	}

	type(contentType: string): this {
		this._headers.set("content-type", contentType);
		this._contentTypeSet = true;
		return this;
	}

	json<T>(data: T, status?: number): this {
		if (status !== undefined) this._statusCode = status;
		const body = JSON.stringify(data);
		return this.send(body, undefined, "application/json");
	}

	jsonp<T>(data: T, callback = 'callback'): this {
		const body = `${callback}(${JSON.stringify(data)})`
		return this.send(body, undefined, 'text/javascript')
	}

	vary(...headers: string[]): this {
		const existing = (this._headers.get('vary') ?? '').split(',').map(h => h.trim()).filter(Boolean)
		this._headers.set('vary', [...existing, ...headers].join(', '))
		return this
	}

	elapsed(): number { return Date.now() - this._startTime }

	send(body: string | Buffer, status?: number, contentType?: string): this {
		if (status !== undefined) this._statusCode = status;
		this._body = body;
		if (contentType !== undefined && !this._contentTypeSet) {
			this._headers.set("content-type", contentType);
		}
		return this;
	}

	html(html: string, status?: number): this {
		return this.send(html, status, "text/html; charset=utf-8");
	}

	setViewEngine(engine: ViewEngine): this {
		this._viewEngine = engine;
		return this;
	}

	async page(page: string, props?: Record<string, unknown>): Promise<this> {
		if (this._viewEngine === null) {
			throw new Error("View engine not set. Call setViewEngine() first.");
		}
		const html = await this._viewEngine.render(page, props ?? {});
		return this.html(html);
	}

	redirect(
		url: string,
		status: 301 | 302 | 307 | 308 = HttpStatus.FOUND as 302,
	): this {
		// Prevent open redirect / CRLF injection
		if (url.includes('\r') || url.includes('\n')) {
			throw new Error('Invalid redirect URL');
		}
		this._statusCode = status;
		this._headers.set("location", url);
		this._body = null;
		return this;
	}

	stream(stream: Readable, status?: number): this {
		if (status !== undefined) this._statusCode = status;
		this.flushHeaders();
		this.raw.statusCode = this._statusCode;
		stream.pipe(this.raw);
		stream.on("end", () => {
			this._sent = true;
		});
		stream.on("error", (_err: Error) => {
			if (!this._sent) {
				this._sent = true;
				this.raw.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
				this.raw.end();
			}
		});
		return this;
	}

	async file(filePath: string, options?: FileOptions): Promise<this> {
		const fullPath = options?.root
			? joinPath(options.root, filePath)
			: filePath;

		// Path traversal protection
		const resolved = resolve(fullPath);
		const root = options?.root ? resolve(options.root) : null;
		if (root !== null && !resolved.startsWith(root)) {
			this._statusCode = HttpStatus.FORBIDDEN;
			this._body = null;
			return this;
		}

		try {
			const stats = await statAsync(fullPath);

			if (!stats.isFile()) {
				this._statusCode = HttpStatus.NOT_FOUND;
				this._body = null;
				return this;
			}

			const ext = extname(fullPath);
			const mimeType = MIME_TYPES[ext] ?? "application/octet-stream";

			this._headers.set("content-type", mimeType);
			this._headers.set("content-length", String(stats.size));

			if (options?.cacheControl !== false) {
				const maxAge = options?.maxAge ?? 0;
				this._headers.set("cache-control", `public, max-age=${maxAge}`);
			}

			if (options?.lastModified !== false) {
				this._headers.set("last-modified", stats.mtime.toUTCString());
			}

			if (options?.headers !== undefined) {
				for (const [key, value] of Object.entries(options.headers)) {
					this._headers.set(key, value);
				}
			}

			this.flushHeaders();
			this.raw.statusCode = this._statusCode;
			const readStream = createReadStream(fullPath);
			readStream.pipe(this.raw);
			readStream.on("end", () => {
				this._sent = true;
			});
			readStream.on("error", () => {
				if (!this._sent) {
					this._sent = true;
					this.raw.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
					this.raw.end();
				}
			});
		} catch {
			this._statusCode = HttpStatus.NOT_FOUND;
			this._body = null;
		}

		return this;
	}

	async download(filePath: string, filename?: string): Promise<this> {
		const downloadName = filename ?? basename(filePath);

		this._headers.set(
			"content-disposition",
			`attachment; filename="${downloadName}"`,
		);

		await this.file(filePath);
		return this;
	}

	attachment(filename?: string): this {
		if (filename !== undefined) {
			this._headers.set(
				"content-disposition",
				`attachment; filename="${filename}"`,
			);
		} else {
			this._headers.set("content-disposition", "attachment");
		}
		return this;
	}

	cookie(name: string, value: string, options?: CookieOptions): this {
		this._cookies.push(serializeCookie(name, value, options));
		return this;
	}

	clearCookie(name: string, options?: CookieOptions): this {
		this._cookies.push(clearCookie(name, options));
		return this;
	}

	get statusCode(): number {
		return this._statusCode;
	}

	get headersSent(): boolean {
		return this._sent;
	}

	get rawResponse(): ServerResponse {
		return this.raw;
	}

	async flush(): Promise<void> {
		if (this._sent) return;
		this._sent = true;

		this.flushHeaders();

		this.raw.statusCode = this._statusCode;

		if (this._body !== null) {
			this.raw.end(this._body);
		} else {
			this.raw.end();
		}
	}

	private flushHeaders(): void {
		if (this._cookies.length > 0) {
			this.raw.setHeader("Set-Cookie", this._cookies);
		}

		for (const [name, value] of this._headers.entries()) {
			if (name.toLowerCase() !== "set-cookie") {
				this.raw.setHeader(name, value);
			}
		}
	}
}

function joinPath(root: string, filePath: string): string {
	const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
	const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\//, "");
	return `${normalizedRoot}/${normalizedPath}`;
}
