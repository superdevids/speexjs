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
		| "nested"
		| "raw"
		| "exists"
		| "column";
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

export interface PaginatedResult<T> {
	data: T[]; currentPage: number; perPage: number; total: number; lastPage: number;
	from: number; to: number; hasMore: boolean; hasPrev: boolean; isEmpty: boolean;
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
	private ctes: { name: string; query: QueryBuilder; recursive?: boolean }[] = []
	private unions: { query: QueryBuilder; type: 'UNION' | 'UNION ALL' | 'INTERSECT' | 'EXCEPT' }[] = []
	private lockMode: string | null = null

	constructor(connection: QueryRunner, tableName: string) {
		this.connection = connection;
		this.tableName = tableName;
	}

	select(...columns: string[]): this {
		this.columns = columns.length > 0 ? columns : ["*"];
		return this;
	}

	addSelect(...columns: string[]): this {
		if (this.columns[0] === "*") this.columns = columns;
		else this.columns.push(...columns);
		return this;
	}

	distinct(): this { this.distinctEnabled = true; return this; }

	from(table: string): this { this.fromSubquery = table; return this; }

	where(column: string, operator: any, value?: any): this {
		if (value === undefined) { value = operator; operator = "="; }
		this.wheres.push({ type: "basic", column, operator: String(operator), value, boolean: "and" });
		return this;
	}

	orWhere(column: string, operator: any, value?: any): this {
		if (value === undefined) { value = operator; operator = "="; }
		this.wheres.push({ type: "basic", column, operator: String(operator), value, boolean: "or" });
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
		this.wheres.push({ type: "between", column, values: range, boolean: "and" });
		return this;
	}

	whereNotBetween(column: string, range: [any, any]): this {
		this.wheres.push({ type: "notBetween", column, values: range, boolean: "and" });
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
		const sub = new QueryBuilder(this.connection, this.tableName);
		callback(sub);
		this.wheres.push({ type: "nested", nested: sub.wheres, boolean: "and" });
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

	joinSub(callback: (query: QueryBuilder) => void, alias: string, first: string, operator: string, second: string, type: JoinType = 'inner'): this {
		const sub = new QueryBuilder(this.connection, this.tableName)
		callback(sub)
		const { sql: subSql } = sub.toSQL()
		this.joins.push({ table: `(${subSql}) AS ${alias}`, first, operator, second, type })
		return this
	}

	orderBy(column: string, direction: OrderDirection = "asc"): this {
		this.orderBys.push({ column, direction });
		return this;
	}

	orderByDesc(column: string): this { return this.orderBy(column, "desc"); }

	latest(column = "created_at"): this { return this.orderBy(column, "desc"); }

	oldest(column = "created_at"): this { return this.orderBy(column, "asc"); }

	inRandomOrder(): this { this.orderBys.push({ column: "RANDOM()", direction: "asc" }); return this; }

	limit(limit: number): this { this.limitValue = limit; return this; }

	offset(offset: number): this { this.offsetValue = offset; return this; }

	skip(skip: number): this { return this.offset(skip); }

	take(take: number): this { return this.limit(take); }

	groupBy(...columns: string[]): this { this.groupBys.push(...columns); return this; }

	having(column: string, operator: string, value: any): this { this.havings.push({ column, operator, value }); return this; }

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
		qb.columns = [`COUNT(${column === "*" ? "*" : this.wrap(column)}) as aggregate`];
		qb.orderBys = []; qb.limitValue = null; qb.offsetValue = null;
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);
		const row = result.rows[0];
		if (!row) return 0;
		return Number(row.aggregate ?? row.count ?? row["COUNT(*)"] ?? 0);
	}

	async exists(): Promise<boolean> { return (await this.count()) > 0; }

	async doesntExist(): Promise<boolean> { return !(await this.exists()); }

	async max(column: string): Promise<number | null> { return this.aggregate("MAX", column); }

	async min(column: string): Promise<number | null> { return this.aggregate("MIN", column); }

	async sum(column: string): Promise<number> { return (await this.aggregate("SUM", column)) ?? 0; }

	async avg(column: string): Promise<number> { return (await this.aggregate("AVG", column)) ?? 0; }

	async paginate(perPage = 15, page = 1): Promise<PaginatedResult<any>> {
		const total = await this.count();
		const lastPage = Math.max(1, Math.ceil(total / perPage));
		const currentPage = Math.max(1, Math.min(page, lastPage));
		const qb = this.clone();
		qb.limitValue = perPage;
		qb.offsetValue = (currentPage - 1) * perPage;
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);
		const f = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
		const t = total > 0 ? Math.min(currentPage * perPage, total) : 0;
		return { data: result.rows, currentPage, perPage, total, lastPage, from: f, to: t, hasMore: currentPage < lastPage, hasPrev: currentPage > 1, isEmpty: total === 0 };
	}

	async insert(data: Record<string, any>): Promise<number | string> {
		const { sql, bindings } = this.compileInsert(data);
		const driverType = this.connection.getDriver();
		const dialect = this.connection.getDialect();
		if (driverType === "postgresql") {
			const result = await this.connection.raw(dialect.compileInsertReturning(sql, bindings), bindings);
			return result.rows.length > 0 ? Number(result.rows[0].id) ?? 0 : 0;
		}
		const result = await this.connection.raw(sql, bindings);
		if (driverType === "mysql") {
			const h = result.rows;
			if (h && typeof h === 'object' && 'insertId' in h) return Number(h.insertId) ?? 0;
			if (Array.isArray(result.rows) && result.rows.length > 0) return Number(result.rows[0]?.insertId ?? result.rows[0]?.id ?? 0);
			return 0;
		}
		if (driverType === "sqlite") {
			const r = await this.connection.raw("SELECT last_insert_rowid() as id");
			return r.rows.length > 0 ? Number(r.rows[0].id) ?? 0 : 0;
		}
		return 0;
	}

	async insertGetId(data: Record<string, any>): Promise<number | string> { return this.insert(data); }

	async upsert(data: Record<string, any>, conflictColumns: string[]): Promise<number | string> {
		const dialect = this.connection.getDialect()
		const { sql, bindings } = this.compileInsert(data)
		const conflictCols = conflictColumns.map(c => dialect.wrapIdentifier(c)).join(', ')
		const updateCols = Object.keys(data).filter(k => !conflictColumns.includes(k))
		if (updateCols.length === 0) return this.insert(data)

		const updates = updateCols.map(c => `${dialect.wrapIdentifier(c)} = VALUES(${dialect.wrapIdentifier(c)})`).join(', ')

		let upsertSql: string
		if (this.connection.getDriver() === 'postgresql') {
			upsertSql = `${sql} ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`
		} else {
			upsertSql = `${sql} ON DUPLICATE KEY UPDATE ${updates}`
		}

		const result = await this.connection.raw(upsertSql, bindings)
		return Number((result.rows as any)?.insertId ?? 0)
	}

	async insertReturning(data: Record<string, any>): Promise<any> {
		const { sql, bindings } = this.compileInsert(data);
		const result = await this.connection.raw(this.connection.getDialect().compileInsertReturning(sql, bindings), bindings);
		return result.rows.length > 0 ? result.rows[0] : null;
	}

	async update(data: Record<string, any>): Promise<number> {
		const { sql, bindings } = this.compileUpdate(data);
		const result = await this.connection.raw(sql, bindings);
		const row = result.rows[0];
		return row ? (row.affectedRows ?? row.changes ?? result.rows.length) : 0;
	}

	async delete(): Promise<number> {
		const { sql, bindings } = this.compileDelete();
		const result = await this.connection.raw(sql, bindings);
		const row = result.rows[0];
		return row ? (row.affectedRows ?? row.changes ?? result.rows.length) : 0;
	}

	async truncate(): Promise<void> {
		await this.connection.raw(this.connection.getDialect().compileTruncate(this.tableName));
	}

	async chunk(size: number, callback: (rows: any[]) => Promise<void>): Promise<void> {
		let page = 1;
		let hasMore = true;
		while (hasMore) {
			const qb = this.clone();
			qb.limitValue = size;
			qb.offsetValue = (page - 1) * size;
			const rows = await qb.get();
			if (rows.length === 0) { hasMore = false; break; }
			await callback(rows);
			if (rows.length < size) hasMore = false;
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
		qb.ctes = [...this.ctes];
		qb.unions = [...this.unions];
		qb.lockMode = this.lockMode;
		return qb;
	}

	whereRaw(sql: string, _bindings?: any[]): this {
		this.wheres.push({ type: "raw", value: sql, boolean: "and" } as any);
		return this;
	}

	orWhereRaw(sql: string, _bindings?: any[]): this {
		this.wheres.push({ type: "raw", value: sql, boolean: "or" } as any);
		return this;
	}

	orderByRaw(sql: string): this {
		this.orderBys.push({ column: sql, direction: "asc" } as any);
		return this;
	}

	whereExists(callback: (query: QueryBuilder) => void): this {
		const sub = new QueryBuilder(this.connection, this.tableName);
		callback(sub);
		this.wheres.push({ type: "exists", nested: (sub as any).wheres, boolean: "and" });
		return this;
	}

	whereColumn(first: string, operator: string, second: string): this {
		this.wheres.push({ type: "column", column: first, operator, value: second, boolean: "and" });
		return this;
	}

	when(condition: boolean, callback: (query: this) => void): this {
		if (condition) callback(this);
		return this;
	}

	with(name: string, callback: (query: QueryBuilder) => void, recursive = false): this {
		const sub = new QueryBuilder(this.connection, this.tableName)
		callback(sub)
		this.ctes.push({ name, query: sub, recursive })
		return this
	}

	withRecursive(name: string, callback: (query: QueryBuilder) => void): this {
		return this.with(name, callback, true)
	}

	union(callback: (query: QueryBuilder) => void): this {
		const sub = new QueryBuilder(this.connection, this.tableName)
		callback(sub)
		this.unions.push({ query: sub, type: 'UNION' })
		return this
	}

	unionAll(callback: (query: QueryBuilder) => void): this {
		const sub = new QueryBuilder(this.connection, this.tableName)
		callback(sub)
		this.unions.push({ query: sub, type: 'UNION ALL' })
		return this
	}

	lockForUpdate(): this { this.lockMode = 'FOR UPDATE'; return this }

	sharedLock(): this { this.lockMode = 'FOR SHARE'; return this }

	toSQL(): { sql: string; bindings: any[] } {
		const bindings: any[] = [];
		const dialect = this.connection.getDialect();
		const wrapId = (c: string) => c.includes("(") || c === "*" || c.includes(" as ") || c.includes(" AS ") ? c : dialect.wrapIdentifier(c);
		const wrappedFrom = this.fromSubquery ?? dialect.wrapIdentifier(this.fromSubquery ?? this.tableName);
		let sql = `${this.distinctEnabled ? "SELECT DISTINCT " : "SELECT "}${this.columns.map(wrapId).join(", ")} FROM ${wrappedFrom}`;
		if (this.ctes.length > 0) {
			const cteParts = this.ctes.map(cte => {
				const { sql: subSql } = cte.query.toSQL()
				return `${cte.recursive ? 'RECURSIVE ' : ''}${cte.name} AS (${subSql})`
			})
			sql = `WITH ${cteParts.join(', ')} ${sql}`
		}
		const joinSQL = this.compileJoins(dialect);
		if (joinSQL) sql += joinSQL;
		const whereSQL = this.compileWheres(dialect, bindings);
		if (whereSQL) sql += whereSQL;
		if (this.groupBys.length > 0) sql += ` GROUP BY ${this.groupBys.map(c => dialect.wrapIdentifier(c)).join(", ")}`;
		const havingSQL = this.compileHavings(dialect, bindings);
		if (havingSQL) sql += havingSQL;
		sql += this.compileOrderByLimit(dialect, bindings);
		for (const u of this.unions) {
			const { sql: unionSql } = u.query.toSQL()
			sql += ` ${u.type} ${unionSql}`
		}
		if (this.lockMode) sql += ` ${this.lockMode}`
		return { sql, bindings };
	}

	dd(): string {
		const { sql, bindings } = this.toSQL();
		const r = `SQL: ${sql}\nBindings: ${JSON.stringify(bindings)}`;
		console.error(r); return r;
	}

	private compileJoins(dialect: Dialect): string {
		if (this.joins.length === 0) return "";
		return " " + this.joins.map(j => `${j.type.toUpperCase()} JOIN ${j.table.includes("(") ? j.table : dialect.wrapIdentifier(j.table)} ON ${dialect.wrapIdentifier(j.first)} ${j.operator} ${this.wrap(j.second)}`).join(" ");
	}

	private compileWheres(dialect: Dialect, bindings: any[]): string {
		if (this.wheres.length === 0) return "";
		const sql = this.compileWhereArray(this.wheres, dialect, bindings);
		return sql ? ` WHERE ${sql}` : "";
	}

	private compileWhereArray(wheres: WhereClause[], dialect: Dialect, bindings: any[]): string {
		if (wheres.length === 0) return "";
		const parts = wheres.map(w => this.compileSingleWhere(w, dialect, bindings)).filter((s): s is string => s !== null);
		if (parts.length === 0) return "";
		return parts.reduce((acc, part, i) => {
			if (i === 0) return part;
			return `${acc} ${(wheres[i]?.boolean ?? "and").toUpperCase()} ${part}`;
		}, "");
	}

	private compileSingleWhere(w: WhereClause, dialect: Dialect, bindings: any[]): string | null {
		const col = w.column ? dialect.wrapIdentifier(w.column) : "";

		switch (w.type) {
			case "basic": {
				bindings.push(w.value);
				return `${col} ${w.operator} ${dialect.makeParameter(bindings.length - 1)}`;
			}
			case "in":
			case "notIn": {
				const ph = w.values!.map(v => { bindings.push(v); return dialect.makeParameter(bindings.length - 1); }).join(", ");
				return `${col} ${w.type === "in" ? "IN" : "NOT IN"} (${ph})`;
			}
			case "null": return `${col} IS NULL`;
			case "notNull": return `${col} IS NOT NULL`;
			case "between":
			case "notBetween": {
				bindings.push(w.values![0], w.values![1]);
				const kw = w.type === "between" ? "BETWEEN" : "NOT BETWEEN";
				return `${col} ${kw} ${dialect.makeParameter(bindings.length - 2)} AND ${dialect.makeParameter(bindings.length - 1)}`;
			}
			case "like": {
				bindings.push(w.value);
				return `${col} LIKE ${dialect.makeParameter(bindings.length - 1)}`;
			}
			case "nested": {
				const nestedSQL = this.compileNestedWhere(w.nested!, dialect, bindings);
				return nestedSQL ? `(${nestedSQL})` : null;
			}
			case "raw": return String(w.value);
			case "exists": return `EXISTS (SELECT 1 FROM ${dialect.wrapIdentifier(this.tableName)} WHERE ${this.compileWhereArray(w.nested!, dialect, bindings)})`;
			case "column": return `${dialect.wrapIdentifier(w.column!)} ${w.operator} ${dialect.wrapIdentifier(w.value as string)}`;
			default: return null;
		}
	}

	private compileNestedWhere(wheres: WhereClause[], dialect: Dialect, bindings: any[]): string {
		return this.compileWhereArray(wheres, dialect, bindings);
	}

	private compileHavings(dialect: Dialect, bindings: any[]): string {
		if (this.havings.length === 0) return "";
		return ` HAVING ${this.havings.map(h => { bindings.push(h.value); return `${dialect.wrapIdentifier(h.column)} ${h.operator} ${dialect.makeParameter(bindings.length - 1)}`; }).join(" AND ")}`;
	}

	private compileInsert(data: Record<string, any>): { sql: string; bindings: any[] } {
		const dialect = this.connection.getDialect();
		const bindings: any[] = [];
		const cols = Object.keys(data);
		const placeholders = Object.values(data).map(v => { bindings.push(v); return dialect.makeParameter(bindings.length - 1); }).join(", ");
		const sql = `INSERT INTO ${dialect.wrapIdentifier(this.tableName)} (${cols.map(c => dialect.wrapIdentifier(c)).join(", ")}) VALUES (${placeholders})`;
		return { sql, bindings };
	}

	private compileOrderByLimit(dialect: Dialect, bindings: any[]): string {
		let sql = "";
		if (this.orderBys.length > 0) {
			sql += ` ORDER BY ${this.orderBys.map(o => {
				const col = o.column === "RANDOM()" ? o.column : dialect.wrapIdentifier(o.column);
				return `${col} ${o.direction.toUpperCase()}`;
			}).join(", ")}`;
		}
		const limitOffsetSQL = dialect.compileLimitOffset(bindings, this.limitValue, this.offsetValue);
		if (limitOffsetSQL) sql += limitOffsetSQL;
		return sql;
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

		sql += this.compileOrderByLimit(dialect, bindings);
		return { sql, bindings };
	}

	private compileDelete(): { sql: string; bindings: any[] } {
		const dialect = this.connection.getDialect();
		const bindings: any[] = [];
		let sql = `DELETE FROM ${dialect.wrapIdentifier(this.tableName)}`;
		const whereSQL = this.compileWheres(dialect, bindings);
		if (whereSQL) sql += whereSQL;
		sql += this.compileOrderByLimit(dialect, bindings);
		return { sql, bindings };
	}

	private async aggregate(fn: string, column: string): Promise<number | null> {
		const qb = this.clone();
		qb.columns = [`${fn}(${this.wrap(column)}) as aggregate`];
		qb.orderBys = []; qb.limitValue = null; qb.offsetValue = null;
		const { sql, bindings } = qb.toSQL();
		const result = await this.connection.raw(sql, bindings);
		const row = result.rows[0];
		if (!row) return null;
		const val = row.aggregate ?? row[`${fn}(${column})`];
		return val != null ? Number(val) : null;
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
		return this.connection.getDialect().wrapIdentifier(identifier);
	}
}
