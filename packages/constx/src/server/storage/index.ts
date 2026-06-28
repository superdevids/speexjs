import * as fs from "node:fs";
import * as path from "node:path";

export interface StorageConfig {
	defaultDisk?: string;
	disks: {
		[name: string]: {
			driver: "local";
			root: string;
			url?: string;
			permissions?: number;
		};
	};
}

export interface FileOptions {
	name?: string;
	disk?: string;
	overwrite?: boolean;
}

export class LocalDisk {
	private root: string;
	private baseUrl?: string;

	constructor(root: string, baseUrl?: string) {
		this.root = path.resolve(root);
		this.baseUrl = baseUrl;
	}

	async put(filePath: string, content: string | Buffer): Promise<string> {
		const fullPath = this.resolvePath(filePath);
		const dir = path.dirname(fullPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(fullPath, content);
		return filePath;
	}

	async get(filePath: string): Promise<Buffer> {
		const fullPath = this.resolvePath(filePath);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`File not found: ${filePath}`);
		}
		return fs.readFileSync(fullPath);
	}

	async exists(filePath: string): Promise<boolean> {
		const fullPath = this.resolvePath(filePath);
		return fs.existsSync(fullPath);
	}

	async delete(filePath: string): Promise<boolean> {
		const fullPath = this.resolvePath(filePath);
		if (!fs.existsSync(fullPath)) {
			return false;
		}
		fs.unlinkSync(fullPath);
		return true;
	}

	async copy(from: string, to: string): Promise<boolean> {
		const fromPath = this.resolvePath(from);
		const toPath = this.resolvePath(to);
		if (!fs.existsSync(fromPath)) {
			return false;
		}
		const dir = path.dirname(toPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.copyFileSync(fromPath, toPath);
		return true;
	}

	async move(from: string, to: string): Promise<boolean> {
		const fromPath = this.resolvePath(from);
		const toPath = this.resolvePath(to);
		if (!fs.existsSync(fromPath)) {
			return false;
		}
		const dir = path.dirname(toPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.renameSync(fromPath, toPath);
		return true;
	}

	url(filePath: string): string {
		if (this.baseUrl === undefined) {
			throw new Error("Base URL not configured for this disk");
		}
		const normalized = filePath.replace(/\\/g, "/");
		return `${this.baseUrl.replace(/\/$/, "")}/${normalized.replace(/^\//, "")}`;
	}

	async size(filePath: string): Promise<number> {
		const fullPath = this.resolvePath(filePath);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`File not found: ${filePath}`);
		}
		return fs.statSync(fullPath).size;
	}

	async lastModified(filePath: string): Promise<Date> {
		const fullPath = this.resolvePath(filePath);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`File not found: ${filePath}`);
		}
		return fs.statSync(fullPath).mtime;
	}

	async files(directory: string = ""): Promise<string[]> {
		const fullPath = this.resolvePath(directory);
		if (!fs.existsSync(fullPath)) {
			return [];
		}
		return fs
			.readdirSync(fullPath)
			.filter((name) => {
				const stat = fs.statSync(path.join(fullPath, name));
				return stat.isFile();
			})
			.map((name) => path.join(directory, name).replace(/\\/g, "/"));
	}

	async directories(directory: string = ""): Promise<string[]> {
		const fullPath = this.resolvePath(directory);
		if (!fs.existsSync(fullPath)) {
			return [];
		}
		return fs
			.readdirSync(fullPath)
			.filter((name) => {
				const stat = fs.statSync(path.join(fullPath, name));
				return stat.isDirectory();
			})
			.map((name) => path.join(directory, name).replace(/\\/g, "/"));
	}

	async makeDirectory(dirPath: string): Promise<void> {
		const fullPath = this.resolvePath(dirPath);
		fs.mkdirSync(fullPath, { recursive: true });
	}

	async deleteDirectory(dirPath: string): Promise<void> {
		const fullPath = this.resolvePath(dirPath);
		if (fs.existsSync(fullPath)) {
			fs.rmSync(fullPath, { recursive: true, force: true });
		}
	}

	async append(filePath: string, content: string): Promise<void> {
		const fullPath = this.resolvePath(filePath);
		const dir = path.dirname(fullPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.appendFileSync(fullPath, content, "utf-8");
	}

	async prepend(filePath: string, content: string): Promise<void> {
		const fullPath = this.resolvePath(filePath);
		const dir = path.dirname(fullPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		const existing = fs.existsSync(fullPath)
			? fs.readFileSync(fullPath, "utf-8")
			: "";
		fs.writeFileSync(fullPath, content + existing, "utf-8");
	}

	readStream(filePath: string): fs.ReadStream {
		const fullPath = this.resolvePath(filePath);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`File not found: ${filePath}`);
		}
		return fs.createReadStream(fullPath);
	}

	writeStream(filePath: string): fs.WriteStream {
		const fullPath = this.resolvePath(filePath);
		const dir = path.dirname(fullPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		return fs.createWriteStream(fullPath);
	}

	getRoot(): string {
		return this.root;
	}

	getUrl(): string | undefined {
		return this.baseUrl;
	}

	private resolvePath(filePath: string): string {
		const normalized = filePath.replace(/\\/g, "/");
		const resolved = path.resolve(this.root, normalized);
		const resolvedRoot = path.resolve(this.root);

		if (!resolved.startsWith(resolvedRoot)) {
			throw new Error(`Path traversal detected: ${filePath}`);
		}

		return resolved;
	}
}

export class Storage {
	private config: StorageConfig;
	private diskInstances: Map<string, LocalDisk>;

	constructor(config: StorageConfig) {
		this.config = config;
		this.diskInstances = new Map();
	}

	disk(name?: string): LocalDisk {
		const diskName = name ?? this.config.defaultDisk ?? "local";
		const existing = this.diskInstances.get(diskName);
		if (existing !== undefined) {
			return existing;
		}

		const diskConfig = this.config.disks[diskName];
		if (diskConfig === undefined) {
			throw new Error(`Disk not configured: ${diskName}`);
		}

		const instance = new LocalDisk(diskConfig.root, diskConfig.url);
		this.diskInstances.set(diskName, instance);
		return instance;
	}

	async put(filePath: string, content: string | Buffer): Promise<string> {
		return this.disk().put(filePath, content);
	}

	async get(filePath: string): Promise<Buffer> {
		return this.disk().get(filePath);
	}

	async exists(filePath: string): Promise<boolean> {
		return this.disk().exists(filePath);
	}

	async delete(filePath: string): Promise<boolean> {
		return this.disk().delete(filePath);
	}

	async copy(from: string, to: string): Promise<boolean> {
		return this.disk().copy(from, to);
	}

	async move(from: string, to: string): Promise<boolean> {
		return this.disk().move(from, to);
	}

	async url(filePath: string): Promise<string> {
		return this.disk().url(filePath);
	}

	async size(filePath: string): Promise<number> {
		return this.disk().size(filePath);
	}

	async lastModified(filePath: string): Promise<Date> {
		return this.disk().lastModified(filePath);
	}

	async files(directory?: string): Promise<string[]> {
		return this.disk().files(directory);
	}

	async directories(directory?: string): Promise<string[]> {
		return this.disk().directories(directory);
	}

	async makeDirectory(dirPath: string): Promise<void> {
		return this.disk().makeDirectory(dirPath);
	}

	async deleteDirectory(dirPath: string): Promise<void> {
		return this.disk().deleteDirectory(dirPath);
	}
}

let defaultInstance: Storage | null = null;

export function createStorage(config: StorageConfig): Storage {
	defaultInstance = new Storage(config);
	return defaultInstance;
}

export function storage(): Storage {
	if (defaultInstance === null) {
		throw new Error(
			"Storage not initialized. Call createStorage(config) first.",
		);
	}
	return defaultInstance;
}
