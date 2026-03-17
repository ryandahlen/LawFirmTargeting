import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Email {
  email: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  confidence: number;
}

interface EmailResult {
  domain: string;
  organization: string | null;
  emails: Email[];
  error?: string;
}

interface EmailResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: EmailResult[];
  isLoading: boolean;
}

export default function EmailResultsModal({
  isOpen,
  onClose,
  results,
  isLoading
}: EmailResultsModalProps) {
  const [sortField, setSortField] = useState<'domain' | 'confidence'>('domain');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Count total emails found
  const totalEmails = results.reduce((total, result) => total + result.emails.length, 0);
  
  // Combine all emails into a flat list for sorting and display
  const flattenedEmails = results.flatMap(result => 
    result.emails.map(email => ({
      domain: result.domain,
      organization: result.organization,
      ...email
    }))
  );
  
  // Sort the emails based on current sort settings
  const sortedEmails = [...flattenedEmails].sort((a, b) => {
    if (sortField === 'domain') {
      return sortDirection === 'asc' 
        ? a.domain.localeCompare(b.domain)
        : b.domain.localeCompare(a.domain);
    } else {
      return sortDirection === 'asc'
        ? a.confidence - b.confidence
        : b.confidence - a.confidence;
    }
  });

  // Handle sort click
  const handleSort = (field: 'domain' | 'confidence') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle export to Excel
  const handleExport = async () => {
    if (flattenedEmails.length === 0) return;
    
    // Import xlsx dynamically
    const XLSX = await import('xlsx');
    
    // Prepare data for Excel
    const headers = ["Domain", "Organization", "Email", "First Name", "Last Name", "Position", "Confidence"];
    const rows = flattenedEmails.map(email => [
      email.domain,
      email.organization || "N/A",
      email.email,
      email.firstName || "N/A",
      email.lastName || "N/A",
      email.position || "N/A",
      email.confidence
    ]);
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Email Contacts");
    
    // Generate XLSX file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create Blob and download
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "firm_email_contacts.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate confidence badge color based on confidence score
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800";
    if (confidence >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Email Addresses Found</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            {isLoading ? (
              "Searching for email addresses..."
            ) : (
              `Found ${totalEmails} email addresses across ${results.length} domains`
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-neutral-600">Searching for email addresses using Hunter.io...</p>
            <p className="text-sm text-neutral-500 mt-2">This may take a moment</p>
          </div>
        ) : totalEmails === 0 ? (
          <div className="py-8 text-center">
            <p className="text-neutral-600">No email addresses were found for the selected domains.</p>
            <p className="text-sm text-neutral-500 mt-1">Try selecting different domains or checking Hunter.io directly.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                    <TableHead 
                      className="text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('domain')}
                    >
                      Domain {sortField === 'domain' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Organization
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Email
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Position
                    </TableHead>
                    <TableHead 
                      className="text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('confidence')}
                    >
                      Confidence {sortField === 'confidence' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEmails.map((email, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap text-sm">{email.domain}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{email.organization || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <a href={`mailto:${email.email}`} className="text-primary hover:underline">
                          {email.email}
                        </a>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {[email.firstName, email.lastName].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{email.position || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={`${getConfidenceBadge(email.confidence)}`}>
                          {email.confidence}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button
                variant="outline"
                className="mr-auto"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                variant="default"
                className="bg-secondary hover:bg-secondary-dark"
                onClick={handleExport}
                disabled={flattenedEmails.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}