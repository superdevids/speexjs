export interface Dialect {
	wrapIdentifier(identifier: string): string;
	makeParameter(index: number): string;
	compileLimitOffset(
		bindings: any[],
		limit: number | null,
		offset: number | null,
	): string;
	compileInsertReturning(
		sql: string,
		bindings: any[],
		idColumn?: string,
	): string;
	compileTruncate(tableName: string): string;
	compileCreateMigrationsTable(): string;
	compileColumn(column: ColumnCompileOptions): string;
	compileModifyColumn(column: ColumnCompileOptions): string;
	compileTableBlueprint(
		tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string;
	compileAddColumns(tableName: string, columns: ColumnCompileOptions[]): string;
	compileDropColumns(tableName: string, columns: string[]): string;
	compileRenameColumn(tableName: string, from: string, to: string): string;
	compileCreateTable(
		tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string;
	compileRenameTable(from: string, to: string): string;
	compileDropTable(tableName: string): string;
	compileDropTableIfExists(tableName: string): string;
	compileHasTable(tableName: string): string;
	compileHasColumn(tableName: string, columnName: string): string;
	compileInsert(sql: string): string;
}

export interface ColumnCompileOptions {
	name: string;
	type: string;
	nullable: boolean;
	defaultValue: any;
	unsigned: boolean;
	unique: boolean;
	primary: boolean;
	index: boolean;
	comment: string | null;
	after: string | null;
	first: boolean;
	autoIncrement: boolean;
	precision: number | null;
	scale: number | null;
	length: number | null;
	values: string[] | null;
	isForeignId: boolean;
}

export class MysqlDialect implements Dialect {
	wrapIdentifier(identifier: string): string {
		return `\`${identifier.replace(/`/g, "``")}\``;
	}

	makeParameter(_index: number): string {
		return "?";
	}

	compileLimitOffset(
		bindings: any[],
		limit: number | null,
		offset: number | null,
	): string {
		if (limit === null && offset === null) return "";
		if (offset !== null) {
			bindings.push(limit ?? 0, offset);
			return " LIMIT ? OFFSET ?";
		}
		bindings.push(limit);
		return " LIMIT ?";
	}

	compileInsertReturning(
		sql: string,
		_bindings: any[],
		_idColumn?: string,
	): string {
		return `${sql}; SELECT LAST_INSERT_ID() as id`;
	}

	compileTruncate(tableName: string): string {
		return `TRUNCATE TABLE ${this.wrapIdentifier(tableName)}`;
	}

	compileCreateMigrationsTable(): string {
		return `CREATE TABLE IF NOT EXISTS \`migrations\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`batch\` INT NOT NULL,
  \`executed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;
	}

	private mapType(type: string, options: ColumnCompileOptions): string {
		switch (type) {
			case "id":
			case "increments":
				return "INT AUTO_INCREMENT PRIMARY KEY";
			case "bigIncrements":
				return "BIGINT AUTO_INCREMENT PRIMARY KEY";
			case "string":
				return `VARCHAR(${options.length ?? 255})`;
			case "text":
				return "TEXT";
			case "integer":
				return "INT";
			case "bigInteger":
				return "BIGINT";
			case "tinyInteger":
				return "TINYINT";
			case "smallInteger":
				return "SMALLINT";
			case "boolean":
				return "TINYINT(1)";
			case "float":
				return "FLOAT";
			case "double":
				return "DOUBLE";
			case "decimal":
				return `DECIMAL(${options.precision ?? 10},${options.scale ?? 0})`;
			case "date":
				return "DATE";
			case "datetime":
				return "DATETIME";
			case "timestamp":
				return "TIMESTAMP";
			case "time":
				return "TIME";
			case "year":
				return "YEAR";
			case "json":
			case "jsonb":
				return "JSON";
			case "binary":
				return "BLOB";
			case "uuid":
				return "CHAR(36)";
			case "foreignId":
				return "INT UNSIGNED";
			default:
				return type;
		}
	}

	compileColumn(options: ColumnCompileOptions): string {
		let sql = `${this.wrapIdentifier(options.name)} ${this.mapType(options.type, options)}`;
		if (
			options.unsigned &&
			options.type !== "id" &&
			options.type !== "increments" &&
			options.type !== "bigIncrements" &&
			options.type !== "foreignId"
		)
			sql += " UNSIGNED";
		if (
			options.autoIncrement &&
			options.type !== "id" &&
			options.type !== "increments" &&
			options.type !== "bigIncrements"
		)
			sql += " AUTO_INCREMENT";
		if (options.defaultValue !== undefined && options.defaultValue !== null) {
			sql += ` DEFAULT ${this.formatDefault(options.defaultValue)}`;
		} else if (
			!options.nullable &&
			!options.autoIncrement &&
			options.type !== "id" &&
			options.type !== "increments" &&
			options.type !== "bigIncrements"
		) {
			sql += " NOT NULL";
		}
		if (options.nullable) sql += " NULL";
		if (options.primary) sql += " PRIMARY KEY";
		if (options.unique) sql += " UNIQUE";
		if (options.comment !== null)
			sql += ` COMMENT '${options.comment.replace(/'/g, "\\'")}'`;
		if (options.after !== null)
			sql += ` AFTER ${this.wrapIdentifier(options.after)}`;
		return sql;
	}

	compileModifyColumn(options: ColumnCompileOptions): string {
		return `MODIFY COLUMN ${this.compileColumn(options)}`;
	}

	compileTableBlueprint(
		_tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string {
		const parts = [
			...columns.map((c) => this.compileColumn(c)),
			...constraints,
		];
		return parts.join(",\n  ");
	}

	compileAddColumns(
		_tableName: string,
		columns: ColumnCompileOptions[],
	): string {
		return `ADD ${columns.map((c) => this.compileColumn(c)).join(", ADD ")}`;
	}

	compileDropColumns(_tableName: string, columns: string[]): string {
		return `DROP COLUMN ${columns.map((c) => this.wrapIdentifier(c)).join(", DROP COLUMN ")}`;
	}

	compileRenameColumn(_tableName: string, from: string, to: string): string {
		return `RENAME COLUMN ${this.wrapIdentifier(from)} TO ${this.wrapIdentifier(to)}`;
	}

	compileCreateTable(
		tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string {
		const body = this.compileTableBlueprint(tableName, columns, constraints);
		return `CREATE TABLE ${this.wrapIdentifier(tableName)} (\n  ${body}\n)`;
	}

	compileRenameTable(from: string, to: string): string {
		return `RENAME TABLE ${this.wrapIdentifier(from)} TO ${this.wrapIdentifier(to)}`;
	}

	compileDropTable(tableName: string): string {
		return `DROP TABLE ${this.wrapIdentifier(tableName)}`;
	}

	compileDropTableIfExists(tableName: string): string {
		return `DROP TABLE IF EXISTS ${this.wrapIdentifier(tableName)}`;
	}

	compileHasTable(_tableName: string): string {
		return `SELECT COUNT(*) as \`count\` FROM \`information_schema\`.\`tables\` WHERE \`table_schema\` = DATABASE() AND \`table_name\` = ?`;
	}

	compileHasColumn(_tableName: string, _columnName: string): string {
		return `SELECT COUNT(*) as \`count\` FROM \`information_schema\`.\`columns\` WHERE \`table_schema\` = DATABASE() AND \`table_name\` = ? AND \`column_name\` = ?`;
	}

	compileInsert(sql: string): string {
		return sql;
	}

	private formatDefault(value: any): string {
		if (typeof value === "string") {
			if (value === "CURRENT_TIMESTAMP") return value;
			return `'${value.replace(/'/g, "\\'")}'`;
		}
		if (value === null) return "NULL";
		if (typeof value === "boolean") return value ? "1" : "0";
		return String(value);
	}
}

export class SqliteDialect implements Dialect {
	wrapIdentifier(identifier: string): string {
		return `"${identifier.replace(/"/g, '""')}"`;
	}

	makeParameter(_index: number): string {
		return "?";
	}

	compileLimitOffset(
		bindings: any[],
		limit: number | null,
		offset: number | null,
	): string {
		if (limit === null && offset === null) return "";
		if (offset !== null) {
			bindings.push(limit ?? 0, offset);
			return " LIMIT ? OFFSET ?";
		}
		bindings.push(limit);
		return " LIMIT ?";
	}

	compileInsertReturning(
		sql: string,
		_bindings: any[],
		_idColumn?: string,
	): string {
		return `${sql}; SELECT last_insert_rowid() as id`;
	}

	compileTruncate(tableName: string): string {
		return `DELETE FROM ${this.wrapIdentifier(tableName)}`;
	}

	compileCreateMigrationsTable(): string {
		return `CREATE TABLE IF NOT EXISTS "migrations" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "batch" INTEGER NOT NULL,
  "executed_at" TEXT DEFAULT CURRENT_TIMESTAMP
)`;
	}

	private mapType(type: string, options: ColumnCompileOptions): string {
		switch (type) {
			case "id":
			case "increments":
				return "INTEGER PRIMARY KEY AUTOINCREMENT";
			case "bigIncrements":
				return "INTEGER PRIMARY KEY AUTOINCREMENT";
			case "string":
				return `VARCHAR(${options.length ?? 255})`;
			case "text":
				return "TEXT";
			case "integer":
				return "INTEGER";
			case "bigInteger":
				return "INTEGER";
			case "tinyInteger":
				return "INTEGER";
			case "smallInteger":
				return "INTEGER";
			case "boolean":
				return "INTEGER";
			case "float":
				return "REAL";
			case "double":
				return "REAL";
			case "decimal":
				return "REAL";
			case "date":
				return "TEXT";
			case "datetime":
				return "TEXT";
			case "timestamp":
				return "TEXT";
			case "time":
				return "TEXT";
			case "year":
				return "TEXT";
			case "json":
			case "jsonb":
				return "TEXT";
			case "binary":
				return "BLOB";
			case "uuid":
				return "TEXT";
			case "foreignId":
				return "INTEGER";
			default:
				return type;
		}
	}

	compileColumn(options: ColumnCompileOptions): string {
		let sql = `${this.wrapIdentifier(options.name)} ${this.mapType(options.type, options)}`;
		if (
			options.autoIncrement &&
			options.type !== "id" &&
			options.type !== "increments" &&
			options.type !== "bigIncrements"
		)
			sql += " AUTOINCREMENT";
		if (
			!options.nullable &&
			options.defaultValue === undefined &&
			!options.autoIncrement &&
			options.type !== "id" &&
			options.type !== "increments" &&
			options.type !== "bigIncrements"
		)
			sql += " NOT NULL";
		if (options.nullable) sql += " NULL";
		if (options.defaultValue !== undefined && options.defaultValue !== null) {
			sql += ` DEFAULT ${this.formatDefault(options.defaultValue)}`;
		}
		if (options.primary) sql += " PRIMARY KEY";
		if (options.unique) sql += " UNIQUE";
		return sql;
	}

	compileModifyColumn(options: ColumnCompileOptions): string {
		return this.compileColumn(options);
	}

	compileTableBlueprint(
		_tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string {
		const parts = [
			...columns.map((c) => this.compileColumn(c)),
			...constraints,
		];
		return parts.join(",\n  ");
	}

	compileAddColumns(
		_tableName: string,
		columns: ColumnCompileOptions[],
	): string {
		return `ADD COLUMN ${columns.map((c) => this.compileColumn(c)).join(", ADD COLUMN ")}`;
	}

	compileDropColumns(_tableName: string, columns: string[]): string {
		return `DROP COLUMN ${columns.map((c) => this.wrapIdentifier(c)).join(", DROP COLUMN ")}`;
	}

	compileRenameColumn(_tableName: string, from: string, to: string): string {
		return `RENAME COLUMN ${this.wrapIdentifier(from)} TO ${this.wrapIdentifier(to)}`;
	}

	compileCreateTable(
		tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string {
		const body = this.compileTableBlueprint(tableName, columns, constraints);
		return `CREATE TABLE ${this.wrapIdentifier(tableName)} (\n  ${body}\n)`;
	}

	compileRenameTable(from: string, to: string): string {
		return `ALTER TABLE ${this.wrapIdentifier(from)} RENAME TO ${this.wrapIdentifier(to)}`;
	}

	compileDropTable(tableName: string): string {
		return `DROP TABLE ${this.wrapIdentifier(tableName)}`;
	}

	compileDropTableIfExists(tableName: string): string {
		return `DROP TABLE IF EXISTS ${this.wrapIdentifier(tableName)}`;
	}

	compileHasTable(_tableName: string): string {
		return `SELECT COUNT(*) as "count" FROM "sqlite_master" WHERE "type" = 'table' AND "name" = ?`;
	}

	compileHasColumn(_tableName: string, _columnName: string): string {
		return `PRAGMA table_info(${this.wrapIdentifier(_tableName)})`;
	}

	compileInsert(sql: string): string {
		return sql;
	}

	private formatDefault(value: any): string {
		if (typeof value === "string") {
			if (value === "CURRENT_TIMESTAMP") return value;
			return `'${value.replace(/'/g, "''")}'`;
		}
		if (value === null) return "NULL";
		if (typeof value === "boolean") return value ? "1" : "0";
		return String(value);
	}
}

export class PostgresqlDialect implements Dialect {
	wrapIdentifier(identifier: string): string {
		return `"${identifier.replace(/"/g, '""')}"`;
	}

	makeParameter(index: number): string {
		return `$${index + 1}`;
	}

	compileLimitOffset(
		bindings: any[],
		limit: number | null,
		offset: number | null,
	): string {
		if (limit === null && offset === null) return "";
		const start = bindings.length;
		if (offset !== null) {
			bindings.push(limit ?? 0, offset);
			return ` LIMIT $${start + 1} OFFSET $${start + 2}`;
		}
		bindings.push(limit);
		return ` LIMIT $${start + 1}`;
	}

	compileInsertReturning(
		sql: string,
		_bindings: any[],
		idColumn = "id",
	): string {
		return `${sql} RETURNING ${this.wrapIdentifier(idColumn)}`;
	}

	compileTruncate(tableName: string): string {
		return `TRUNCATE TABLE ${this.wrapIdentifier(tableName)} RESTART IDENTITY CASCADE`;
	}

	compileCreateMigrationsTable(): string {
		return `CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "batch" INTEGER NOT NULL,
  "executed_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;
	}

	private mapType(type: string, options: ColumnCompileOptions): string {
		switch (type) {
			case "id":
			case "increments":
				return "SERIAL PRIMARY KEY";
			case "bigIncrements":
				return "BIGSERIAL PRIMARY KEY";
			case "string":
				return `VARCHAR(${options.length ?? 255})`;
			case "text":
				return "TEXT";
			case "integer":
				return "INTEGER";
			case "bigInteger":
				return "BIGINT";
			case "tinyInteger":
				return "SMALLINT";
			case "smallInteger":
				return "SMALLINT";
			case "boolean":
				return "BOOLEAN";
			case "float":
				return "REAL";
			case "double":
				return "DOUBLE PRECISION";
			case "decimal":
				return `DECIMAL(${options.precision ?? 10},${options.scale ?? 0})`;
			case "date":
				return "DATE";
			case "datetime":
				return "TIMESTAMP";
			case "timestamp":
				return "TIMESTAMP";
			case "time":
				return "TIME";
			case "year":
				return "INTEGER";
			case "json":
				return "JSON";
			case "jsonb":
				return "JSONB";
			case "binary":
				return "BYTEA";
			case "uuid":
				return "UUID";
			case "foreignId":
				return "INTEGER";
			default:
				return type;
		}
	}

	compileColumn(options: ColumnCompileOptions): string {
		let sql = `${this.wrapIdentifier(options.name)} ${this.mapType(options.type, options)}`;
		if (
			!options.nullable &&
			options.type !== "id" &&
			options.type !== "increments" &&
			options.type !== "bigIncrements"
		)
			sql += " NOT NULL";
		if (options.nullable) sql += " NULL";
		if (options.defaultValue !== undefined && options.defaultValue !== null) {
			sql += ` DEFAULT ${this.formatDefault(options.defaultValue)}`;
		}
		if (
			options.primary &&
			options.type !== "id" &&
			options.type !== "increments" &&
			options.type !== "bigIncrements"
		)
			sql += " PRIMARY KEY";
		if (options.unique) sql += " UNIQUE";
		if (options.comment !== null)
			sql += ` -- ${options.comment.replace(/--/g, "")}`;
		return sql;
	}

	compileModifyColumn(options: ColumnCompileOptions): string {
		return `ALTER COLUMN ${this.wrapIdentifier(options.name)} TYPE ${this.mapType(options.type, options)}`;
	}

	compileTableBlueprint(
		_tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string {
		const parts = [
			...columns.map((c) => this.compileColumn(c)),
			...constraints,
		];
		return parts.join(",\n  ");
	}

	compileAddColumns(
		_tableName: string,
		columns: ColumnCompileOptions[],
	): string {
		return `ADD COLUMN ${columns.map((c) => this.compileColumn(c)).join(", ADD COLUMN ")}`;
	}

	compileDropColumns(_tableName: string, columns: string[]): string {
		return `DROP COLUMN ${columns.map((c) => this.wrapIdentifier(c)).join(", DROP COLUMN ")}`;
	}

	compileRenameColumn(_tableName: string, from: string, to: string): string {
		return `RENAME COLUMN ${this.wrapIdentifier(from)} TO ${this.wrapIdentifier(to)}`;
	}

	compileCreateTable(
		tableName: string,
		columns: ColumnCompileOptions[],
		constraints: string[],
	): string {
		const body = this.compileTableBlueprint(tableName, columns, constraints);
		return `CREATE TABLE ${this.wrapIdentifier(tableName)} (\n  ${body}\n)`;
	}

	compileRenameTable(from: string, to: string): string {
		return `ALTER TABLE ${this.wrapIdentifier(from)} RENAME TO ${this.wrapIdentifier(to)}`;
	}

	compileDropTable(_tableName: string): string {
		return `DROP TABLE IF EXISTS ${this.wrapIdentifier(_tableName)}`;
	}

	compileDropTableIfExists(tableName: string): string {
		return `DROP TABLE IF EXISTS ${this.wrapIdentifier(tableName)}`;
	}

	compileHasTable(_tableName: string): string {
		return `SELECT COUNT(*)::int as "count" FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = $1`;
	}

	compileHasColumn(_tableName: string, _columnName: string): string {
		return `SELECT COUNT(*)::int as "count" FROM "information_schema"."columns" WHERE "table_schema" = 'public' AND "table_name" = $1 AND "column_name" = $2`;
	}

	compileInsert(sql: string): string {
		return sql;
	}

	private formatDefault(value: any): string {
		if (typeof value === "string") {
			if (value === "CURRENT_TIMESTAMP") return value;
			return `'${value.replace(/'/g, "''")}'`;
		}
		if (value === null) return "NULL";
		if (typeof value === "boolean") return value ? "true" : "false";
		return String(value);
	}
}

export function createDialect(driver: string): Dialect {
	switch (driver) {
		case "mysql":
			return new MysqlDialect();
		case "sqlite":
			return new SqliteDialect();
		case "postgresql":
			return new PostgresqlDialect();
		default:
			return new MysqlDialect();
	}
}
