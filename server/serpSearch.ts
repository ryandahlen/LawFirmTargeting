import axios from 'axios';

interface SerpApiSearchResult {
  title: string;
  url: string; // Match the structure expected by the rest of the application
  snippet: string;
}

interface SerpApiResponse {
  search_metadata: {
    id: string;
    status: string;
    json_endpoint: string;
    created_at: string;
    processed_at: string;
    google_url: string;
    raw_html_file: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: string;
    q: string;
    google_domain: string;
    device: string;
  };
  search_information: {
    organic_results_state: string;
    query_displayed: string;
    total_results: number;
    time_taken_displayed: number;
  };
  organic_results: Array<{
    position: number;
    title: string;
    link: string;
    displayed_link: string;
    snippet: string;
    snippet_highlighted_words?: string[];
    about_this_result?: {
      source: {
        description: string;
        icon: string;
      };
    };
    cached_page_link?: string;
    related_pages_link?: string;
  }>;
}

/**
 * Search for results using SerpApi
 * @param query The search query
 * @param numResults Number of results to return
 * @returns Promise with search results
 */
export async function searchSerpApi(
  query: string,
  numResults: number = 10
): Promise<any[]> { // Using any[] to avoid type issues and match what the application expects
  try {
    if (!process.env.SERPAPI_API_KEY) {
      throw new Error("SERPAPI_API_KEY environment variable is not set");
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    const maxResultsPerPage = 100; // SerpApi allows up to 100 results per page
    const totalRequests = Math.ceil(numResults / maxResultsPerPage);
    let allResults: SerpApiSearchResult[] = [];

    console.log(`Will make ${totalRequests} separate SerpApi requests to get ${numResults} results`);

    // Make multiple requests if necessary to get the desired number of results
    for (let i = 0; i < totalRequests; i++) {
      const start = i * maxResultsPerPage;
      console.log(`Making SerpApi request ${i + 1}/${totalRequests}, startIndex=${start + 1}`);

      const response = await axios.get<SerpApiResponse>('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: apiKey,
          engine: 'google',
          google_domain: 'google.com',
          gl: 'us', // Google country
          hl: 'en', // Language
          num: Math.min(maxResultsPerPage, numResults - start), // Number of results per page
          start: start, // Starting index for pagination
          device: 'desktop'
        }
      });

      // Extract only the information we need
      const results = response.data.organic_results.map(result => ({
        title: result.title,
        url: result.link, // Make sure we're using url for compatibility with the rest of the application
        snippet: result.snippet || ''
      }));

      allResults = [...allResults, ...results];
      console.log(`Request ${i + 1} returned ${results.length} results`);

      // If we got fewer results than requested, there are no more results
      if (results.length < Math.min(maxResultsPerPage, numResults - start)) {
        break;
      }

      // Add a short delay between requests to avoid rate limiting
      if (i < totalRequests - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Total SerpApi results collected: ${allResults.length}`);
    return allResults.slice(0, numResults);
  } catch (error) {
    console.error('Error searching with SerpApi:', error);
    throw new Error(`SerpApi search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}