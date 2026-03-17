import axios from 'axios';

// Interface for the Hunter.io domain search response
interface HunterDomainResponse {
  data: {
    domain: string;
    disposable: boolean;
    webmail: boolean;
    accept_all: boolean;
    pattern: string | null;
    organization: string | null;
    country: string | null;
    state: string | null;
    emails: Array<{
      value: string;
      type: string;
      confidence: number;
      sources: Array<{
        domain: string;
        uri: string;
        extracted_on: string;
      }>;
      first_name: string | null;
      last_name: string | null;
      position: string | null;
      seniority: string | null;
      department: string | null;
      linkedin: string | null;
      twitter: string | null;
      phone_number: string | null;
    }>;
  };
  meta: {
    results: number;
    params: {
      domain: string;
      company: string | null;
      type: string | null;
      seniority: string | null;
      department: string | null;
      limit: number;
      offset: number;
    };
  };
}

// Interface for the simplified email results we'll return
export interface EmailResult {
  domain: string;
  organization: string | null;
  emails: Array<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    position: string | null;
    confidence: number;
  }>;
  error?: string;
}

/**
 * Find emails associated with a domain using Hunter.io API
 * @param domain The domain to search for emails
 * @returns Promise with the email results
 */
export async function findEmailsByDomain(domain: string): Promise<EmailResult> {
  try {
    const apiKey = process.env.HUNTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('Hunter API key is not configured');
    }
    
    // Clean up domain (remove http/https and path)
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    const response = await axios.get<HunterDomainResponse>('https://api.hunter.io/v2/domain-search', {
      params: {
        domain: cleanDomain,
        api_key: apiKey,
        limit: 20 // Adjust as needed
      }
    });
    
    // Extract and transform the data to our simplified format
    return {
      domain: cleanDomain,
      organization: response.data.data.organization,
      emails: response.data.data.emails.map(email => ({
        email: email.value,
        firstName: email.first_name,
        lastName: email.last_name,
        position: email.position,
        confidence: email.confidence
      }))
    };
  } catch (error) {
    console.error(`Error querying Hunter.io API for domain ${domain}:`, error);
    
    // Return a structured error response
    return {
      domain,
      organization: null,
      emails: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}