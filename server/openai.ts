import OpenAI from "openai";
import { FirmData } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeUrl(
  url: string,
  title: string,
  snippet: string,
  analysisDepth: string = "deep" // Default to "deep" analysis if not specified
): Promise<FirmData> {
  try {
    const promptDetail: Record<string, string> = {
      basic: "Provide a brief overview of the firm, size estimation (Solo for single-attorney firms), practice areas, and primary location.",
      standard: "Include a more detailed firm overview, key practice areas with descriptions, size categorization (Solo for single-attorney firms, Small for 2-20, Mid-size for 21-100, Large for 100+), the approximate attorney count, founding date if available, main office location, and a brief analysis of their online presence.",
      deep: "Perform a comprehensive analysis including detailed firm history, all practice areas with specializations, firm size categorization (Solo for single-attorney firms, Small for 2-20, Mid-size for 21-100, Large for 100+), attorney count estimation, all office locations, key named partners or attorneys, client focus (individuals, businesses, etc.), founding year, and a detailed analysis of their online presence including design quality assessment."
    };

    const prompt = `
      Analyze the following information about a potential law firm website and provide a firmographic analysis.
      
      URL: ${url}
      Title: ${title}
      Description: ${snippet}
      
      First, assess whether this appears to be a law firm website. If it is not a law firm, please respond with:
      {"isLawFirm": false, "name": "Not a law firm", "website": "${url}"}
      
      If it IS a law firm, please provide a detailed firmographic analysis with this level of detail: ${promptDetail[analysisDepth]}
      
      Important guidelines for the analysis:
      - If the law firm has only one attorney, use "Solo" for the size field (not "1-10" or any other range)
      - For firms with multiple attorneys, categorize as "Small" (2-20), "Mid-size" (21-100), or "Large" (100+)
      - Try to locate and include any email addresses found on the website (both general contact email and individual attorney emails)
      - For keyPersonnel, include email addresses when available
      - CRITICAL: Do not assume the law firm practices any specific area of law based on the search query that found it. Only list practice areas explicitly mentioned on their website.
      - Be precise and accurate when identifying practice areas - don't list criminal defense unless there's clear evidence on their website that they handle criminal cases.
      - If you're not certain about specific practice areas, use more general terms or note the uncertainty in aiAnalysisNotes.
      
      Return ONLY a JSON object with the following structure:
      {
        "isLawFirm": true,
        "name": "Law Firm Name",
        "website": "domain.com",
        "emailAddress": "contact@lawfirm.com",
        "size": "Solo/Small/Mid-size/Large", 
        "attorneyCount": "Approximate number or range of attorneys",
        "practiceAreas": ["Practice Area 1", "Practice Area 2"],
        "location": "Primary location",
        "additionalOffices": ["Location 1", "Location 2"],
        "founded": "Year founded if available",
        "clientFocus": ["Individuals", "Small Businesses", etc.],
        "keyPersonnel": [{"name": "Person Name", "role": "Role", "email": "attorney@lawfirm.com"}],
        "overview": "Brief firm description",
        "aiAnalysisNotes": "Additional insights about their digital presence, firm specialization, etc."
      }
      
      Some fields may be omitted if the information isn't available.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a legal industry analyst specializing in law firm research." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const content = response.choices[0].message.content;
    const analysisResult = JSON.parse(content || "{}");

    if (!analysisResult.isLawFirm) {
      // Return a minimal object for non-law firms
      return {
        isLawFirm: false,
        name: "Not a law firm",
        website: url,
        overview: "This website does not belong to a law firm.",
        size: "N/A",
        attorneyCount: "N/A",
        practiceAreas: [],
        location: "N/A",
        aiAnalysisNotes: "This website was identified as not belonging to a law firm."
      };
    }

    // Ensure the result has all required fields with defaults as needed
    return {
      isLawFirm: true,
      name: analysisResult.name || "Unknown Law Firm",
      website: analysisResult.website || url,
      emailAddress: analysisResult.emailAddress,
      size: analysisResult.size || "Unknown",
      attorneyCount: analysisResult.attorneyCount || "Unknown",
      practiceAreas: analysisResult.practiceAreas || [],
      location: analysisResult.location || "Unknown",
      additionalOffices: analysisResult.additionalOffices || [],
      founded: analysisResult.founded,
      clientFocus: analysisResult.clientFocus || [],
      keyPersonnel: analysisResult.keyPersonnel || [],
      overview: analysisResult.overview || "No overview available.",
      aiAnalysisNotes: analysisResult.aiAnalysisNotes || "No additional analysis available."
    };
  } catch (error) {
    console.error("Error analyzing URL with OpenAI:", error);
    throw new Error(`Failed to analyze URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
