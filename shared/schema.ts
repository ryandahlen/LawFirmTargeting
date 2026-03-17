import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the KeyPerson type for firm personnel
export interface KeyPerson {
  name: string;
  role: string;
}

// Define the core FirmData type
export interface FirmData {
  id?: number;
  name: string;
  website: string;
  emailAddress?: string;
  isLawFirm: boolean;
  size: string;
  attorneyCount: string;
  practiceAreas: string[];
  location: string;
  additionalOffices?: string[];
  founded?: string;
  clientFocus?: string[];
  keyPersonnel?: KeyPerson[];
  overview: string;
  aiAnalysisNotes: string;
  searchId?: number;
  createdAt?: Date;
}

// Search parameters
export interface SearchParams {
  location: string;
  practiceArea: string;
  resultCount: string;
  analysisDepth: string;
}

// Define the database tables
export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  location: text("location").notNull(),
  practiceArea: text("practice_area").notNull(),
  resultCount: text("result_count").notNull(),
  analysisDepth: text("analysis_depth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const firms = pgTable("firms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  emailAddress: text("email_address"),
  isLawFirm: boolean("is_law_firm").notNull(),
  size: text("size"),
  attorneyCount: text("attorney_count"),
  practiceAreas: text("practice_areas").array().notNull(),
  location: text("location").notNull(),
  additionalOffices: text("additional_offices").array(),
  founded: text("founded"),
  clientFocus: text("client_focus").array(),
  keyPersonnel: jsonb("key_personnel").$type<KeyPerson[]>(),
  overview: text("overview").notNull(),
  aiAnalysisNotes: text("ai_analysis_notes"),
  searchId: integer("search_id").references(() => searches.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertSearchSchema = createInsertSchema(searches).pick({
  location: true,
  practiceArea: true,
  resultCount: true,
  analysisDepth: true,
});

export const insertFirmSchema = createInsertSchema(firms).pick({
  name: true,
  website: true,
  emailAddress: true,
  isLawFirm: true,
  size: true,
  attorneyCount: true,
  practiceAreas: true,
  location: true,
  additionalOffices: true,
  founded: true,
  clientFocus: true,
  keyPersonnel: true,
  overview: true,
  aiAnalysisNotes: true,
  searchId: true,
});

export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type InsertFirm = z.infer<typeof insertFirmSchema>;
export type Search = typeof searches.$inferSelect;
export type Firm = typeof firms.$inferSelect;
