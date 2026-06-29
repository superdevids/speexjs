import type { Container } from "../container";
import type { SuperRequest } from "../http/request";
import type { SuperResponse } from "../http/response";
import type { Middleware } from "../middleware";
import { createControllerInstance } from "../index.js";

export type RouteHandler = (ctx: RouteContext) => void | Promise<void> | SuperResponse | Promise<SuperResponse>;

export interface RouteContext {
	request: SuperRequest;
	response: SuperResponse;
	params: Record<string, string>;
	query: Record<string, string | string[]>;
	container: Container;
}

export interface ResolvedRoute {
	handler: RouteHandler;
	params: Record<string, string>;
	middleware: Middleware[];
}

interface RouteEntry {
	methods: string[];
	path: string;
	handler: RouteHandler;
	middleware: Middleware[];
	name?: string;
	regexp: RegExp;
	paramKeys: string[];
}

export interface ControllerClass {
	new (...args: unknown[]): object;
}

interface ResourceActions {
	index?: string;
	create?: string;
	store?: string;
	show?: string;
	edit?: string;
	update?: string;
	destroy?: string;
}

export class Router {
	private routes: RouteEntry[] = [];
	private groupMiddleware: Middleware[] = [];
	private groupPrefix = "";
	private namedRoutes = new Map<string, RouteEntry>();
	private resolveCache = new Map<string, ResolvedRoute | null>();
	private resolveCacheMaxSize = 1000;

	get(path: string, handler: RouteHandler): this {
		return this.match(["GET"], path, handler);
	}

	post(path: string, handler: RouteHandler): this {
		return this.match(["POST"], path, handler);
	}

	put(path: string, handler: RouteHandler): this {
		return this.match(["PUT"], path, handler);
	}

	patch(path: string, handler: RouteHandler): this {
		return this.match(["PATCH"], path, handler);
	}

	delete(path: string, handler: RouteHandler): this {
		return this.match(["DELETE"], path, handler);
	}

	options(path: string, handler: RouteHandler): this {
		return this.match(["OPTIONS"], path, handler);
	}

	any(path: string, handler: RouteHandler): this {
		return this.match(
			["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			path,
			handler,
		);
	}

	match(methods: string[], path: string, handler: RouteHandler): this {
		const fullPath = this.groupPrefix + normalizePath(path);
		const { regexp, keys } = pathToRegexp(fullPath);
		this.resolveCache.clear();

		this.routes.push({
			methods: methods.map((m) => m.toUpperCase()),
			path: fullPath,
			handler,
			middleware: [...this.groupMiddleware],
			regexp,
			paramKeys: keys,
		});

		return this;
	}

	group(prefix: string, callback: (router: Router) => void): this {
		const previousPrefix = this.groupPrefix;
		const previousMiddleware = [...this.groupMiddleware];

		this.groupPrefix = previousPrefix + normalizePath(prefix);

		callback(this);

		this.groupPrefix = previousPrefix;
		this.groupMiddleware = previousMiddleware;

		return this;
	}

	resource(name: string, controller: ControllerClass): this {
		const actions: ResourceActions = {
			index: "index",
			create: "create",
			store: "store",
			show: "show",
			edit: "edit",
			update: "update",
			destroy: "destroy",
		};

		return this.registerResourceRoutes(name, controller, actions);
	}

	apiResource(name: string, controller: ControllerClass): this {
		const actions: ResourceActions = {
			index: "index",
			store: "store",
			show: "show",
			update: "update",
			destroy: "destroy",
		};

		return this.registerResourceRoutes(name, controller, actions);
	}

	private registerResourceRoutes(
		name: string,
		controller: ControllerClass,
		actions: ResourceActions,
	): this {
		const basePath = normalizePath(name);
		const paramName = singularize(name);

		if (actions.index !== undefined) {
			this.get(
				basePath,
				this.createControllerHandler(controller, actions.index),
			);
		}

		if (actions.create !== undefined) {
			this.get(
				`${basePath}/create`,
				this.createControllerHandler(controller, actions.create),
			);
		}

		if (actions.store !== undefined) {
			this.post(
				basePath,
				this.createControllerHandler(controller, actions.store),
			);
		}

		if (actions.show !== undefined) {
			this.get(
				`${basePath}/:${paramName}`,
				this.createControllerHandler(controller, actions.show),
			);
		}

		if (actions.edit !== undefined) {
			this.get(
				`${basePath}/:${paramName}/edit`,
				this.createControllerHandler(controller, actions.edit),
			);
		}

		if (actions.update !== undefined) {
			this.put(
				`${basePath}/:${paramName}`,
				this.createControllerHandler(controller, actions.update),
			);
			this.patch(
				`${basePath}/:${paramName}`,
				this.createControllerHandler(controller, actions.update),
			);
		}

		if (actions.destroy !== undefined) {
			this.delete(
				`${basePath}/:${paramName}`,
				this.createControllerHandler(controller, actions.destroy),
			);
		}

		return this;
	}

	private createControllerHandler(
		controller: ControllerClass,
		action: string,
	): RouteHandler {
		return async (ctx: RouteContext) => {
			const instance = createControllerInstance(controller, ctx);
			const handler = (instance as Record<string, unknown>)[action];
			if (typeof handler === "function") {
				await handler.call(instance, ctx);
			} else {
				throw new Error(
					`Action ${action} not found on controller ${controller.name}`,
				);
			}
		};
	}

	middleware(middleware: Middleware | Middleware[]): this {
		const mw = Array.isArray(middleware) ? middleware : [middleware];
		this.groupMiddleware.push(...mw);
		return this;
	}

	name(name: string): this {
		if (this.routes.length > 0) {
			const lastRoute = this.routes[this.routes.length - 1];
			if (lastRoute !== undefined) {
				lastRoute.name = name;
				this.namedRoutes.set(name, lastRoute);
			}
		}
		return this;
	}

	route(name: string, params?: Record<string, string>): string {
		const entry = this.namedRoutes.get(name);
		if (entry === undefined) {
			throw new Error(`Route not found: ${name}`);
		}

		let url = entry.path;
		if (params !== undefined) {
			for (const [key, value] of Object.entries(params)) {
				url = url.replace(`:${key}`, encodeURIComponent(value));
			}
		}

		return url;
	}

	resolve(method: string, path: string): ResolvedRoute | null {
		const normalizedPath = normalizePath(path);
		const upperMethod = method.toUpperCase();
		const cacheKey = `${upperMethod}:${normalizedPath}`;

		const cached = this.resolveCache.get(cacheKey);
		if (cached !== undefined) return cached;

		for (const route of this.routes) {
			if (!route.methods.includes(upperMethod)) continue;

			const match = normalizedPath.match(route.regexp);
			if (match === null) continue;

			const params: Record<string, string> = {};
			for (let i = 0; i < route.paramKeys.length; i++) {
				const key = route.paramKeys[i];
				const value = match[i + 1];
				if (key !== undefined && value !== undefined) {
					params[key] = decodeURIComponent(value);
				}
			}

			const result: ResolvedRoute = {
				handler: route.handler,
				params,
				middleware: route.middleware,
			};
			if (this.resolveCache.size >= this.resolveCacheMaxSize) {
				const firstKey = this.resolveCache.keys().next().value;
				if (firstKey !== undefined) this.resolveCache.delete(firstKey);
			}
			this.resolveCache.set(cacheKey, result);
			return result;
		}

		if (this.resolveCache.size >= this.resolveCacheMaxSize) {
			const firstKey = this.resolveCache.keys().next().value;
			if (firstKey !== undefined) this.resolveCache.delete(firstKey);
		}
		this.resolveCache.set(cacheKey, null);
		return null;
	}

	getRoutes(): RouteEntry[] {
		return [...this.routes];
	}

	getNamedRoutes(): Map<string, RouteEntry> {
		return new Map(this.namedRoutes);
	}
}

function normalizePath(path: string): string {
	let normalized = path.replace(/\\/g, "/");

	if (!normalized.startsWith("/")) {
		normalized = "/" + normalized;
	}

	if (normalized.length > 1 && normalized.endsWith("/")) {
		normalized = normalized.slice(0, -1);
	}

	return normalized;
}

const pathRegexCache = new Map<string, { regexp: RegExp; keys: string[] }>();

function pathToRegexp(pattern: string): { regexp: RegExp; keys: string[] } {
	const cached = pathRegexCache.get(pattern);
	if (cached !== undefined) return cached;

	const keys: string[] = [];

	const regexpStr = pattern
		.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match: string, key: string) => {
			keys.push(key);
			return "([^/]+)";
		})
		.replace(/\*/g, ".*?");

	const result = { regexp: new RegExp(`^${regexpStr}$`), keys };
	pathRegexCache.set(pattern, result);
	return result;
}

function singularize(word: string): string {
	const lastChar = word[word.length - 1];
	if (lastChar === "s") return word.slice(0, -1);
	if (lastChar === "S") return word.slice(0, -1);
	return word;
}


