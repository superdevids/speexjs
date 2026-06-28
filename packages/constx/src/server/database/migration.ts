import type { DatabaseConnection } from "./connection.js";
import type { ColumnCompileOptions, Dialect } from "./dialect.js";
import type { QueryResult } from "./types.js";

export interface MigrationDefinition {
	name: string;
	up: (schema: SchemaBuilder) => Promise<void>;
	down: (schema: SchemaBuilder) => Promise<void>;
}

export interface MigrationStatusRow {
	name: string;
	batch: number;
	executedAt: string;
}

export class SchemaBuilder {
	private connection: DatabaseConnection;

	constructor(connection: DatabaseConnection) {
		this.connection = connection;
	}

	async createTable(
		tableName: string,
		callback: (table: TableBlueprint) => void,
	): Promise<void> {
		const blueprint = new TableBlueprint(this.connection, "create");
		callback(blueprint);
		const dialect = this.connection.getDialect();
		const columns = blueprint.compileColumns();
		const constraints = blueprint.compileConstraints(dialect);
		const sql = dialect.compileCreateTable(tableName, columns, constraints);
		await this.connection.raw(sql);
	}

	async dropTable(tableName: string): Promise<void> {
		const dialect = this.connection.getDialect();
		const sql = dialect.compileDropTable(tableName);
		await this.connection.raw(sql);
	}

	async dropTableIfExists(tableName: string): Promise<void> {
		const dialect = this.connection.getDialect();
		const sql = dialect.compileDropTableIfExists(tableName);
		await this.connection.raw(sql);
	}

	async renameTable(from: string, to: string): Promise<void> {
		const dialect = this.connection.getDialect();
		const sql = dialect.compileRenameTable(from, to);
		await this.connection.raw(sql);
	}

	async alterTable(
		tableName: string,
		callback: (table: TableBlueprint) => void,
	): Promise<void> {
		const blueprint = new TableBlueprint(this.connection, "alter");
		callback(blueprint);
		const dialect = this.connection.getDialect();

		if (blueprint.droppedColumns.length > 0) {
			const dropSQL = dialect.compileDropColumns(
				tableName,
				blueprint.droppedColumns,
			);
			await this.connection.raw(
				`ALTER TABLE ${dialect.wrapIdentifier(tableName)} ${dropSQL}`,
			);
		}

		if (blueprint.renamedColumns.length > 0) {
			for (const { from, to } of blueprint.renamedColumns) {
				const renameSQL = dialect.compileRenameColumn(tableName, from, to);
				await this.connection.raw(
					`ALTER TABLE ${dialect.wrapIdentifier(tableName)} ${renameSQL}`,
				);
			}
		}

		const compiledColumns = blueprint.compileColumnDefinitions(dialect);
		if (compiledColumns.length > 0) {
			for (const colSQL of compiledColumns) {
				await this.connection.raw(
					`ALTER TABLE ${dialect.wrapIdentifier(tableName)} ${colSQL}`,
				);
			}
		}
	}

	async hasTable(tableName: string): Promise<boolean> {
		const dialect = this.connection.getDialect();
		const sql = dialect.compileHasTable(tableName);
		const result = await this.connection.raw(sql, [tableName]);
		return this.parseCount(result) > 0;
	}

	async hasColumn(tableName: string, columnName: string): Promise<boolean> {
		const dialect = this.connection.getDialect();
		const driver = this.connection.getDriver();

		if (driver === "sqlite") {
			const sql = dialect.compileHasColumn(tableName, columnName);
			const result = await this.connection.raw(sql);
			return result.rows.some((row: any) => row.name === columnName);
		}

		const sql = dialect.compileHasColumn(tableName, columnName);
		const result = await this.connection.raw(sql, [tableName, columnName]);
		return this.parseCount(result) > 0;
	}

	private parseCount(result: QueryResult): number {
		if (result.rows.length === 0) return 0;
		const row = result.rows[0];
		return Number(row.count ?? row.Count ?? 0);
	}
}

export type BlueprintMode = "create" | "alter";

export class TableBlueprint {
	private mode: BlueprintMode;
	private columns: ColumnDefinition[] = [];
	private primaryKeys: string[] = [];
	private uniqueKeys: string[][] = [];
	private indexKeys: string[][] = [];
	private foreignKeys: ForeignKeyDef[] = [];
	droppedColumns: string[] = [];
	renamedColumns: { from: string; to: string }[] = [];

	constructor(_connection: DatabaseConnection, mode: BlueprintMode) {
		this.mode = mode;
	}

	id(name = "id"): ColumnDefinition {
		const col = this.addColumn("id", name);
		col.autoIncrement();
		col.unsigned();
		return col;
	}

	increments(name = "id"): ColumnDefinition {
		const col = this.addColumn("increments", name);
		col.autoIncrement();
		col.unsigned();
		return col;
	}

	bigIncrements(name = "id"): ColumnDefinition {
		const col = this.addColumn("bigIncrements", name);
		col.autoIncrement();
		col.unsigned();
		return col;
	}

	string(name: string, length = 255): ColumnDefinition {
		const col = this.addColumn("string", name);
		col.setLength(length);
		return col;
	}

	text(name: string): ColumnDefinition {
		return this.addColumn("text", name);
	}

	integer(name: string): ColumnDefinition {
		return this.addColumn("integer", name);
	}

	bigInteger(name: string): ColumnDefinition {
		return this.addColumn("bigInteger", name);
	}

	tinyInteger(name: string): ColumnDefinition {
		return this.addColumn("tinyInteger", name);
	}

	smallInteger(name: string): ColumnDefinition {
		return this.addColumn("smallInteger", name);
	}

	boolean(name: string): ColumnDefinition {
		return this.addColumn("boolean", name);
	}

	float(name: string, _precision?: number): ColumnDefinition {
		const col = this.addColumn("float", name);
		if (_precision !== undefined) col.setPrecision(_precision);
		return col;
	}

	double(name: string): ColumnDefinition {
		return this.addColumn("double", name);
	}

	decimal(name: string, precision = 10, scale = 0): ColumnDefinition {
		const col = this.addColumn("decimal", name);
		col.setPrecision(precision);
		col.setScale(scale);
		return col;
	}

	date(name: string): ColumnDefinition {
		return this.addColumn("date", name);
	}

	datetime(name: string): ColumnDefinition {
		return this.addColumn("datetime", name);
	}

	timestamp(name: string): ColumnDefinition {
		return this.addColumn("timestamp", name);
	}

	time(name: string): ColumnDefinition {
		return this.addColumn("time", name);
	}

	year(name: string): ColumnDefinition {
		return this.addColumn("year", name);
	}

	json(name: string): ColumnDefinition {
		return this.addColumn("json", name);
	}

	jsonb(name: string): ColumnDefinition {
		return this.addColumn("jsonb", name);
	}

	binary(name: string): ColumnDefinition {
		return this.addColumn("binary", name);
	}

	uuid(name = "uuid"): ColumnDefinition {
		return this.addColumn("uuid", name);
	}

	enum(name: string, values: string[]): ColumnDefinition {
		const col = this.addColumn("enum", name);
		col.setValues(values);
		return col;
	}

	foreignId(name: string): ColumnDefinition {
		const col = this.addColumn("foreignId", name);
		col.unsigned();
		return col;
	}

	primary(...columns: string[]): void {
		this.primaryKeys.push(...columns);
	}

	unique(...columns: string[]): void {
		this.uniqueKeys.push(columns);
	}

	index(...columns: string[]): void {
		this.indexKeys.push(columns);
	}

	foreign(column: string): ForeignKeyDefinition {
		const fk: ForeignKeyDef = {
			column,
			references: "",
			on: "",
			onDelete: null,
			onUpdate: null,
		};
		this.foreignKeys.push(fk);
		return new ForeignKeyDefinition(fk);
	}

	timestamps(): void {
		this.timestamp("created_at").nullable();
		this.timestamp("updated_at").nullable();
	}

	softDeletes(): void {
		this.timestamp("deleted_at").nullable();
	}

	rememberToken(): void {
		this.string("remember_token", 100).nullable();
	}

	dropColumn(column: string): void {
		this.droppedColumns.push(column);
	}

	renameColumn(from: string, to: string): void {
		this.renamedColumns.push({ from, to });
	}

	dropPrimary(): void {
		this.primaryKeys = [];
	}

	dropUnique(_indexName?: string): void {
		this.uniqueKeys = [];
	}

	dropIndex(_indexName?: string): void {
		this.indexKeys = [];
	}

	dropForeign(_indexName?: string): void {
		this.foreignKeys = [];
	}

	dropTimestamps(): void {
		this.droppedColumns.push("created_at", "updated_at");
	}

	dropSoftDeletes(): void {
		this.droppedColumns.push("deleted_at");
	}

	dropRememberToken(): void {
		this.droppedColumns.push("remember_token");
	}

	compileColumns(): ColumnCompileOptions[] {
		return this.columns
			.filter((c) => this.mode === "create" || c.isNew)
			.map((c) => c.compile());
	}

	compileConstraints(dialect: Dialect): string[] {
		const constraints: string[] = [];
		const wrap = (name: string) => dialect.wrapIdentifier(name);

		for (const pk of this.primaryKeys) {
			constraints.push(`PRIMARY KEY (${wrap(pk)})`);
		}

		for (const uk of this.uniqueKeys) {
			constraints.push(`UNIQUE (${uk.map((c) => wrap(c)).join(", ")})`);
		}

		for (const ik of this.indexKeys) {
			constraints.push(`INDEX (${ik.map((c) => wrap(c)).join(", ")})`);
		}

		for (const fk of this.foreignKeys) {
			let fkSQL = `FOREIGN KEY (${wrap(fk.column)}) REFERENCES ${wrap(fk.on)} (${wrap(fk.references)})`;
			if (fk.onDelete) fkSQL += ` ON DELETE ${fk.onDelete}`;
			if (fk.onUpdate) fkSQL += ` ON UPDATE ${fk.onUpdate}`;
			constraints.push(fkSQL);
		}

		return constraints;
	}

	compileColumnDefinitions(dialect: Dialect): string[] {
		return this.columns
			.filter((c) => c.isNew && this.mode === "alter")
			.map((c) => dialect.compileAddColumns("", [c.compile()]));
	}

	private addColumn(type: string, name: string): ColumnDefinition {
		const col = new ColumnDefinition(type, name);
		this.columns.push(col);
		return col;
	}
}

export class ColumnDefinition {
	private type: string;
	private name: string;
	private isNullable = false;
	private defaultValue: any = undefined;
	private isUnsigned = false;
	private isUnique = false;
	private isPrimary = false;
	private isIndex = false;
	private commentText: string | null = null;
	private afterColumn: string | null = null;
	private isFirst = false;
	private isAutoIncrement = false;
	private precisionValue: number | null = null;
	private scaleValue: number | null = null;
	private lengthValue: number | null = null;
	private enumValues: string[] | null = null;
	private isForeignId = false;
	isNew = true;

	constructor(type: string, name: string) {
		this.type = type;
		this.name = name;
	}

	nullable(): this {
		this.isNullable = true;
		return this;
	}

	default(value: any): this {
		this.defaultValue = value;
		return this;
	}

	unsigned(): this {
		this.isUnsigned = true;
		return this;
	}

	unique(): this {
		this.isUnique = true;
		return this;
	}

	primary(): this {
		this.isPrimary = true;
		return this;
	}

	index(): this {
		this.isIndex = true;
		return this;
	}

	comment(text: string): this {
		this.commentText = text;
		return this;
	}

	after(column: string): this {
		this.afterColumn = column;
		return this;
	}

	first(): this {
		this.isFirst = true;
		return this;
	}

	autoIncrement(): this {
		this.isAutoIncrement = true;
		return this;
	}

	setValues(vals: string[]): this {
		this.enumValues = vals;
		return this;
	}

	setLength(len: number): this {
		this.lengthValue = len;
		return this;
	}

	setPrecision(precision: number): this {
		this.precisionValue = precision;
		return this;
	}

	setScale(scale: number): this {
		this.scaleValue = scale;
		return this;
	}

	compile(): ColumnCompileOptions {
		return {
			name: this.name,
			type: this.type,
			nullable: this.isNullable,
			defaultValue: this.defaultValue,
			unsigned: this.isUnsigned,
			unique: this.isUnique,
			primary: this.isPrimary,
			index: this.isIndex,
			comment: this.commentText,
			after: this.afterColumn,
			first: this.isFirst,
			autoIncrement: this.isAutoIncrement,
			precision: this.precisionValue,
			scale: this.scaleValue,
			length: this.lengthValue,
			values: this.enumValues,
			isForeignId: this.isForeignId,
		};
	}
}

interface ForeignKeyDef {
	column: string;
	references: string;
	on: string;
	onDelete: string | null;
	onUpdate: string | null;
}

export class ForeignKeyDefinition {
	private def: ForeignKeyDef;

	constructor(def: ForeignKeyDef) {
		this.def = def;
	}

	references(column: string): this {
		this.def.references = column;
		return this;
	}

	on(table: string): this {
		this.def.on = table;
		return this;
	}

	onDelete(action: string): this {
		this.def.onDelete = action;
		return this;
	}

	onUpdate(action: string): this {
		this.def.onUpdate = action;
		return this;
	}
}

export class Migrator {
	private connection: DatabaseConnection;
	private migrations: MigrationDefinition[] = [];

	constructor(connection: DatabaseConnection) {
		this.connection = connection;
	}

	addMigrations(migrations: MigrationDefinition[]): void {
		this.migrations.push(...migrations);
	}

	setMigrations(migrations: MigrationDefinition[]): void {
		this.migrations = migrations;
	}

	async run(): Promise<void> {
		await this.ensureMigrationTable();

		const ran = await this.getRanMigrations();
		const ranNames = new Set(ran.map((r) => r.name));

		const pending = this.migrations.filter((m) => !ranNames.has(m.name));
		if (pending.length === 0) {
			console.log("Nothing to migrate.");
			return;
		}

		const nextBatch = await this.getNextBatchNumber();
		const schema = new SchemaBuilder(this.connection);

		for (const migration of pending) {
			console.log(`Migrating: ${migration.name}`);
			try {
				await migration.up(schema);
				await this.recordMigration(migration.name, nextBatch);
				console.log(`Migrated:  ${migration.name}`);
			} catch (err) {
				console.error(`Migration failed: ${migration.name}`, err);
				throw err;
			}
		}
	}

	async rollback(): Promise<void> {
		await this.ensureMigrationTable();

		const lastBatch = await this.getLastBatchNumber();
		if (lastBatch === 0) {
			console.log("Nothing to rollback.");
			return;
		}

		const lastBatchMigrations = await this.getMigrationsByBatch(lastBatch);
		const schema = new SchemaBuilder(this.connection);

		for (const migration of lastBatchMigrations.reverse()) {
			const def = this.migrations.find((m) => m.name === migration.name);
			if (def) {
				console.log(`Rolling back: ${migration.name}`);
				try {
					await def.down(schema);
					await this.removeMigration(migration.name);
					console.log(`Rolled back:  ${migration.name}`);
				} catch (err) {
					console.error(`Rollback failed: ${migration.name}`, err);
					throw err;
				}
			}
		}
	}

	async reset(): Promise<void> {
		await this.ensureMigrationTable();

		const allRan = await this.getRanMigrations();
		const schema = new SchemaBuilder(this.connection);

		for (const migration of allRan.reverse()) {
			const def = this.migrations.find((m) => m.name === migration.name);
			if (def) {
				console.log(`Resetting: ${migration.name}`);
				try {
					await def.down(schema);
					await this.removeMigration(migration.name);
					console.log(`Reset:  ${migration.name}`);
				} catch (err) {
					console.error(`Reset failed: ${migration.name}`, err);
					throw err;
				}
			}
		}
	}

	async refresh(): Promise<void> {
		await this.reset();
		await this.run();
	}

	async status(): Promise<MigrationStatusRow[]> {
		await this.ensureMigrationTable();
		return this.getRanMigrations();
	}

	private async ensureMigrationTable(): Promise<void> {
		const dialect = this.connection.getDialect();
		const sql = dialect.compileCreateMigrationsTable();
		await this.connection.raw(sql);
	}

	private async getRanMigrations(): Promise<MigrationStatusRow[]> {
		const result = await this.connection.raw(
			"SELECT name, batch, executed_at as executedAt FROM migrations ORDER BY batch ASC, name ASC",
		);
		return result.rows.map((row: any) => ({
			name: String(row.name),
			batch: Number(row.batch),
			executedAt: String(row.executedAt ?? ""),
		}));
	}

	private async getNextBatchNumber(): Promise<number> {
		const result = await this.connection.raw(
			"SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM migrations",
		);
		return Number(result.rows[0]?.next_batch ?? 1);
	}

	private async getLastBatchNumber(): Promise<number> {
		const result = await this.connection.raw(
			"SELECT COALESCE(MAX(batch), 0) as last_batch FROM migrations",
		);
		return Number(result.rows[0]?.last_batch ?? 0);
	}

	private async getMigrationsByBatch(
		batch: number,
	): Promise<MigrationStatusRow[]> {
		const result = await this.connection.raw(
			"SELECT name, batch, executed_at as executedAt FROM migrations WHERE batch = ? ORDER BY name ASC",
			[batch],
		);
		return result.rows.map((row: any) => ({
			name: String(row.name),
			batch: Number(row.batch),
			executedAt: String(row.executedAt ?? ""),
		}));
	}

	private async recordMigration(name: string, batch: number): Promise<void> {
		await this.connection.raw(
			"INSERT INTO migrations (name, batch) VALUES (?, ?)",
			[name, batch],
		);
	}

	private async removeMigration(name: string): Promise<void> {
		await this.connection.raw("DELETE FROM migrations WHERE name = ?", [name]);
	}
}
