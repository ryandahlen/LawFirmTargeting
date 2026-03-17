import { 
  type Search, 
  type Firm, 
  type InsertSearch, 
  type InsertFirm,
  searches,
  firms,
  type KeyPerson
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async createSearch(search: InsertSearch): Promise<Search> {
    const [newSearch] = await db
      .insert(searches)
      .values([search])
      .returning();
    return newSearch;
  }

  async getSearch(id: number): Promise<Search | undefined> {
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.id, id));
    return search;
  }

  async getSearches(): Promise<Search[]> {
    const allSearches = await db
      .select()
      .from(searches)
      .orderBy(searches.createdAt);
    return allSearches;
  }

  async createFirm(firm: InsertFirm): Promise<Firm> {
    // Use a safer approach by explicitly creating the insert data
    const insertData = {
      name: firm.name,
      website: firm.website,
      emailAddress: firm.emailAddress || null,
      isLawFirm: firm.isLawFirm,
      size: firm.size || null,
      attorneyCount: firm.attorneyCount || null,
      practiceAreas: firm.practiceAreas,
      location: firm.location,
      additionalOffices: firm.additionalOffices || null,
      founded: firm.founded || null,
      clientFocus: firm.clientFocus || null,
      overview: firm.overview,
      aiAnalysisNotes: firm.aiAnalysisNotes || null,
      searchId: firm.searchId || null
    };
    
    // Handle the JSON field separately
    if (firm.keyPersonnel) {
      (insertData as any).keyPersonnel = firm.keyPersonnel;
    }
    
    const [newFirm] = await db
      .insert(firms)
      .values([insertData])
      .returning();
    return newFirm;
  }

  async getFirm(id: number): Promise<Firm | undefined> {
    const [firm] = await db
      .select()
      .from(firms)
      .where(eq(firms.id, id));
    return firm;
  }

  async getFirmsBySearchId(searchId: number): Promise<Firm[]> {
    const firmsList = await db
      .select()
      .from(firms)
      .where(eq(firms.searchId, searchId))
      .orderBy(firms.name);
    return firmsList;
  }
}