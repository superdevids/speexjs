import { EventEmitter } from "node:events";

export type EventHandler = (...args: any[]) => void | Promise<void>;

export interface EventConfig {
	wildcard?: boolean;
	maxListeners?: number;
}

interface PatternEntry {
	pattern: string;
	regex: RegExp;
	handler: EventHandler;
}

export class Event {
	private emitter: EventEmitter;
	private wildcardMode: boolean;
	private patterns: PatternEntry[] = [];

	constructor(config?: EventConfig) {
		this.emitter = new EventEmitter();
		this.wildcardMode = config?.wildcard ?? false;

		if (config?.maxListeners !== undefined) {
			this.emitter.setMaxListeners(config.maxListeners);
		}
	}

	on(event: string, handler: EventHandler): this {
		this.emitter.on(event, handler);
		return this;
	}

	addListener(event: string, handler: EventHandler): this {
		return this.on(event, handler);
	}

	once(event: string, handler: EventHandler): this {
		this.emitter.once(event, handler);
		return this;
	}

	emitLater(event: string, ...args: unknown[]): void {
		setImmediate(() => { this.emit(event, ...args).catch(() => {}) })
	}

	async emit(event: string, ...args: any[]): Promise<void> {
		const listeners = this.emitter.listeners(event);

		for (const listener of listeners) {
			const result = listener(...args) as unknown;
			if (result instanceof Promise) {
				await result;
			}
		}

		if (this.wildcardMode) {
			for (const entry of this.patterns) {
				if (entry.regex.test(event)) {
					const result = entry.handler(event, ...args) as unknown;
					if (result instanceof Promise) {
						await result;
					}
				}
			}
		}
	}

	off(event: string, handler: EventHandler): this {
		this.emitter.off(event, handler);
		return this;
	}

	removeListener(event: string, handler: EventHandler): this {
		return this.off(event, handler);
	}

	removeAllListeners(event?: string): this {
		if (event !== undefined) {
			this.emitter.removeAllListeners(event);
			this.patterns = this.patterns.filter((p) => p.pattern !== event);
		} else {
			this.emitter.removeAllListeners();
			this.patterns = [];
		}
		return this;
	}

	listeners(event: string): EventHandler[] {
		return this.emitter.listeners(event) as EventHandler[];
	}

	hasListeners(event: string): boolean {
		if (this.emitter.listenerCount(event) > 0) {
			return true;
		}

		if (this.wildcardMode) {
			for (const entry of this.patterns) {
				if (entry.regex.test(event)) {
					return true;
				}
			}
		}

		return false;
	}

	onPattern(pattern: string, handler: EventHandler): this {
		if (!this.wildcardMode) {
			throw new Error(
				"Pattern matching is not enabled. Set wildcard: true in EventConfig.",
			);
		}

		const regex = this.patternToRegex(pattern);
		this.patterns.push({ pattern, regex, handler });
		return this;
	}

	async ask<T>(event: string, ...args: any[]): Promise<T[]> {
		const handlers = this.emitter.listeners(event) as EventHandler[];
		const results: T[] = [];

		for (const handler of handlers) {
			const result = handler(...args) as unknown;
			if (result instanceof Promise) {
				const resolved = await result;
				if (resolved !== undefined) {
					results.push(resolved as T);
				}
			} else if (result !== undefined) {
				results.push(result as T);
			}
		}

		if (this.wildcardMode) {
			for (const entry of this.patterns) {
				if (entry.regex.test(event)) {
					const result = entry.handler(event, ...args) as unknown;
					if (result instanceof Promise) {
						const resolved = await result;
						if (resolved !== undefined) {
							results.push(resolved as T);
						}
					} else if (result !== undefined) {
						results.push(result as T);
					}
				}
			}
		}

		return results;
	}

	listenerCount(event?: string): number {
		if (event !== undefined) {
			let count = this.emitter.listenerCount(event);

			if (this.wildcardMode) {
				for (const entry of this.patterns) {
					if (entry.regex.test(event)) {
						count++;
					}
				}
			}

			return count;
		}

		return (
			this.emitter
				.eventNames()
				.reduce((sum, name) => sum + this.emitter.listenerCount(name), 0) +
			this.patterns.length
		);
	}

	eventNames(): string[] {
		const nativeNames = this.emitter.eventNames() as string[];
		const patternNames = this.patterns.map((p) => p.pattern);
		return [...new Set([...nativeNames, ...patternNames])];
	}

	private patternToRegex(pattern: string): RegExp {
		const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
		const regexStr = escaped.replace(/\*/g, "[^.]*");
		return new RegExp(`^${regexStr}$`);
	}
}

let defaultEvent: Event | null = null;

export function createEvent(config?: EventConfig): Event {
	defaultEvent = new Event(config);
	return defaultEvent;
}

export function event(): Event {
	if (defaultEvent === null) {
		defaultEvent = new Event();
	}
	return defaultEvent;
}
