import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function toPascalCase(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? "").toUpperCase())
		.replace(/^(.)/, (c: string) => c.toUpperCase());
}

export function toKebabCase(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

export function toCamelCase(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? "").toUpperCase())
		.replace(/^(.)/, (c: string) => c.toLowerCase());
}

export function toSnakeCase(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
		.toLowerCase();
}

export function banner(): string {
	return `
╔══════════════════════════════════╗
║        SuperJS 🚀               ║
║  Fullstack JavaScript Framework  ║
║  🇮🇩 Indonesia First             ║
╚══════════════════════════════════╝
  `;
}

export function resolveTargetDir(
	baseDir: string,
	type: string,
	_name: string,
): string {
	const dirs: Record<string, string> = {
		controller: "src/server/controllers",
		middleware: "src/server/middleware",
		schema: "src/schema",
		module: "src/modules",
	};

	const subDir = dirs[type] ?? `src/${type}s`;
	return resolve(baseDir, subDir);
}

export function readPackageVersion(): string {
	try {
		const pkgPath = resolve(process.cwd(), "node_modules/superjs/package.json");
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
				version?: string;
			};
			return pkg.version ?? "0.1.0";
		}

		const localPkgPath = resolve(
			import.meta.dirname ?? __dirname,
			"../../package.json",
		);
		if (existsSync(localPkgPath)) {
			const pkg = JSON.parse(readFileSync(localPkgPath, "utf-8")) as {
				version?: string;
			};
			return pkg.version ?? "0.1.0";
		}
	} catch {
		// fallback
	}

	return "0.1.0";
}

export function success(message: string): void {
	console.log(`  ✅ ${message}`);
}

export function info(message: string): void {
	console.log(`  ℹ️  ${message}`);
}

export function error(message: string): void {
	console.error(`  ❌ ${message}`);
}
