import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { searchGoogle } from "./search";
import { searchSerpApi } from "./serpSearch";
import { analyzeUrl } from "./openai";
import { findEmailsByDomain, type EmailResult } from "./hunter";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.post("/api/search", async (req, res) => {
    try {
      const searchParamsSchema = z.object({
        location: z.string().min(1, "Location is required"),
        practiceArea: z.string().min(1, "Practice area is required"),
        resultCount: z.string(),
        // Allow analysisDepth to be optional since we're removing it from the UI
        analysisDepth: z.enum(["basic", "standard", "deep"]).optional(),
      });

      // Parse the form data and always set analysisDepth to "deep"
      const parsedParams = searchParamsSchema.parse(req.body);
      const searchParams = {
        ...parsedParams,
        analysisDepth: "deep" // Always use deep analysis
      };
      
      // Save search to database
      const search = await storage.createSearch({
        location: searchParams.location,
        practiceArea: searchParams.practiceArea,
        resultCount: searchParams.resultCount,
        analysisDepth: searchParams.analysisDepth,
      });
      
      // Perform the search with SerpApi
      const searchResults = await searchSerpApi(
        `${searchParams.practiceArea} lawyer ${searchParams.location}`,
        parseInt(searchParams.resultCount)
      );
      
      // Process each URL with OpenAI to analyze the law firms
      let processedResults = [];
      let lawFirmsCount = 0;
      let nonLawFirmsCount = 0;
      
      // Log each URL for debugging
      searchResults.forEach((result, index) => {
        console.log(`Result ${index + 1}: URL=${result.url}, Title=${result.title}`);
      });
      
      console.log(`Processing ${searchResults.length} search results with OpenAI...`);
      
      // Create a progress tracker
      let processedCount = 0;
      const updateProgressInterval = setInterval(() => {
        console.log(`Analysis progress: ${processedCount}/${searchResults.length} URLs processed`);
      }, 5000); // Log progress every 5 seconds
      
      try {
        for (const result of searchResults) {
          try {
            // Call OpenAI to analyze the website
            const analysis = await analyzeUrl(
              result.url, 
              result.title,
              result.snippet,
              searchParams.analysisDepth
            );
            
            processedCount++;
            
            if (!analysis.isLawFirm) {
              nonLawFirmsCount++;
              continue;
            }
            
            lawFirmsCount++;
            
            // Save to storage
            const firm = await storage.createFirm({
              ...analysis,
              searchId: search.id,
            });
            
            processedResults.push(firm);
            
            // Add a small delay between API calls to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Error processing URL ${result.url}:`, error);
            processedCount++;
          }
        }
      } finally {
        // Make sure we clear the interval
        clearInterval(updateProgressInterval);
        console.log(`Analysis complete: ${processedCount}/${searchResults.length} URLs processed`);
        console.log(`Found ${lawFirmsCount} law firms and ${nonLawFirmsCount} non-law firms`);
      }
      
      res.json({
        results: processedResults,
        stats: {
          totalAnalyzed: lawFirmsCount + nonLawFirmsCount,
          lawFirms: lawFirmsCount,
          nonLawFirms: nonLawFirmsCount,
        }
      });
      
    } catch (error) {
      console.error("Search error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get searches
  app.get("/api/searches", async (req, res) => {
    try {
      const searches = await storage.getSearches();
      res.json(searches);
    } catch (error) {
      console.error("Error fetching searches:", error);
      res.status(500).json({ error: "Failed to fetch searches" });
    }
  });
  
  // Get firms by search ID
  app.get("/api/firms/:searchId", async (req, res) => {
    try {
      const searchId = parseInt(req.params.searchId);
      const firms = await storage.getFirmsBySearchId(searchId);
      res.json(firms);
    } catch (error) {
      console.error("Error fetching firms:", error);
      res.status(500).json({ error: "Failed to fetch firms" });
    }
  });
  
  // Get a single firm by ID
  app.get("/api/firm/:id", async (req, res) => {
    try {
      const firmId = parseInt(req.params.id);
      const firm = await storage.getFirm(firmId);
      
      if (!firm) {
        return res.status(404).json({ error: "Firm not found" });
      }
      
      res.json(firm);
    } catch (error) {
      console.error("Error fetching firm:", error);
      res.status(500).json({ error: "Failed to fetch firm" });
    }
  });

  // Find emails for domains using Hunter.io API
  app.post("/api/find-emails", async (req, res) => {
    try {
      const schema = z.object({
        domains: z.array(z.string()).min(1, "At least one domain is required")
      });
      
      const { domains } = schema.parse(req.body);
      console.log(`Finding emails for ${domains.length} domains using Hunter.io API...`);
      
      const results: EmailResult[] = [];
      
      // Process each domain
      for (const domain of domains) {
        try {
          const emailResult = await findEmailsByDomain(domain);
          results.push(emailResult);
          
          // Add a small delay between API calls to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error finding emails for domain ${domain}:`, error);
          results.push({
            domain,
            organization: null,
            emails: [],
            error: error instanceof Error ? error.message : "Unknown error occurred"
          });
        }
      }
      
      console.log(`Completed email lookup for ${domains.length} domains`);
      res.json({ results });
    } catch (error) {
      console.error("Error in email lookup:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
