import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { searchGoogle } from "./search";
import { searchSerpApi } from "./serpSearch";
import { analyzeUrl } from "./openai";
import { findEmailsByDomain, type EmailResult } from "./hunter";
import { sendEmail } from "./email";

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
      
      // Process all URLs in parallel to keep total time well under HTTP timeout
      console.log(`Processing ${searchResults.length} search results with OpenAI...`);

      const analysisResults = await Promise.all(
        searchResults.map(async (result) => {
          try {
            const analysis = await analyzeUrl(
              result.url,
              result.title,
              result.snippet,
              searchParams.analysisDepth
            );
            return { success: true, analysis } as const;
          } catch (error) {
            console.error(`Error processing URL ${result.url}:`, error);
            return { success: false } as const;
          }
        })
      );

      // Save law firms to DB
      const firmInserts = analysisResults
        .filter((r) => r.success && r.analysis.isLawFirm)
        .map((r) => r.success ? r.analysis : null)
        .filter(Boolean);

      const savedFirms = await Promise.all(
        firmInserts.map((analysis) =>
          storage.createFirm({ ...analysis!, searchId: search.id })
        )
      );

      const lawFirmsCount = savedFirms.length;
      const nonLawFirmsCount = analysisResults.filter(
        (r) => r.success && !r.analysis.isLawFirm
      ).length;
      const processedResults = savedFirms;

      console.log(`Analysis complete: ${analysisResults.length}/${searchResults.length} URLs processed`);
      console.log(`Found ${lawFirmsCount} law firms and ${nonLawFirmsCount} non-law firms`);
      
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

  // Send personalized emails via Resend
  app.post("/api/send-emails", async (req, res) => {
    try {
      const schema = z.object({
        recipients: z.array(z.object({
          email: z.string().email(),
          firmName: z.string(),
          location: z.string(),
          practiceArea: z.string(),
        })).min(1, "At least one recipient is required"),
        subjectTemplate: z.string().min(1, "Subject is required"),
        bodyTemplate: z.string().min(1, "Body is required"),
        fromName: z.string().min(1, "From name is required"),
        fromEmail: z.string().email(),
      });

      const { recipients, subjectTemplate, bodyTemplate, fromName, fromEmail } = schema.parse(req.body);

      // Validate fromEmail against configured FROM_EMAIL env var
      const configuredFromEmail = process.env.FROM_EMAIL;
      if (configuredFromEmail && fromEmail !== configuredFromEmail) {
        return res.status(400).json({ error: `From email must be ${configuredFromEmail}` });
      }

      const interpolate = (template: string, vars: Record<string, string>) =>
        template
          .replace(/\{\{firmName\}\}/g, vars.firmName)
          .replace(/\{\{location\}\}/g, vars.location)
          .replace(/\{\{practiceArea\}\}/g, vars.practiceArea);

      const results: Array<{ email: string; success: boolean; error?: string }> = [];

      for (const recipient of recipients) {
        const vars = {
          firmName: recipient.firmName,
          location: recipient.location,
          practiceArea: recipient.practiceArea,
        };

        const subject = interpolate(subjectTemplate, vars);
        const html = interpolate(bodyTemplate, vars);
        const text = html.replace(/<[^>]+>/g, '');

        try {
          await sendEmail({ to: recipient.email, fromName, fromEmail, subject, html, text });
          results.push({ email: recipient.email, success: true });
        } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
          results.push({
            email: recipient.email,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }

        // Small delay between sends to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Email send complete: ${results.filter(r => r.success).length}/${results.length} succeeded`);
      res.json({ results });
    } catch (error) {
      console.error("Error sending emails:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
