import type { SuperResponse } from "./http/response";

let defaultBuilder: URLBuilder | null = null;

export class URLBuilder {
	private baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl = baseUrl ?? "http://localhost:3000";
	}

	route(_name: string, _params?: Record<string, string | number>): string {
		throw new Error(
			"URLBuilder.route() requires a Router reference. " +
				"Set the router via URLBuilder.setRouter() before calling route().",
		);
	}

	to(path: string): string {
		const normalized = path.replace(/\\/g, "/");
		const base = this.baseUrl.replace(/\/$/, "");
		const cleanPath = normalized.startsWith("/")
			? normalized
			: `/${normalized}`;
		return `${base}${cleanPath}`;
	}

	asset(path: string): string {
		return this.to(path);
	}

	secure(path: string): string {
		const base = this.baseUrl.replace(/^http:/, "https:");
		const normalized = path.replace(/\\/g, "/");
		const cleanPath = normalized.startsWith("/")
			? normalized
			: `/${normalized}`;
		return `${base}${cleanPath}`;
	}

	setBaseUrl(url: string): void {
		this.baseUrl = url;
	}

	getBaseUrl(): string {
		return this.baseUrl;
	}
}

export function url(): URLBuilder {
	if (defaultBuilder === null) {
		defaultBuilder = new URLBuilder();
	}
	return defaultBuilder;
}

const macroFns: Record<
	string,
	(this: SuperResponse, ...args: any[]) => SuperResponse
> = {};

export function responseMacros(response: SuperResponse): void {
	for (const [name, fn] of Object.entries(macroFns)) {
		const bound = fn.bind(response);
		(response as unknown as Record<string, unknown>)[name] = bound;
	}
}

export function registerMacro(
	name: string,
	fn: (this: SuperResponse, ...args: any[]) => SuperResponse,
): void {
	if (macroFns[name]) {
		console.warn(`Warning: Macro "${name}" is already registered. Overwriting.`);
	}
	macroFns[name] = fn;
}

registerMacro("success", function <
	T,
>(this: SuperResponse, data: T, message?: string) {
	return this.json({
		success: true,
		message: message ?? "Success",
		data,
	});
});

registerMacro(
	"error",
	function (this: SuperResponse, message: string, status: number = 400) {
		return this.json({ success: false, message }, status);
	},
);

registerMacro("created", function <
	T,
>(this: SuperResponse, data: T, message?: string) {
	return this.status(201).json({
		success: true,
		message: message ?? "Created",
		data,
	});
});

registerMacro("noContent", function (this: SuperResponse) {
	return this.status(204).send("");
});

registerMacro(
	"accepted",
	function (this: SuperResponse, data?: unknown, message?: string) {
		return this.status(202).json({
			success: true,
			message: message ?? "Accepted",
			data,
		});
	},
);

registerMacro(
	"paginated",
	function <T>(
		this: SuperResponse,
		data: T[],
		meta: {
			total: number;
			page: number;
			perPage: number;
			lastPage: number;
		},
	) {
		return this.json({
			success: true,
			data,
			meta,
		});
	},
);
