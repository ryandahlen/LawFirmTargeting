import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Filter,
  Check,
  Loader2,
  Hourglass,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { FirmData } from "@shared/schema";
import EmailResultsModal, { type SelectedContact } from "./EmailResultsModal";
import ComposeEmailModal, { type ComposeRecipient } from "./ComposeEmailModal";
import { apiRequest } from "@/lib/queryClient";

interface ResultsPanelProps {
  results: FirmData[];
  stats: {
    totalAnalyzed: number;
    lawFirms: number;
    nonLawFirms: number;
  };
  searchInProgress: boolean;
  progress: number;
  onViewFirm: (firm: FirmData) => void;
  showStatsOnly?: boolean;
  showResultsOnly?: boolean;
}

export default function ResultsPanel({
  results,
  stats,
  searchInProgress,
  progress,
  onViewFirm,
  showStatsOnly,
  showResultsOnly
}: ResultsPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFirms, setSelectedFirms] = useState<Set<number>>(new Set());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailResults, setEmailResults] = useState<any[]>([]);
  const [emailLookupLoading, setEmailLookupLoading] = useState(false);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeRecipients, setComposeRecipients] = useState<ComposeRecipient[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(results.length / itemsPerPage);
  
  // Handle selecting all firms on current page
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedFirms);
      paginatedResults.forEach(firm => {
        if (firm.id !== undefined && firm.isLawFirm) {
          newSelected.add(firm.id);
        }
      });
      setSelectedFirms(newSelected);
    } else {
      // Only deselect firms on the current page
      const newSelected = new Set(selectedFirms);
      paginatedResults.forEach(firm => {
        if (firm.id !== undefined) {
          newSelected.delete(firm.id);
        }
      });
      setSelectedFirms(newSelected);
    }
  };
  
  // Handle selecting a single firm
  const handleSelectFirm = (firmId: number | undefined, checked: boolean) => {
    if (firmId === undefined) return;
    
    const newSelected = new Set(selectedFirms);
    if (checked) {
      newSelected.add(firmId);
    } else {
      newSelected.delete(firmId);
    }
    setSelectedFirms(newSelected);
  };
  
  // Check if all firms on current page are selected
  const areAllSelected = paginatedResults.length > 0 && 
    paginatedResults.every(firm => 
      firm.id !== undefined && (!firm.isLawFirm || selectedFirms.has(firm.id))
    );
  
  // Get domains of selected firms
  const getSelectedDomains = () => {
    return results
      .filter(firm => firm.id !== undefined && selectedFirms.has(firm.id))
      .map(firm => firm.website);
  };
  
  // Handle finding emails for selected domains
  const handleFindEmails = async () => {
    const domains = getSelectedDomains();
    
    if (domains.length === 0) return;
    
    setEmailLookupLoading(true);
    setEmailModalOpen(true);
    
    try {
      const response = await fetch('/api/find-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domains })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      
      const data = await response.json();
      setEmailResults(data.results);
    } catch (error) {
      console.error('Error finding emails:', error);
      setEmailResults([]);
    } finally {
      setEmailLookupLoading(false);
    }
  };
  
  const handleSendWithTool = (contacts: SelectedContact[]) => {
    const enriched: ComposeRecipient[] = contacts.map(contact => {
      const firm = results.find(f => f.website === contact.domain);
      return {
        email: contact.email,
        firmName: contact.firmName,
        location: firm?.location ?? "",
        practiceArea: firm?.practiceAreas[0] ?? "",
      };
    });
    setComposeRecipients(enriched);
    setEmailModalOpen(false);
    setComposeModalOpen(true);
  };

  const handleExport = async () => {
    // Import the xlsx library dynamically
    const XLSX = await import('xlsx');
    
    // Prepare data for Excel
    const headers = ["Firm Name", "Website", "Email", "Size", "Practice Areas", "Location"];
    const rows = results.map(firm => [
      firm.name,
      firm.website,
      firm.emailAddress || "N/A",
      firm.size,
      firm.practiceAreas.join(", "),
      firm.location
    ]);
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Law Firms");
    
    // Generate XLSX file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create Blob and download
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "law_firm_analysis.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleGenerateReport = () => {
    // Generate a more detailed report
    let reportContent = `# Law Firm Analysis Report\n\n`;
    reportContent += `**Date Generated:** ${new Date().toLocaleDateString()}\n\n`;
    reportContent += `**Total Firms Analyzed:** ${results.length}\n\n`;
    reportContent += `**Law Firms Found:** ${stats.lawFirms}\n\n`;
    reportContent += `**Non-Law Firms Found:** ${stats.nonLawFirms}\n\n`;
    
    reportContent += `## Firm Details\n\n`;
    
    results.forEach((firm, index) => {
      reportContent += `### ${index + 1}. ${firm.name}\n\n`;
      reportContent += `**Website:** ${firm.website}\n\n`;
      
      if (firm.emailAddress) {
        reportContent += `**Email:** ${firm.emailAddress}\n\n`;
      }
      
      reportContent += `**Size:** ${firm.size}\n\n`;
      reportContent += `**Attorney Count:** ${firm.attorneyCount}\n\n`;
      reportContent += `**Practice Areas:** ${firm.practiceAreas.join(", ")}\n\n`;
      reportContent += `**Location:** ${firm.location}\n\n`;
      
      if (firm.additionalOffices && firm.additionalOffices.length > 0) {
        reportContent += `**Additional Offices:** ${firm.additionalOffices.join(", ")}\n\n`;
      }
      
      if (firm.founded) {
        reportContent += `**Founded:** ${firm.founded}\n\n`;
      }
      
      if (firm.clientFocus && firm.clientFocus.length > 0) {
        reportContent += `**Client Focus:** ${firm.clientFocus.join(", ")}\n\n`;
      }
      
      if (firm.keyPersonnel && firm.keyPersonnel.length > 0) {
        reportContent += `**Key Personnel:**\n\n`;
        firm.keyPersonnel.forEach(person => {
          reportContent += `- ${person.name} (${person.role})\n`;
        });
        reportContent += `\n`;
      }
      
      reportContent += `**Overview:**\n\n${firm.overview}\n\n`;
      
      if (firm.aiAnalysisNotes) {
        reportContent += `**AI Notes:**\n\n${firm.aiAnalysisNotes}\n\n`;
      }
      
      reportContent += `---\n\n`;
    });
    
    // Create a download link for the markdown report
    const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "law_firm_detailed_report.md");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPracticeAreaBadges = (practiceAreas: string[]) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800"
    ];
    
    return practiceAreas.map((area, index) => (
      <Badge key={index} variant="outline" className={`mr-1 ${colors[index % colors.length]}`}>
        {area}
      </Badge>
    ));
  };

  return (
    <section className="space-y-6">
      {/* Stats section removed since it's now displayed separately */}
      {searchInProgress && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Analysis in Progress</h3>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2.5" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 mr-3 flex items-center justify-center">
                  <Check className="text-green-600 h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">Finding search results</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 mr-3 flex items-center justify-center">
                  <Loader2 className="text-primary h-5 w-5 animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {progress < 50 ? "Searching for law firms..." : "Analyzing websites..."}
                  </p>
                  <p className="text-xs text-neutral-500">This may take several minutes for large result sets</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 mr-3 flex items-center justify-center">
                  <Hourglass className="text-neutral-400 h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-500 truncate">Analyzing law firm data</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 mr-3 flex items-center justify-center">
                  <Hourglass className="text-neutral-400 h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-500 truncate">Generating report</p>
                </div>
              </div>
            </div>
            
            <Button variant="ghost" className="mt-6 text-destructive hover:text-destructive/80 font-medium">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>
                Cancel Analysis
              </span>
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Results Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-neutral-200 py-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Analysis Results</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={selectedFirms.size === 0}
                onClick={handleFindEmails}
              >
                <Mail className="mr-1.5 h-4 w-4" />
                Find Emails ({selectedFirms.size})
              </Button>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="mr-1.5 h-4 w-4" />
                Filter
              </Button>
              <Button variant="default" size="sm" className="h-9 bg-secondary hover:bg-secondary-dark" onClick={handleExport}>
                <Download className="mr-1.5 h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={handleGenerateReport}>
                <Download className="mr-1.5 h-4 w-4" />
                Detailed Report
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead className="w-10 text-center">
                  <Checkbox 
                    checked={areAllSelected} 
                    onCheckedChange={handleSelectAll}
                    disabled={searchInProgress || results.length === 0}
                    className="w-4 h-4"
                  />
                </TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Firm Name</TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Size</TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Practice Areas</TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Location</TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length > 0 ? (
                paginatedResults.map((firm, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center">
                      {firm.isLawFirm && (
                        <Checkbox 
                          checked={firm.id !== undefined && selectedFirms.has(firm.id)} 
                          onCheckedChange={(checked) => firm.id && handleSelectFirm(firm.id, !!checked)}
                          className="w-4 h-4"
                        />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{firm.name}</div>
                        <div className="text-sm text-neutral-500">{firm.website}</div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm text-neutral-900">{firm.size}</div>
                      <div className="text-sm text-neutral-500">{firm.attorneyCount}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {renderPracticeAreaBadges(firm.practiceAreas)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-neutral-900">
                      {firm.location}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      <Button 
                        variant="link" 
                        className="text-primary hover:text-primary-dark"
                        onClick={() => onViewFirm(firm)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !searchInProgress && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-neutral-500">
                      No results found. Try adjusting your search parameters.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
        
        {results.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-neutral-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-neutral-700">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, results.length)}
                    </span>{" "}
                    of <span className="font-medium">{results.length}</span> results
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <label htmlFor="items-per-page" className="text-sm text-neutral-600">
                      Show:
                    </label>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                    >
                      <SelectTrigger className="h-8 w-[80px]">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Email Results Modal */}
      <EmailResultsModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        results={emailResults}
        isLoading={emailLookupLoading}
        onSendWithTool={handleSendWithTool}
      />

      <ComposeEmailModal
        isOpen={composeModalOpen}
        onClose={() => setComposeModalOpen(false)}
        recipients={composeRecipients}
      />
    </section>
  );
}
