import { defineConfig } from "vitest/config.js";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.test.ts"],
		coverage: {
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/index.ts", "src/dep-exray/types.ts", "src/dep-exray/known-mappings.ts", "src/dep-exray/index.ts", "src/dep-exray/cli.ts"],
		},
	},
});
