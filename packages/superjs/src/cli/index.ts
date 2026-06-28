#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { generateComponent } from "./generate.js";
import { scaffoldProject } from "./scaffold.js";
import { banner, readPackageVersion } from "./utils.js";

const program = new Command();

program
	.name("superjs")
	.description("SuperJS CLI — Fullstack JavaScript Framework")
	.version(readPackageVersion(), "-v, --version", "Lihat versi");

program
	.command("init")
	.aliases(["create", "new"])
	.description("Buat project SuperJS baru — Create a new SuperJS project")
	.argument("[name]", "Nama project", "my-superjs-app")
	.option(
		"-t, --template <template>",
		"Template project: blank (default), fullstack, api-only",
		"blank",
	)
	.option(
		"-f, --frontend <framework>",
		"Frontend framework: super (default), react, vue",
		"super",
	)
	.option(
		"-p, --package-manager <manager>",
		"Package manager: npm (default), pnpm, yarn",
		"npm",
	)
	.option("--no-git", "Skip git init")
	.option("--no-install", "Skip dependency install")
	.action(
		async (
			name: string,
			options: {
				template: string;
				frontend: string;
				packageManager: string;
				git: boolean;
				install: boolean;
			},
		) => {
			console.log(banner());
			await scaffoldProject(name, options);
		},
	);

const generateCmd = program
	.command("generate")
	.aliases(["g", "make"])
	.description(
		"Generate komponen baru: controller, middleware, schema, module",
	);

generateCmd
	.command("controller <name>")
	.aliases(["ctrl", "c"])
	.description("Generate controller baru")
	.action((name: string) => generateComponent("controller", name));

generateCmd
	.command("middleware <name>")
	.aliases(["mw", "m"])
	.description("Generate middleware baru")
	.action((name: string) => generateComponent("middleware", name));

generateCmd
	.command("schema <name>")
	.aliases(["s"])
	.description("Generate schema validasi baru")
	.action((name: string) => generateComponent("schema", name));

generateCmd
	.command("module <name>")
	.aliases(["mod"])
	.description("Generate module lengkap dengan service")
	.action((name: string) => generateComponent("module", name));

program
	.command("list-routes")
	.aliases(["routes", "lr"])
	.description("Lihat semua route yang terdaftar di project")
	.action(listRoutes);

program
	.command("make:controller <name>")
	.description("Generate controller baru (legacy)")
	.action((name: string) => generateComponent("controller", name));

program
	.command("make:middleware <name>")
	.description("Generate middleware baru (legacy)")
	.action((name: string) => generateComponent("middleware", name));

program
	.command("make:schema <name>")
	.description("Generate schema baru (legacy)")
	.action((name: string) => generateComponent("schema", name));

program
	.command("make:module <name>")
	.description("Generate module baru (legacy)")
	.action((name: string) => generateComponent("module", name));

program.parse(process.argv);

function listRoutes(): void {
	const routesDir = resolve(process.cwd(), "src/server/controllers");

	if (!existsSync(routesDir)) {
		console.log("  ℹ️  Tidak ada route terdaftar. Buat controller dulu dengan:");
		console.log("    superjs generate controller <name>");
		return;
	}

	const files = readdirSync(routesDir).filter((f: string) => f.endsWith(".ts"));

	if (files.length === 0) {
		console.log("  ℹ️  Tidak ada route terdaftar.");
		return;
	}

	console.log();
	console.log("  📋 Daftar Route:");
	console.log();

	for (const file of files) {
		const content = readFileSync(resolve(routesDir, file), "utf-8");
		const decorators = extractDecorators(content);

		if (decorators.length > 0) {
			console.log(`  ── ${file.replace(".controller.ts", "")} ──`);

			for (const { method, route } of decorators) {
				console.log(`    ${method.padEnd(8)} ${route}`);
			}

			console.log();
		}
	}
}

function extractDecorators(
	content: string,
): Array<{ method: string; route: string }> {
	const decoratorPattern =
		/@(get|post|put|patch|del|delete)\s*\(\s*'([^']+)'\s*\)/g;
	const results: Array<{ method: string; route: string }> = [];

	let match: RegExpExecArray | null = decoratorPattern.exec(content);
	while (match !== null) {
		const method =
			match[1] === "del" ? "DELETE" : (match[1] as string).toUpperCase();
		const route = match[2] as string;
		results.push({ method, route });
		match = decoratorPattern.exec(content);
	}

	return results;
}
