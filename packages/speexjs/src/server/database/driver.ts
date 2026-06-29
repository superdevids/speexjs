import {
	type Dialect,
	MysqlDialect,
	PostgresqlDialect,
	SqliteDialect,
} from "./dialect.js";
export type { Dialect }
import type { ConnectionConfig, QueryResult } from "./types.js";

export interface Driver {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	isConnected(): boolean;
	raw(sql: string, bindings?: any[]): Promise<QueryResult>;
	transaction<T>(callback: (driver: Driver) => Promise<T>): Promise<T>;
	getDialect(): Dialect;
	getDriver(): string;
}

export async function createDriver(config: ConnectionConfig): Promise<Driver> {
	const driverType = config.driver ?? "mysql";

	switch (driverType) {
		case "mysql":
			return createMysqlDriver(config);
		case "postgresql":
			return createPostgresqlDriver(config);
		case "sqlite":
			return createSqliteDriver(config);
		default:
			return createMysqlDriver(config);
	}
}

async function createMysqlDriver(config: ConnectionConfig): Promise<Driver> {
	let mysqlPackage: any;
	try {
		// @ts-expect-error - mysql2 is an optional runtime dependency
		mysqlPackage = await import("mysql2/promise");
	} catch {
		throw new Error(
			"MySQL driver (mysql2) is not installed. Run: npm install mysql2",
		);
	}

	let pool: any = null;
	const dialect = new MysqlDialect();

	const driver: Driver = {
		async connect(): Promise<void> {
			pool = mysqlPackage.createPool({
				host: config.host ?? "127.0.0.1",
				port: config.port ?? 3306,
				user: config.username,
				password: config.password,
				database: config.database,
				charset: config.charset ?? "utf8mb4",
				waitForConnections: true,
				connectionLimit: 10,
				queueLimit: 100,
			});
			// Verify connection
			const conn = await pool.getConnection();
			conn.release();
		},

		async disconnect(): Promise<void> {
			if (pool !== null) {
				await pool.end();
				pool = null;
			}
		},

		isConnected(): boolean {
			return pool !== null;
		},

		async raw(sql: string, bindings?: any[]): Promise<QueryResult> {
			if (pool === null) {
				throw new Error("Database not connected. Call connect() first.");
			}
			const [rows, fields] = await pool.execute(sql, bindings ?? []);
			return { rows, fields };
		},

		async transaction<T>(callback: (d: Driver) => Promise<T>): Promise<T> {
			if (pool === null) throw new Error("Database not connected.");
			const conn = await pool.getConnection();
			try {
				await conn.beginTransaction();
				const trxDriver: Driver = {
					...driver,
					async raw(sql: string, bindings?: any[]): Promise<QueryResult> {
						const [rows, fields] = await conn.execute(sql, bindings ?? []);
						return { rows, fields };
					},
					getDialect(): Dialect { return dialect; },
					getDriver(): string { return "mysql"; },
				};
				const result = await callback(trxDriver);
				await conn.commit();
				return result;
			} catch (err) {
				await conn.rollback();
				throw err;
			} finally {
				conn.release();
			}
		},

		getDialect(): Dialect {
			return dialect;
		},

		getDriver(): string {
			return "mysql";
		},
	};

	return driver;
}

async function createPostgresqlDriver(
	config: ConnectionConfig,
): Promise<Driver> {
	let pgPackage: any;
	try {
		// @ts-expect-error - pg is an optional runtime dependency
		pgPackage = await import("pg");
	} catch {
		throw new Error(
			"PostgreSQL driver (pg) is not installed. Run: npm install pg",
		);
	}

	let pool: any = null;
	const dialect = new PostgresqlDialect();

	const driver: Driver = {
		async connect(): Promise<void> {
			const { Pool } = pgPackage;
			pool = new Pool({
				host: config.host ?? "127.0.0.1",
				port: config.port ?? 5432,
				user: config.username,
				password: config.password,
				database: config.database,
			});
			await pool.query("SELECT 1");
		},

		async disconnect(): Promise<void> {
			if (pool !== null) {
				await pool.end();
				pool = null;
			}
		},

		isConnected(): boolean {
			return pool !== null;
		},

		async raw(sql: string, bindings?: any[]): Promise<QueryResult> {
			if (pool === null) {
				throw new Error("Database not connected. Call connect() first.");
			}
			const result = await pool.query(sql, bindings ?? []);
			return { rows: result.rows };
		},

		async transaction<T>(callback: (d: Driver) => Promise<T>): Promise<T> {
			if (pool === null) {
				throw new Error("Database not connected. Call connect() first.");
			}
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const trxDriver: Driver = {
					...driver,
					async raw(sql: string, bindings?: any[]): Promise<QueryResult> {
						const result = await client.query(sql, bindings ?? []);
						return { rows: result.rows };
					},
					getDialect(): Dialect {
						return dialect;
					},
					getDriver(): string {
						return "postgresql";
					},
				};
				const result = await callback(trxDriver);
				await client.query("COMMIT");
				return result;
			} catch (err) {
				await client.query("ROLLBACK");
				throw err;
			} finally {
				client.release();
			}
		},

		getDialect(): Dialect {
			return dialect;
		},

		getDriver(): string {
			return "postgresql";
		},
	};

	return driver;
}

async function createSqliteDriver(config: ConnectionConfig): Promise<Driver> {
	let sqlitePackage: any;
	try {
		// @ts-expect-error - better-sqlite3 is an optional runtime dependency
		sqlitePackage = await import("better-sqlite3");
	} catch {
		throw new Error(
			"SQLite driver (better-sqlite3) is not installed. Run: npm install better-sqlite3",
		);
	}

	let db: any = null;
	let connected = false;
	const dialect = new SqliteDialect();

	// NOTE: SQLite operations using better-sqlite3 are synchronous under the hood.
	// This is a documented limitation - the async interface wraps sync calls.
	const driver: Driver = {
		async connect(): Promise<void> {
			db = new sqlitePackage(config.database);
			db.pragma("journal_mode = WAL");
			connected = true;
		},

		async disconnect(): Promise<void> {
			if (db !== null) {
				db.close();
				db = null;
				connected = false;
			}
		},

		isConnected(): boolean {
			return connected;
		},

		async raw(sql: string, bindings?: any[]): Promise<QueryResult> {
			if (db === null) {
				throw new Error("Database not connected. Call connect() first.");
			}
			const trimmedSQL = sql.trim().toUpperCase();
			const isQuery =
				trimmedSQL.startsWith("SELECT") ||
				trimmedSQL.startsWith("WITH") ||
				trimmedSQL.startsWith("PRAGMA");
			const stmt = db.prepare(sql);
			if (isQuery) {
				const rows =
					bindings !== undefined && bindings.length > 0
						? stmt.all(...bindings)
						: stmt.all();
				return { rows };
			}
			if (bindings !== undefined && bindings.length > 0) {
				stmt.run(...bindings);
			} else {
				stmt.run();
			}
			return { rows: [] };
		},

		async transaction<T>(callback: (d: Driver) => Promise<T>): Promise<T> {
			if (db === null) {
				throw new Error("Database not connected. Call connect() first.");
			}
			db.exec("BEGIN");
			try {
				const result = await callback(driver);
				db.exec("COMMIT");
				return result;
			} catch (err) {
				db.exec("ROLLBACK");
				throw err;
			}
		},

		getDialect(): Dialect {
			return dialect;
		},

		getDriver(): string {
			return "sqlite";
		},
	};

	return driver;
}
