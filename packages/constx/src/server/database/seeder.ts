import type { DatabaseConnection } from "./connection.js";

export interface SeederClass {
	run(connection: DatabaseConnection): Promise<void>;
}

export class Seeder {
	private connection: DatabaseConnection;

	constructor(connection: DatabaseConnection) {
		this.connection = connection;
	}

	async call(seederClass: SeederClass): Promise<void> {
		await seederClass.run(this.connection);
	}

	async insert(table: string, data: Record<string, any>[]): Promise<void> {
		if (data.length === 0) return;

		const dialect = this.connection.getDialect();
		const firstRow = data[0];
		if (!firstRow) return;

		const columns = Object.keys(firstRow);
		const wrappedColumns = columns
			.map((c) => dialect.wrapIdentifier(c))
			.join(", ");

		const batchSize = 100;
		for (let i = 0; i < data.length; i += batchSize) {
			const batch = data.slice(i, i + batchSize);
			const placeholders: string[] = [];
			const bindings: any[] = [];

			for (const row of batch) {
				const rowPlaceholders = columns.map((col) => {
					bindings.push(row[col]);
					return dialect.makeParameter(bindings.length - 1);
				});
				placeholders.push(`(${rowPlaceholders.join(", ")})`);
			}

			const sql = `INSERT INTO ${dialect.wrapIdentifier(table)} (${wrappedColumns}) VALUES ${placeholders.join(", ")}`;
			await this.connection.raw(sql, bindings);
		}
	}

	async truncate(table: string): Promise<void> {
		const dialect = this.connection.getDialect();
		const driver = this.connection.getDriver();

		if (driver === "sqlite") {
			await this.connection.raw(`DELETE FROM ${dialect.wrapIdentifier(table)}`);
		} else if (driver === "postgresql") {
			await this.connection.raw(dialect.compileTruncate(table));
		} else {
			await this.connection.raw("SET FOREIGN_KEY_CHECKS = 0");
			await this.connection.raw(dialect.compileTruncate(table));
			await this.connection.raw("SET FOREIGN_KEY_CHECKS = 1");
		}
	}

	async run(): Promise<void> {
		throw new Error("Seeder.run() must be overridden by subclasses");
	}
}
