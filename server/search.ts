import axios from "axios";

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

// In a production environment, you would use a real search API like Google Custom Search API
// For now, we'll implement a function that returns realistic search results for law firms
export async function searchGoogle(
  query: string,
  resultCount: number = 10
): Promise<SearchResult[]> {
  // If we have a Google Search API key, use it
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (googleApiKey && searchEngineId) {
    try {
      console.log(`Searching for: ${query}, with result count: ${resultCount}`);
      
      // For testing, combine the query with "lawyer" if it's not already there
      if (!query.toLowerCase().includes("lawyer") && !query.toLowerCase().includes("attorney")) {
        query = `${query} lawyer`;
      }
      
      // Google API only supports up to 10 results per query in free tier
      // We'll need to make multiple requests with different start indices
      const MAX_RESULTS_PER_REQUEST = 10;
      const totalRequests = Math.min(Math.ceil(resultCount / MAX_RESULTS_PER_REQUEST), 10); // Cap at 10 requests (100 results)
      
      console.log(`Will make ${totalRequests} separate Google API requests to get ${resultCount} results`);
      
      let allResults: any[] = [];
      
      for (let i = 0; i < totalRequests; i++) {
        try {
          const startIndex = i * MAX_RESULTS_PER_REQUEST + 1; // Google API uses 1-based indexing
          console.log(`Making Google API request ${i + 1}/${totalRequests}, startIndex=${startIndex}`);
          
          const response = await axios.get(
            "https://www.googleapis.com/customsearch/v1",
            {
              params: {
                key: googleApiKey,
                cx: searchEngineId,
                q: query,
                num: MAX_RESULTS_PER_REQUEST,
                start: startIndex
              },
            }
          );
          
          if (response.data.items && Array.isArray(response.data.items)) {
            console.log(`Request ${i + 1} returned ${response.data.items.length} results`);
            allResults = [...allResults, ...response.data.items];
          }
          
          // Add a small delay between requests to avoid rate limits
          if (i < totalRequests - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Error in Google API request ${i + 1}:`, error);
          // Continue with other requests even if one fails
        }
      }
      
      console.log(`Total Google API results collected: ${allResults.length}`);
      
      // For testing, we'll use the response object structure but with our combined results
      const response = { data: { items: allResults } };
      
      if (!response.data.items || !Array.isArray(response.data.items)) {
        console.warn("Google search returned no items or invalid format", response.data);
        // Fall back to mock results
      } else {
        console.log(`Found ${response.data.items.length} results from Google search`);
        return response.data.items.map((item: any) => ({
          url: item.link,
          title: item.title,
          snippet: item.snippet || "",
        }));
      }
    } catch (error) {
      console.error("Error calling Google Search API:", error);
      console.log("Falling back to mock search results");
    }
  } else {
    console.log("No Google Search API keys found, using mock search results");
  }
  
  // For development or if no API key is provided, generate some mock results
  // In production, you should replace this with a real API call
  const location = query.split(" ").pop() || "";
  
  // Simulate a short delay to mimic a real API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate search results with law firm names based on the query
  const practiceArea = query.includes("Personal Injury") ? "Personal Injury" :
                       query.includes("Family Law") ? "Family Law" :
                       query.includes("Criminal Defense") ? "Criminal Defense" :
                       query.includes("Estate Planning") ? "Estate Planning" :
                       query.includes("Corporate Law") ? "Corporate Law" :
                       "General Practice";
  
  const firms = [
    `Smith & Johnson ${practiceArea} Lawyers`,
    `Davis Legal Group`,
    `Thompson & Associates`,
    `Wilson Law Firm`,
    `Anderson Legal Services`,
    `Brown & White Law`,
    `Clark Family Law Center`,
    `Edwards & Martin`,
    `Franklin Injury Attorneys`,
    `Garcia Law Group`,
    `Harrison Legal Counsel`,
    `Ingram & Partners`,
    `Jackson Legal Solutions`,
    `Kennedy Law Associates`,
    `Lewis & Lewis`,
    `Miller Defense Attorneys`,
    `Nelson Legal Advisors`,
    `Olson Law Offices`,
    `Parker & Quinn`,
    `Quinn & Associates`
  ];
  
  // Mix in some non-law firm results (about 10-15%)
  const nonLawSites = [
    "LegalZoom Document Services",
    "Martindale-Hubbell Law Directory",
    "Avvo Legal Services",
    "FindLaw Legal Resources",
    "Nolo Legal Encyclopedia",
    "Justia Legal Resources"
  ];
  
  // Combine and shuffle
  const allSites = [...firms];
  for (let i = 0; i < Math.ceil(resultCount * 0.15); i++) {
    const randomIndex = Math.floor(Math.random() * nonLawSites.length);
    const randomPosition = Math.floor(Math.random() * allSites.length);
    allSites.splice(randomPosition, 0, nonLawSites[randomIndex]);
  }
  
  // Take only the requested number
  const selectedSites = allSites.slice(0, resultCount);
  
  // Generate results
  return selectedSites.map((name) => {
    const domain = name
      .toLowerCase()
      .replace(/[&\s]+/g, "")
      .replace(/[-–—]+/g, "")
      .replace(/[^a-z0-9]/g, "");
    
    return {
      url: `https://www.${domain}.com`,
      title: `${name} - ${location} Attorney`,
      snippet: `${name} specializes in ${practiceArea} legal services in ${location}. Our experienced attorneys provide professional representation for clients. Contact us for a consultation.`,
    };
  });
}
