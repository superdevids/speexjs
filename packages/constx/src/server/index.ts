import { Container } from "./container";
import { getControllerPrefix, getControllerRoutes } from "./controller";
import { NodeEngine, type ServerEngine, type ServerInstance } from "./engine";
import type { SuperRequest } from "./http/request";
import type { SuperResponse } from "./http/response";
import { HttpStatus } from "./http/status";
import {
	type Middleware,
	MiddlewarePipeline,
	type StaticOptions,
	staticFiles as staticFilesMiddleware,
} from "./middleware";
import type { ControllerClass } from "./router";
import { type RouteContext, type RouteHandler, Router } from "./router";

export { Cache, type CacheConfig, cacheResponse } from "./cache";
export * from "./database/index.js";
export { createEvent, Event, type EventConfig, event } from "./events";
export { registerMacro, responseMacros, URLBuilder, url } from "./helpers";
export {
	createStorage,
	LocalDisk,
	Storage,
	type StorageConfig,
	storage,
} from "./storage";

export interface ViewEngine {
	render(
		template: string,
		data: Record<string, unknown>,
	): string | Promise<string>;
}

export interface AppOptions {
	engine?: ServerEngine;
	container?: Container;
}

export class SuperApp {
	readonly router: Router;
	readonly container: Container;
	private engine: ServerEngine;
	private serverInstance: ServerInstance | undefined;
	private globalPipeline: MiddlewarePipeline;
	private started = false;
	private serverPromise: Promise<void> | undefined;

	constructor(options: AppOptions = {}) {
		this.container = options.container ?? new Container();
		this.router = new Router();
		this.engine = options.engine ?? new NodeEngine();
		this.globalPipeline = new MiddlewarePipeline();

		this.container.instance("app", this);
		this.container.instance("router", this.router);
		this.container.instance("container", this.container);
	}

	use(middleware: Middleware): this {
		this.globalPipeline.use(middleware);
		return this;
	}

	get(path: string, handler: RouteHandler): this {
		this.router.get(path, handler);
		return this;
	}

	post(path: string, handler: RouteHandler): this {
		this.router.post(path, handler);
		return this;
	}

	put(path: string, handler: RouteHandler): this {
		this.router.put(path, handler);
		return this;
	}

	patch(path: string, handler: RouteHandler): this {
		this.router.patch(path, handler);
		return this;
	}

	delete(path: string, handler: RouteHandler): this {
		this.router.delete(path, handler);
		return this;
	}

	options(path: string, handler: RouteHandler): this {
		this.router.options(path, handler);
		return this;
	}

	any(path: string, handler: RouteHandler): this {
		this.router.any(path, handler);
		return this;
	}

	match(methods: string[], path: string, handler: RouteHandler): this {
		this.router.match(methods, path, handler);
		return this;
	}

	group(prefix: string, callback: (router: Router) => void): this {
		this.router.group(prefix, callback);
		return this;
	}

	resource(name: string, controller: ControllerClass): this {
		this.router.resource(name, controller);
		return this;
	}

	apiResource(name: string, controller: ControllerClass): this {
		this.router.apiResource(name, controller);
		return this;
	}

	controller(ctrl: ControllerClass): this {
		const prefix = getControllerPrefix(ctrl as object);
		const routes = getControllerRoutes(ctrl.prototype);

		for (const route of routes) {
			const handlerPath = `${prefix}${route.path}`;
			const handlerName = String(route.handler);

			this.router.match(
				[route.method],
				handlerPath,
				async (ctx: RouteContext) => {
					const instance = createControllerInstance(ctrl, ctx);
					const handlerFn = (instance as Record<string, unknown>)[handlerName];

					if (typeof handlerFn === "function") {
						await handlerFn.call(instance, ctx);
					} else {
						throw new Error(
							`Handler ${handlerName} not found on controller ${ctrl.name}`,
						);
					}
				},
			);
		}

		return this;
	}

	middleware(middleware: Middleware | Middleware[]): this {
		this.router.middleware(middleware);
		return this;
	}

	setEngine(engine: ServerEngine): this {
		if (this.started) {
			throw new Error("Cannot change engine after server has started");
		}
		this.engine = engine;
		return this;
	}

	static(path: string, options?: StaticOptions): this {
		this.use(staticFilesMiddleware(path, options));
		return this;
	}

	view(_engine: ViewEngine): this {
		return this;
	}

	getServer(): ServerInstance | undefined {
		return this.serverInstance;
	}

	async start(port?: number, host?: string): Promise<void> {
		if (this.started) {
			throw new Error("Server has already been started");
		}
		this.started = true;

		this.serverInstance = await this.engine.createServer(
			async (req: SuperRequest, res: SuperResponse) => {
				await this.handleRequest(req, res);
			},
		);

		const listenPort = port ?? 3000;
		const listenHost = host ?? "0.0.0.0";

		return new Promise<void>((resolve) => {
			const raw = this.serverInstance!.raw;
			raw.listen(listenPort, listenHost, () => {
				resolve();
			});
		});
	}

	listen(port?: number, callback?: () => void): void {
		this.serverPromise = this.start(port).then(() => {
			callback?.();
		});
	}

	async close(): Promise<void> {
		if (this.serverInstance !== undefined) {
			await this.engine.close(this.serverInstance);
			this.serverInstance = undefined;
			this.started = false;
		}
	}

	async ready(): Promise<void> {
		if (this.serverPromise !== undefined) {
			await this.serverPromise;
		}
	}

	private async handleRequest(
		req: SuperRequest,
		res: SuperResponse,
	): Promise<void> {
		const resolvedRoute = this.router.resolve(req.method, req.path);

		if (resolvedRoute === null) {
			res.status(HttpStatus.NOT_FOUND).json({
				error: "Not Found",
				message: `Route ${req.method} ${req.path} not found`,
			});
			await res.flush();
			return;
		}

		req.params = resolvedRoute.params;

		const ctx: RouteContext = {
			request: req,
			response: res,
			params: resolvedRoute.params,
			query: req.query,
			container: this.container,
		};

		await this.globalPipeline.run(ctx, async () => {
			const routePipeline = new MiddlewarePipeline();
			for (const mw of resolvedRoute.middleware) {
				routePipeline.use(mw);
			}

			await routePipeline.run(ctx, async () => {
				await resolvedRoute.handler(ctx);
			});
		});

		if (!res.headersSent) {
			await res.flush();
		}
	}
}

export function speexjs(options?: AppOptions): SuperApp {
	return new SuperApp(options);
}

function createControllerInstance(
	controller: ControllerClass,
	ctx: RouteContext,
): object {
	const instance = new controller();
	(instance as Record<string, unknown>).__ctx = ctx;
	(instance as Record<string, unknown>).__container = ctx.container;
	return instance;
}
