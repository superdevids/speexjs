import type { Dialect } from "./dialect.js";

export type DatabaseDriver = "mysql" | "sqlite" | "postgresql";
export type JoinType = "inner" | "left" | "right" | "cross";
export type OrderDirection = "asc" | "desc";

export interface ConnectionConfig {
	driver?: DatabaseDriver;
	host?: string;
	port?: number;
	database: string;
	username?: string;
	password?: string;
	charset?: string;
	prefix?: string;
}

export interface QueryResult {
	rows: any[];
	fields?: any[];
}

export interface QueryRunner {
	raw(sql: string, bindings?: any[]): Promise<QueryResult>;
	getDialect(): Dialect;
	getPrefix(): string;
	getDriver(): DatabaseDriver;
}
