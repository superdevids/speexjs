import { randomUUID } from "node:crypto";
import { createDriver, type Dialect, type Driver } from "./driver.js";
import { QueryBuilder } from "./query.js";
import type {
	ConnectionConfig,
	DatabaseDriver,
	QueryResult,
	QueryRunner,
} from "./types.js";

export type { ConnectionConfig, DatabaseDriver, QueryResult };

export class DatabaseConnection implements QueryRunner {
	private config: ConnectionConfig;
	private driver: Driver | null = null;

	constructor(config: ConnectionConfig) {
		this.config = {
			driver: "mysql",
			host: "127.0.0.1",
			charset: "utf8mb4",
			prefix: "",
			...config,
		};

		if (this.config.port === undefined) {
			if (this.config.driver === "mysql") this.config.port = 3306;
			else if (this.config.driver === "postgresql") this.config.port = 5432;
		}
	}

	async connect(): Promise<void> {
		if (this.driver !== null) return;
		this.driver = await createDriver(this.config);
		await this.driver.connect();
	}

	async disconnect(): Promise<void> {
		if (this.driver !== null) {
			await this.driver.disconnect();
			this.driver = null;
		}
	}

	async raw(sql: string, bindings?: any[]): Promise<QueryResult> {
		this.ensureConnected();
		return this.driver!.raw(sql, bindings);
	}

	table(tableName: string): QueryBuilder {
		return new QueryBuilder(this, `${this.config.prefix ?? ""}${tableName}`);
	}

	isConnected(): boolean {
		return this.driver !== null && this.driver.isConnected();
	}

	getDriver(): DatabaseDriver {
		return (this.config.driver ?? "mysql") as DatabaseDriver;
	}

	getDialect(): Dialect {
		this.ensureConnected();
		return this.driver!.getDialect();
	}

	getPrefix(): string {
		return this.config.prefix ?? "";
	}

	getConfig(): Readonly<ConnectionConfig> {
		return { ...this.config };
	}

	async transaction<T>(
		callback: (trx: DatabaseConnection) => Promise<T>,
	): Promise<T> {
		this.ensureConnected();

		return this.driver!.transaction(async (_driver: Driver) => {
			const trxConnection = new DatabaseConnection(this.config);
			trxConnection["driver"] = this.driver;

			trxConnection.raw = async (
				sql: string,
				bindings?: any[],
			): Promise<QueryResult> => {
				return this.driver!.raw(sql, bindings);
			};

			return callback(trxConnection);
		});
	}

	static generateId(): string {
		return randomUUID();
	}

	private ensureConnected(): void {
		if (this.driver === null || !this.driver.isConnected()) {
			throw new Error(
				"Database not connected. Call connect() before performing operations.",
			);
		}
	}
}
