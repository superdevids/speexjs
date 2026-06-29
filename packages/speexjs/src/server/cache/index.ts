import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Middleware } from "../middleware";

export interface CacheConfig {
	store?: "memory" | "file";
	path?: string;
	ttl?: number;
	prefix?: string;
}

interface CacheEntry {
	value: unknown;
	expiresAt: number;
}

export class Cache {
	private store: Map<string, CacheEntry>;
	private config: Required<CacheConfig>;
	private hits = 0;
	private misses = 0;

	constructor(config?: CacheConfig) {
		this.config = {
			store: "memory",
			path: path.join(process.cwd(), "cache"),
			ttl: 3600,
			prefix: "",
			...config,
		};
		this.store = new Map();

		if (this.config.store === "file") {
			const dir = this.config.path;
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
		}
	}

	async get<T>(key: string): Promise<T | null> {
		const fullKey = this.config.prefix + key;

		if (this.config.store === "file") {
			return this.fileGet<T>(fullKey);
		}

		const entry = this.store.get(fullKey);
		if (entry === undefined) {
			this.misses++;
			return null;
		}

		if (this.isExpired(entry)) {
			this.store.delete(fullKey);
			this.misses++;
			return null;
		}

		this.hits++;
		return entry.value as T;
	}

	async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const value = await callback();
		await this.set(key, value, ttl);
		return value;
	}

	async set(key: string, value: unknown, ttl?: number): Promise<void> {
		const fullKey = this.config.prefix + key;
		const expiresAt =
			ttl !== undefined
				? Date.now() + ttl * 1000
				: Date.now() + this.config.ttl * 1000;

		if (this.config.store === "file") {
			await this.fileSet(fullKey, { value, expiresAt });
			return;
		}

		this.store.set(fullKey, { value, expiresAt });
	}

	async add(key: string, value: unknown, ttl?: number): Promise<boolean> {
		const exists = await this.has(key);
		if (exists) {
			return false;
		}

		await this.set(key, value, ttl);
		return true;
	}

	async delete(key: string): Promise<boolean> {
		const fullKey = this.config.prefix + key;

		if (this.config.store === "file") {
			return this.fileDelete(fullKey);
		}

		return this.store.delete(fullKey);
	}

	async clear(): Promise<void> {
		if (this.config.store === "file") {
			const dir = this.config.path;
			if (fs.existsSync(dir)) {
				for (const file of fs.readdirSync(dir)) {
					fs.unlinkSync(path.join(dir, file));
				}
			}
			return;
		}

		this.store.clear();
	}

	async has(key: string): Promise<boolean> {
		const value = await this.get(key);
		return value !== null;
	}

	async getMultiple(keys: string[]): Promise<Record<string, unknown>> {
		const result: Record<string, unknown> = {};
		for (const key of keys) {
			const value = await this.get(key);
			if (value !== null) {
				result[key] = value;
			}
		}
		return result;
	}

	async setMultiple(
		items: Record<string, unknown>,
		ttl?: number,
	): Promise<void> {
		for (const [key, value] of Object.entries(items)) {
			await this.set(key, value, ttl);
		}
	}

	// NOTE: increment/decrement are NOT atomic operations.
	// The read-modify-write sequence (get → compute → set) has a TOCTOU race
	// under concurrent access. For atomic counters, use a dedicated store
	// with compare-and-swap or a database transaction.
	async increment(key: string, value: number = 1): Promise<number> {
		const current = await this.get<number>(key);
		const newValue = (current ?? 0) + value;
		await this.set(key, newValue);
		return newValue;
	}

	async decrement(key: string, value: number = 1): Promise<number> {
		const current = await this.get<number>(key);
		const newValue = (current ?? 0) - value;
		await this.set(key, newValue);
		return newValue;
	}

	async forever(key: string, value: unknown): Promise<void> {
		const fullKey = this.config.prefix + key;
		const expiresAt = Number.MAX_SAFE_INTEGER;

		if (this.config.store === "file") {
			await this.fileSet(fullKey, { value, expiresAt });
			return;
		}

		this.store.set(fullKey, { value, expiresAt });
	}

	stats(): { hits: number; misses: number; keys: number; size: string } {
		let keyCount = 0;
		let totalSize = 0;

		if (this.config.store === "file") {
			const dir = this.config.path;
			if (fs.existsSync(dir)) {
				const files = fs.readdirSync(dir);
				keyCount = files.length;
				for (const file of files) {
					try {
						const st = fs.statSync(path.join(dir, file));
						totalSize += st.size;
					} catch {
						// skip
					}
				}
			}
		} else {
			keyCount = this.store.size;
			for (const [, entry] of this.store) {
				totalSize += JSON.stringify(entry).length;
			}
		}

		const sizeStr =
			totalSize > 1024 * 1024
				? `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
				: totalSize > 1024
					? `${(totalSize / 1024).toFixed(2)} KB`
					: `${totalSize} B`;

		return {
			hits: this.hits,
			misses: this.misses,
			keys: keyCount,
			size: sizeStr,
		};
	}

	private getFilePath(key: string): string {
		const hashedKey = crypto.createHash("md5").update(key).digest("hex");
		return path.join(this.config.path, `${hashedKey}.json`);
	}

	private isExpired(entry: CacheEntry): boolean {
		return entry.expiresAt < Date.now();
	}

	private fileGet<T>(key: string): T | null {
		const filePath = this.getFilePath(key);
		if (!fs.existsSync(filePath)) {
			this.misses++;
			return null;
		}

		try {
			const raw = fs.readFileSync(filePath, "utf-8");
			const entry: CacheEntry = JSON.parse(raw);

			if (this.isExpired(entry)) {
				fs.unlinkSync(filePath);
				this.misses++;
				return null;
			}

			this.hits++;
			return entry.value as T;
		} catch {
			this.misses++;
			return null;
		}
	}

	private fileSet(key: string, entry: CacheEntry): void {
		const filePath = this.getFilePath(key);
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(filePath, JSON.stringify(entry), "utf-8");
	}

	private fileDelete(key: string): boolean {
		const filePath = this.getFilePath(key);
		if (!fs.existsSync(filePath)) {
			return false;
		}
		fs.unlinkSync(filePath);
		return true;
	}
}

const responseCache = new Cache({ store: "memory" });

export function cacheResponse(ttl?: number): Middleware {
	const cache = responseCache;

	return async (ctx, next) => {
		const key = `_cache:${ctx.request.method}:${ctx.request.path}`;

		if (ctx.request.method !== "GET") {
			return next();
		}

		const cached = await cache.get<{
			body: string;
			status: number;
			contentType: string;
		}>(key);

		if (cached !== null) {
			ctx.response
				.status(cached.status)
				.type(cached.contentType)
				.send(cached.body);
			return;
		}

		await next();

		const body = ctx.response.body;

		if (body !== null && ctx.response.statusCode >= 200 && ctx.response.statusCode < 300) {
			const contentType =
				ctx.response.getHeader("content-type") ?? "text/plain";
			await cache.set(
				key,
				{
					body: typeof body === "string" ? body : body.toString(),
					status: ctx.response.statusCode,
					contentType,
				},
				ttl,
			);
		}
	};
}
