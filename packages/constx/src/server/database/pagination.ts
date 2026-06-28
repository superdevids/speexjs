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

export class Pagination<T = any> {
	readonly data: T[];
	readonly currentPage: number;
	readonly perPage: number;
	readonly total: number;
	readonly lastPage: number;
	readonly from: number;
	readonly to: number;

	constructor(result: PaginatedResult<T>) {
		this.data = result.data;
		this.currentPage = result.currentPage;
		this.perPage = result.perPage;
		this.total = result.total;
		this.lastPage = result.lastPage;
		this.from = result.from;
		this.to = result.to;
	}

	get hasMore(): boolean {
		return this.currentPage < this.lastPage;
	}

	get hasPrev(): boolean {
		return this.currentPage > 1;
	}

	get isEmpty(): boolean {
		return this.data.length === 0;
	}

	nextPage(): PaginationUrl | null {
		if (!this.hasMore) return null;
		return {
			page: this.currentPage + 1,
			perPage: this.perPage,
			url: null,
		};
	}

	prevPage(): PaginationUrl | null {
		if (!this.hasPrev) return null;
		return {
			page: this.currentPage - 1,
			perPage: this.perPage,
			url: null,
		};
	}

	toJSON(): Record<string, any> {
		return {
			data: this.data,
			pagination: {
				currentPage: this.currentPage,
				perPage: this.perPage,
				total: this.total,
				lastPage: this.lastPage,
				from: this.from,
				to: this.to,
				hasMore: this.hasMore,
				hasPrev: this.hasPrev,
				isEmpty: this.isEmpty,
			},
		};
	}

	map<U>(fn: (item: T, index: number) => U): Pagination<U> {
		return new Pagination<U>({
			...this,
			data: this.data.map(fn),
		});
	}

	items(): T[] {
		return this.data;
	}

	static from<T>(result: PaginatedResult<T>): Pagination<T> {
		return new Pagination(result);
	}
}

export interface PaginationUrl {
	page: number;
	perPage: number;
	url: string | null;
}
