export interface PaginationOptions {
  pageSize: number;
  maxPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  totalItems: number;
}

export class EventPagination<T> {
  private pageSize: number;
  private maxPages: number;
  private currentPage: number = 0;
  private pageCache: Map<number, T[]> = new Map();
  private totalItems: number = 0;

  constructor(options: PaginationOptions) {
    this.pageSize = options.pageSize;
    this.maxPages = options.maxPages;
  }

  async loadPage(
    page: number,
    loader: (offset: number, limit: number) => Promise<T[]>
  ): Promise<T[]> {
    if (this.pageCache.has(page)) {
      return this.pageCache.get(page)!;
    }

    const offset = page * this.pageSize;
    const items = await loader(offset, this.pageSize);

    // Cache the page
    this.pageCache.set(page, items);

    // Limit cache size
    if (this.pageCache.size > this.maxPages) {
      const oldestPage = Math.min(...this.pageCache.keys());
      this.pageCache.delete(oldestPage);
    }

    return items;
  }

  async loadMore(
    loader: (offset: number, limit: number) => Promise<T[]>
  ): Promise<T[]> {
    this.currentPage++;
    return this.loadPage(this.currentPage, loader);
  }

  async loadInitial(
    loader: (offset: number, limit: number) => Promise<T[]>
  ): Promise<PaginatedData<T>> {
    this.currentPage = 0;
    this.pageCache.clear();

    const items = await this.loadPage(0, loader);

    return {
      items,
      currentPage: 0,
      totalPages: Math.ceil(this.totalItems / this.pageSize),
      hasMore: items.length === this.pageSize,
      totalItems: this.totalItems,
    };
  }

  setTotalItems(total: number): void {
    this.totalItems = total;
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  clearCache(): void {
    this.pageCache.clear();
    this.currentPage = 0;
  }

  getCachedPages(): number[] {
    return Array.from(this.pageCache.keys()).sort((a, b) => a - b);
  }
}
