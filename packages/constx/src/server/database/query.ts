import type { Dialect } from "./dialect.js";
import type { JoinType, OrderDirection, QueryRunner } from "./types.js";

interface WhereClause {
	type:
		| "basic"
		| "in"
		| "notIn"
		| "null"
		| "notNull"
		| "between"
		| "notBetween"
		| "like"
		| "nested";
	column?: string;
	operator?: string;
	value?: any;
	values?: any[];
	boolean: "and" | "or";
	nested?: WhereClause[];
}

interface JoinClause {
	table: string;
	first: string;
	operator: string;
	second: string;
	type: JoinType;
}

interface OrderByClause {
	column: string;
	direction: OrderDirection;
}

interface HavingClause {
	column: string;
	operator: string;
	value: any;
}

export interface PaginatedResult<T = any> {
	data: T[];
	currentPage: number;
	perPage: number;
	total: number;
	lastPage: number;
	from: number;
	to: number;
	hasMore: boolean;
	hasPrev: boolean;
	isEmpty: boolean;
}

export class QueryBuilder {
	private connection: QueryRunner;
	private tableName: string;
	private columns: string[] = ["*"];
	private distinctEnabled = false;
	private wheres: WhereClause[] = [];
	private joins: JoinClause[] = [];
	private orderBys: OrderByClause[] = [];
	private havings: HavingClause[] = [];
	private groupBys: string[] = [];
	private limitValue: number | null = null;
	private offsetValue: number | null = null;
	private fromSubquery: string | null = null;

	constructor(connection: QueryRunner, tableName: string) {
		this.connection = connection;
		this.tableName = tableName;
	}

	select(...columns: string[]): this {
		this.columns = columns.length > 0 ? columns : ["*"];
		return this;
	}

	addSelect(...columns: string[]): this {
		if (this.columns[0] === "*") {
			this.columns = columns;
		} else {
			this.columns.push(...columns);
		}
		return this;
	}

	distinct(): this {
		this.distinctEnabled = true;
		return this;
	}

	from(table: string): this {
		this.fromSubquery = table;
		return this;
	}

	where(column: string, operator: any, value?: any): this {
		if (value === undefined) {
			value = operator;
			operator = "=";
		}
		this.wheres.push({
			type: "basic",
			column,
			operator: String(operator),
			value,
			boolean: "and",
		});
		return this;
	}

	orWhere(column: string, operator: any, value?: any): this {
		if (value === undefined) {
			value = operator;
			operator = "=";
		}
		this.wheres.push({
			type: "basic",
			column,
			operator: String(operator),
			value,
			boolean: "or",
		});
		return this;
	}

	whereIn(column: string, values: any[]): this {
		this.wheres.push({ type: "in", column, values, boolean: "and" });
		return this;
	}

	whereNotIn(column: string, values: any[]): this {
		this.wheres.push({ type: "notIn", column, values, boolean: "and" });
		return this;
	}

	whereNull(column: string): this {
		this.wheres.push({ type: "null", column, boolean: "and" });
		return this;
	}

	whereNotNull(column: string): this {
		this.wheres.push({ type: "notNull", column, boolean: "and" });
		return this;
	}

	whereBetween(column: string, range: [any, any]): this {
		this.wheres.push({
			type: "between",
			column,
			values: range,
			boolean: "and",
		});
		return this;
	}

	whereNotBetween(column: string, range: [any, any]): this {
		this.wheres.push({
			type: "notBetween",
			column,
			values: range,
			boolean: "and",
		});
		return this;
	}

	whereLike(column: string, pattern: string): this {
		this.wheres.push({ type: "like", column, value: pattern, boolean: "and" });
		return this;
	}

	orWhereLike(column: string, pattern: string): this {
		this.wheres.push({ type: "like", column, value: pattern, boolean: "or" });
		return this;
	}

	whereGroup(callback: (query: QueryBuilder) => void): this {
		const subQuery = new QueryBuilder(this.connection, this.tableName);
		callback(subQuery);
		this.wheres.push({
			type: "nested",
			nested: subQuery.wheres,
			boolean: "and",
		});
		return this;
	}

	join(
		table: string,
		first: string,
		operator: string,
		second: string,
		type: JoinType = "inner",
	): this {
		this.joins.push({ table, first, operator, second, type });
		return this;
	}

	leftJoin(
		table: string,
		first: string,
		operator: string,
		second: string,
	): this {
		return this.join(table, first, operator, second, "left");
	}

	rightJoin(
		table: string,
		first: string,
		operator: string,
		second: string,
	): this {
		return this.join(table, first, operator, second, "right");
	}

	crossJoin(
		table: string,
		first: string,
		operator: string,
		second: string,
	): this {
		return this.join(table, first, operator, second, "cross");
	}

	orderBy(column: string, direction: OrderDirection = "asc"): this {
		this.orderBys.push({ column, direction });
		return this;
	}

	orderByDesc(column: string): this {
		return this.orderBy(column, "desc");
	}

	latest(column = "created_at"): this {
		return this.orderBy(column, "desc");
	}

	oldest(column = "created_at"): this {
		return this.orderBy(column, "asc");
	}

	inRandomOrder(): this {
		this.orderBys.push({ column: "RANDOM()", direction: "asc" });
		return this;
	}

	limit(limit: number): this {
		this.limitValue = limit;
		return this;
	}

	offset(offset: number): this {
		this.offsetValue = offset;
		return this;
	}

	skip(skip: number): this {
		return this.offset(skip);
	}

	take(take: number): this {
		return this.limit(take);
	}

	groupBy(...columns: string[]): this {
		this.groupBys.push(...columns);
		return this;
	}

	having(column: string, operator: string, value: any): this {
		this.havings.push({ column, operator, value });
		return this;
	}

	async get<T = any>(): Promise<T[]> {
		const { sql, bindings } = this.toSQL();
		const result = await this.connection.raw(sql, bindings);
		return result.rows as T[];
	}

	async first<T = any>(): Promise<T | null> {
		const qb = this.clone();
		qb.limitValue = 1;
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);
		return (result.rows.length > 0 ? result.rows[0] : null) as T | null;
	}

	async find<T = any>(id: number | string): Promise<T | null> {
		return this.where("id", id).first<T>();
	}

	async pluck(column: string): Promise<any[]> {
		const qb = this.clone();
		qb.columns = [column];
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);
		return result.rows.map((row: any) => row[column]);
	}

	async count(column = "*"): Promise<number> {
		const qb = this.clone();
		qb.columns = [
			`COUNT(${column === "*" ? "*" : this.wrap(column)}) as aggregate`,
		];
		qb.orderBys = [];
		qb.limitValue = null;
		qb.offsetValue = null;
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);
		const row = result.rows[0];
		if (!row) return 0;
		return Number(row.aggregate ?? row.count ?? row["COUNT(*)"] ?? 0);
	}

	async exists(): Promise<boolean> {
		const count = await this.count();
		return count > 0;
	}

	async doesntExist(): Promise<boolean> {
		return !(await this.exists());
	}

	async max(column: string): Promise<number | null> {
		return this.aggregate("MAX", column);
	}

	async min(column: string): Promise<number | null> {
		return this.aggregate("MIN", column);
	}

	async sum(column: string): Promise<number> {
		const result = await this.aggregate("SUM", column);
		return result ?? 0;
	}

	async avg(column: string): Promise<number> {
		const result = await this.aggregate("AVG", column);
		return result ?? 0;
	}

	async paginate(perPage = 15, page = 1): Promise<PaginatedResult> {
		const countQb = this.clone();
		const total = await countQb.count();

		const lastPage = Math.max(1, Math.ceil(total / perPage));
		const currentPage = Math.max(1, Math.min(page, lastPage));
		const fromVal = (currentPage - 1) * perPage + 1;
		const toVal = Math.min(currentPage * perPage, total);

		const qb = this.clone();
		qb.limitValue = perPage;
		qb.offsetValue = (currentPage - 1) * perPage;
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);

		return {
			data: result.rows,
			currentPage,
			perPage,
			total,
			lastPage,
			from: total > 0 ? fromVal : 0,
			to: total > 0 ? toVal : 0,
			hasMore: currentPage < lastPage,
			hasPrev: currentPage > 1,
			isEmpty: total === 0,
		};
	}

	async insert(data: Record<string, any>): Promise<number | string> {
		const { sql, bindings } = this.compileInsert(data);
		const driverType = this.connection.getDriver();

		if (driverType === "postgresql") {
			const dialect = this.connection.getDialect();
			const returningSQL = dialect.compileInsertReturning(sql, bindings);
			const result = await this.connection.raw(returningSQL, bindings);
			return result.rows.length > 0 ? (Number(result.rows[0].id) ?? 0) : 0;
		}

		const result = await this.connection.raw(sql, bindings);
		if (result.rows && result.rows.length > 0) {
			return Number(result.rows[0].id) ?? result.rows[0].insertId ?? 0;
		}
		return 0;
	}

	async insertGetId(data: Record<string, any>): Promise<number | string> {
		return this.insert(data);
	}

	async insertReturning(data: Record<string, any>): Promise<any> {
		const { sql, bindings } = this.compileInsert(data);
		const dialect = this.connection.getDialect();
		const returningSQL = dialect.compileInsertReturning(sql, bindings);
		const result = await this.connection.raw(returningSQL, bindings);
		return result.rows.length > 0 ? result.rows[0] : null;
	}

	async update(data: Record<string, any>): Promise<number> {
		const { sql, bindings } = this.compileUpdate(data);
		const result = await this.connection.raw(sql, bindings);
		const rows = result.rows;
		if (rows.length > 0) {
			const info = rows[0];
			return info.affectedRows ?? info.changes ?? rows.length;
		}
		return 0;
	}

	async delete(): Promise<number> {
		const { sql, bindings } = this.compileDelete();
		const result = await this.connection.raw(sql, bindings);
		const rows = result.rows;
		if (rows.length > 0) {
			const info = rows[0];
			return info.affectedRows ?? info.changes ?? rows.length;
		}
		return 0;
	}

	async truncate(): Promise<void> {
		const dialect = this.connection.getDialect();
		const sql = dialect.compileTruncate(this.tableName);
		await this.connection.raw(sql);
	}

	async chunk(
		size: number,
		callback: (rows: any[]) => Promise<void>,
	): Promise<void> {
		let page = 1;
		let hasMore = true;

		while (hasMore) {
			const qb = this.clone();
			qb.limitValue = size;
			qb.offsetValue = (page - 1) * size;
			const rows = await qb.get();

			if (rows.length === 0) {
				hasMore = false;
				break;
			}

			await callback(rows);

			if (rows.length < size) {
				hasMore = false;
			}

			page++;
		}
	}

	clone(): QueryBuilder {
		const qb = new QueryBuilder(this.connection, this.tableName);
		qb.columns = [...this.columns];
		qb.distinctEnabled = this.distinctEnabled;
		qb.wheres = this.cloneWheres(this.wheres);
		qb.joins = [...this.joins];
		qb.orderBys = [...this.orderBys];
		qb.havings = [...this.havings];
		qb.groupBys = [...this.groupBys];
		qb.limitValue = this.limitValue;
		qb.offsetValue = this.offsetValue;
		qb.fromSubquery = this.fromSubquery;
		return qb;
	}

	toSQL(): { sql: string; bindings: any[] } {
		const bindings: any[] = [];
		const dialect = this.connection.getDialect();

		const wrappedColumns = this.columns
			.map((c) =>
				c.includes("(") || c === "*" || c.includes(" as ") || c.includes(" AS ")
					? c
					: dialect.wrapIdentifier(c),
			)
			.join(", ");

		const from = this.fromSubquery ?? this.tableName;
		const wrappedFrom = this.fromSubquery ?? dialect.wrapIdentifier(from);

		let sql = this.distinctEnabled
			? `SELECT DISTINCT ${wrappedColumns} FROM ${wrappedFrom}`
			: `SELECT ${wrappedColumns} FROM ${wrappedFrom}`;

		const joinSQL = this.compileJoins(dialect);
		if (joinSQL) sql += joinSQL;

		const whereSQL = this.compileWheres(dialect, bindings);
		if (whereSQL) sql += whereSQL;

		if (this.groupBys.length > 0) {
			sql += ` GROUP BY ${this.groupBys.map((c) => dialect.wrapIdentifier(c)).join(", ")}`;
		}

		const havingSQL = this.compileHavings(dialect, bindings);
		if (havingSQL) sql += havingSQL;

		if (this.orderBys.length > 0) {
			sql += ` ORDER BY ${this.orderBys
				.map((o) => {
					const col =
						o.column === "RANDOM()"
							? o.column
							: dialect.wrapIdentifier(o.column);
					return `${col} ${o.direction.toUpperCase()}`;
				})
				.join(", ")}`;
		}

		const limitOffsetSQL = dialect.compileLimitOffset(
			bindings,
			this.limitValue,
			this.offsetValue,
		);
		if (limitOffsetSQL) sql += limitOffsetSQL;

		return { sql, bindings };
	}

	dd(): never {
		const { sql, bindings } = this.toSQL();
		const output = `SQL: ${sql}\nBindings: ${JSON.stringify(bindings)}`;
		console.error(output);
		process.exit(1);
	}

	private compileJoins(dialect: Dialect): string {
		if (this.joins.length === 0) return "";

		return (
			" " +
			this.joins
				.map((j) => {
					const type = j.type.toUpperCase();
					return `${type} JOIN ${dialect.wrapIdentifier(j.table)} ON ${dialect.wrapIdentifier(j.first)} ${j.operator} ${this.wrap(j.second)}`;
				})
				.join(" ")
		);
	}

	private compileWheres(dialect: Dialect, bindings: any[]): string {
		if (this.wheres.length === 0) return "";

		const sql = this.compileWhereArray(this.wheres, dialect, bindings);
		return sql ? ` WHERE ${sql}` : "";
	}

	private compileWhereArray(
		wheres: WhereClause[],
		dialect: Dialect,
		bindings: any[],
	): string {
		if (wheres.length === 0) return "";

		const parts: string[] = [];

		for (const w of wheres) {
			const sql = this.compileSingleWhere(w, dialect, bindings);
			if (sql !== null) parts.push(sql);
		}

		if (parts.length === 0) return "";

		return parts.join(" AND ");
	}

	private compileSingleWhere(
		w: WhereClause,
		dialect: Dialect,
		bindings: any[],
	): string | null {
		const col = w.column ? dialect.wrapIdentifier(w.column) : "";

		switch (w.type) {
			case "basic": {
				bindings.push(w.value);
				const operator = w.operator === "=" ? "=" : w.operator;
				return `${col} ${operator} ${dialect.makeParameter(bindings.length - 1)}`;
			}
			case "in": {
				const placeholders = w
					.values!.map((v: any) => {
						bindings.push(v);
						return dialect.makeParameter(bindings.length - 1);
					})
					.join(", ");
				return `${col} IN (${placeholders})`;
			}
			case "notIn": {
				const placeholders = w
					.values!.map((v: any) => {
						bindings.push(v);
						return dialect.makeParameter(bindings.length - 1);
					})
					.join(", ");
				return `${col} NOT IN (${placeholders})`;
			}
			case "null":
				return `${col} IS NULL`;
			case "notNull":
				return `${col} IS NOT NULL`;
			case "between": {
				bindings.push(w.values![0], w.values![1]);
				return `${col} BETWEEN ${dialect.makeParameter(bindings.length - 2)} AND ${dialect.makeParameter(bindings.length - 1)}`;
			}
			case "notBetween": {
				bindings.push(w.values![0], w.values![1]);
				return `${col} NOT BETWEEN ${dialect.makeParameter(bindings.length - 2)} AND ${dialect.makeParameter(bindings.length - 1)}`;
			}
			case "like": {
				bindings.push(w.value);
				return `${col} LIKE ${dialect.makeParameter(bindings.length - 1)}`;
			}
			case "nested": {
				const nestedSQL = this.compileNestedWhere(w.nested!, dialect, bindings);
				return nestedSQL ? `(${nestedSQL})` : null;
			}
			default:
				return null;
		}
	}

	private compileNestedWhere(
		wheres: WhereClause[],
		dialect: Dialect,
		bindings: any[],
	): string {
		const parts: string[] = [];

		for (const w of wheres) {
			const sql = this.compileSingleWhere(w, dialect, bindings);
			if (sql !== null) {
				parts.push(sql);
			}
		}

		if (parts.length === 0) return "";

		return parts.join(" AND ");
	}

	private compileHavings(dialect: Dialect, bindings: any[]): string {
		if (this.havings.length === 0) return "";

		const parts = this.havings.map((h) => {
			bindings.push(h.value);
			return `${dialect.wrapIdentifier(h.column)} ${h.operator} ${dialect.makeParameter(bindings.length - 1)}`;
		});

		return ` HAVING ${parts.join(" AND ")}`;
	}

	private compileInsert(data: Record<string, any>): {
		sql: string;
		bindings: any[];
	} {
		const dialect = this.connection.getDialect();
		const columns = Object.keys(data);
		const values = Object.values(data);
		const bindings: any[] = [];

		const placeholders = values
			.map((v: any) => {
				bindings.push(v);
				return dialect.makeParameter(bindings.length - 1);
			})
			.join(", ");

		const sql = `INSERT INTO ${dialect.wrapIdentifier(this.tableName)} (${columns.map((c) => dialect.wrapIdentifier(c)).join(", ")}) VALUES (${placeholders})`;
		return { sql, bindings };
	}

	private compileUpdate(data: Record<string, any>): {
		sql: string;
		bindings: any[];
	} {
		const dialect = this.connection.getDialect();
		const bindings: any[] = [];

		const sets = Object.entries(data).map(([key, value]) => {
			bindings.push(value);
			return `${dialect.wrapIdentifier(key)} = ${dialect.makeParameter(bindings.length - 1)}`;
		});

		let sql = `UPDATE ${dialect.wrapIdentifier(this.tableName)} SET ${sets.join(", ")}`;

		const whereSQL = this.compileWheres(dialect, bindings);
		if (whereSQL) sql += whereSQL;

		if (this.orderBys.length > 0) {
			sql += ` ORDER BY ${this.orderBys
				.map((o) => {
					const col =
						o.column === "RANDOM()"
							? o.column
							: dialect.wrapIdentifier(o.column);
					return `${col} ${o.direction.toUpperCase()}`;
				})
				.join(", ")}`;
		}

		const limitOffsetSQL = dialect.compileLimitOffset(
			bindings,
			this.limitValue,
			this.offsetValue,
		);
		if (limitOffsetSQL) sql += limitOffsetSQL;

		return { sql, bindings };
	}

	private compileDelete(): { sql: string; bindings: any[] } {
		const dialect = this.connection.getDialect();
		const bindings: any[] = [];

		let sql = `DELETE FROM ${dialect.wrapIdentifier(this.tableName)}`;

		const whereSQL = this.compileWheres(dialect, bindings);
		if (whereSQL) sql += whereSQL;

		if (this.orderBys.length > 0) {
			sql += ` ORDER BY ${this.orderBys
				.map((o) => {
					const col =
						o.column === "RANDOM()"
							? o.column
							: dialect.wrapIdentifier(o.column);
					return `${col} ${o.direction.toUpperCase()}`;
				})
				.join(", ")}`;
		}

		const limitOffsetSQL = dialect.compileLimitOffset(
			bindings,
			this.limitValue,
			this.offsetValue,
		);
		if (limitOffsetSQL) sql += limitOffsetSQL;

		return { sql, bindings };
	}

	private async aggregate(fn: string, column: string): Promise<number | null> {
		const qb = this.clone();
		qb.columns = [`${fn}(${this.wrap(column)}) as aggregate`];
		qb.orderBys = [];
		qb.limitValue = null;
		qb.offsetValue = null;
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);
		const row = result.rows[0];
		if (!row) return null;
		const val = row.aggregate ?? row[`${fn}(${column})`];
		return val !== null && val !== undefined ? Number(val) : null;
	}

	private cloneWheres(wheres: WhereClause[]): WhereClause[] {
		return wheres.map((w) => ({
			...w,
			values: w.values ? [...w.values] : undefined,
			nested: w.nested ? this.cloneWheres(w.nested) : undefined,
		}));
	}

	private wrap(identifier: string): string {
		if (identifier === "*" || identifier.includes("(")) return identifier;
		const dialect = this.connection.getDialect();
		return dialect.wrapIdentifier(identifier);
	}
}
