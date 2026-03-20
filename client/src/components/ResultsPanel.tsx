import { useState, useEffect, useRef } from "react";
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
  ExternalLink,
  Check,
  Loader2,
  Circle,
  Mail,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { FirmData } from "@shared/schema";
import EmailResultsModal from "./EmailResultsModal";

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

const LOG_TEMPLATES = [
  "[FETCH] Retrieving SERP page {n}...",
  "[PARSE] Extracted {n} results from page",
  "[MATCH] Business classified as target",
  "[SKIP] Non-matching result filtered out",
  "[FETCH] Loading business website...",
  "[PARSE] Scanning contact information",
  "[MATCH] Email pattern detected",
  "[SKIP] Duplicate domain ignored",
];

function getPipelineStage(progress: number) {
  if (progress < 5) return 0;
  if (progress < 60) return 1;
  if (progress < 85) return 2;
  return 3;
}

const PIPELINE_STAGES = [
  "Initialize Scraper",
  "Extracting SERPs",
  "Classify Businesses",
  "Extract Contacts",
];

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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [startTime] = useState(() => new Date());
  const logRef = useRef<HTMLDivElement>(null);

  // Simulate live log feed during analysis
  useEffect(() => {
    if (!searchInProgress) {
      setLogLines([]);
      return;
    }
    const interval = setInterval(() => {
      const template = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      const line = template.replace("{n}", String(Math.floor(Math.random() * 50) + 1));
      setLogLines(prev => {
        const next = [...prev, line];
        return next.slice(-12); // keep last 12 lines
      });
    }, 600);
    return () => clearInterval(interval);
  }, [searchInProgress]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedFirms);
      paginatedResults.forEach(firm => {
        if (firm.id !== undefined && firm.isLawFirm) newSelected.add(firm.id);
      });
      setSelectedFirms(newSelected);
    } else {
      const newSelected = new Set(selectedFirms);
      paginatedResults.forEach(firm => {
        if (firm.id !== undefined) newSelected.delete(firm.id);
      });
      setSelectedFirms(newSelected);
    }
  };

  const handleSelectFirm = (firmId: number | undefined, checked: boolean) => {
    if (firmId === undefined) return;
    const newSelected = new Set(selectedFirms);
    if (checked) newSelected.add(firmId);
    else newSelected.delete(firmId);
    setSelectedFirms(newSelected);
  };

  const areAllSelected = paginatedResults.length > 0 &&
    paginatedResults.every(firm =>
      firm.id !== undefined && (!firm.isLawFirm || selectedFirms.has(firm.id))
    );

  const getSelectedDomains = () =>
    results
      .filter(firm => firm.id !== undefined && selectedFirms.has(firm.id))
      .map(firm => firm.website);

  const handleFindEmails = async () => {
    const domains = getSelectedDomains();
    if (domains.length === 0) return;
    setEmailLookupLoading(true);
    setEmailModalOpen(true);
    try {
      const response = await fetch('/api/find-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains })
      });
      if (!response.ok) throw new Error('Failed to fetch emails');
      const data = await response.json();
      setEmailResults(data.results);
    } catch (error) {
      console.error('Error finding emails:', error);
      setEmailResults([]);
    } finally {
      setEmailLookupLoading(false);
    }
  };

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const headers = ["Business Name", "Website", "Email", "Size", "Industries", "Location"];
    const rows = results.map(firm => [
      firm.name,
      firm.website,
      firm.emailAddress || "N/A",
      firm.size,
      firm.practiceAreas.join(", "),
      firm.location
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Businesses");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "serpscout_analysis.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derived progress metrics
  const totalAnalyzedSim = Math.round(progress * 0.12);
  const targetSim = Math.round(totalAnalyzedSim * 0.6);
  const excludedSim = totalAnalyzedSim - targetSim;
  const elapsedSec = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const estRemaining = progress > 5
    ? Math.max(0, Math.round((elapsedSec / (progress / 100)) - elapsedSec))
    : null;

  const activeStage = getPipelineStage(progress);

  const getStageIcon = (stageIdx: number) => {
    if (stageIdx < activeStage) return <Check className="h-4 w-4 text-green-500" />;
    if (stageIdx === activeStage) return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    return <Circle className="h-4 w-4 text-neutral-300" />;
  };

  return (
    <section className="space-y-6">
      {/* Active Analysis Panel */}
      {searchInProgress && (
        <Card className="border-primary/30">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">Lead Generation</p>
                <h3 className="text-lg font-bold">Analysis in Progress</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80">
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-neutral-500">Overall Progress</span>
                <span className="text-xs font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Pipeline stages */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage} className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${i === activeStage ? "border-primary/40 bg-primary/5" : i < activeStage ? "border-green-200 bg-green-50" : "border-neutral-200 bg-neutral-50"}`}>
                  {getStageIcon(i)}
                  <span className={`text-xs font-medium ${i < activeStage ? "text-green-700" : i === activeStage ? "text-primary" : "text-neutral-400"}`}>{stage}</span>
                </div>
              ))}
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                <p className="text-xs text-neutral-500 mb-1">Total Analyzed</p>
                <p className="text-xl font-bold">{totalAnalyzedSim}</p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                <p className="text-xs text-neutral-500 mb-1">Target Businesses</p>
                <p className="text-xl font-bold text-green-600">{targetSim}</p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                <p className="text-xs text-neutral-500 mb-1">Excluded</p>
                <p className="text-xl font-bold text-neutral-400">{excludedSim}</p>
              </div>
            </div>

            {/* Live log feed */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Live Feed</p>
              <div
                ref={logRef}
                className="bg-neutral-950 text-green-400 font-mono text-xs rounded-lg p-3 h-28 overflow-y-auto space-y-0.5"
              >
                {logLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {logLines.length === 0 && <div className="text-neutral-600">Initializing...</div>}
              </div>
            </div>

            {estRemaining !== null && (
              <p className="text-xs text-neutral-500">
                Estimated time remaining: <span className="font-medium">{estRemaining}s</span>
              </p>
            )}
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
              <Button variant="default" size="sm" className="h-9" onClick={handleExport}>
                <Download className="mr-1.5 h-4 w-4" />
                Export CSV
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
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Business Name</TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Website</TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Phone</TableHead>
                <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Emails Found</TableHead>
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
                        <div className="text-xs text-neutral-400">{firm.website}</div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <a
                        href={`https://${firm.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {firm.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-neutral-400">
                      —
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant={firm.emailAddress ? "default" : "secondary"}
                        className={firm.emailAddress ? "bg-green-100 text-green-800 border-green-200" : ""}
                      >
                        {firm.emailAddress ? "1" : "0"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="link"
                        className="text-primary hover:text-primary/80 p-0"
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
                    <TableCell colSpan={6} className="text-center py-10 text-neutral-500">
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
                        setCurrentPage(1);
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

      <EmailResultsModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        results={emailResults}
        isLoading={emailLookupLoading}
      />
    </section>
  );
}
