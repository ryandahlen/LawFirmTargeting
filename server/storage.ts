import { 
  type Search, 
  type Firm, 
  type InsertSearch, 
  type InsertFirm,
  type FirmData,
  type SearchParams
} from "@shared/schema";

export interface IStorage {
  // Search related methods
  createSearch(search: InsertSearch): Promise<Search>;
  getSearch(id: number): Promise<Search | undefined>;
  getSearches(): Promise<Search[]>;
  
  // Firm related methods
  createFirm(firm: InsertFirm): Promise<Firm>;
  getFirm(id: number): Promise<Firm | undefined>;
  getFirmsBySearchId(searchId: number): Promise<Firm[]>;
}

export class MemStorage implements IStorage {
  private searches: Map<number, Search>;
  private firms: Map<number, Firm>;
  private searchIdCounter: number;
  private firmIdCounter: number;

  constructor() {
    this.searches = new Map();
    this.firms = new Map();
    this.searchIdCounter = 1;
    this.firmIdCounter = 1;
  }

  async createSearch(search: InsertSearch): Promise<Search> {
    const id = this.searchIdCounter++;
    const createdAt = new Date();
    const newSearch: Search = { ...search, id, createdAt };
    this.searches.set(id, newSearch);
    return newSearch;
  }

  async getSearch(id: number): Promise<Search | undefined> {
    return this.searches.get(id);
  }

  async getSearches(): Promise<Search[]> {
    return Array.from(this.searches.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createFirm(firm: InsertFirm): Promise<Firm> {
    const id = this.firmIdCounter++;
    const createdAt = new Date();
    const newFirm: Firm = { ...firm, id, createdAt };
    this.firms.set(id, newFirm);
    return newFirm;
  }

  async getFirm(id: number): Promise<Firm | undefined> {
    return this.firms.get(id);
  }

  async getFirmsBySearchId(searchId: number): Promise<Firm[]> {
    return Array.from(this.firms.values())
      .filter(firm => firm.searchId === searchId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

import { DatabaseStorage } from "./dbStorage";

// Use DatabaseStorage for persistent storage
export const storage = new DatabaseStorage();
