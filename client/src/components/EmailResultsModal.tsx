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
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Send, Loader2 } from "lucide-react";
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

export interface SelectedContact {
  email: string;
  firmName: string;
  domain: string;
}

interface EmailResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: EmailResult[];
  isLoading: boolean;
  onSendWithTool?: (contacts: SelectedContact[]) => void;
}

export default function EmailResultsModal({
  isOpen,
  onClose,
  results,
  isLoading,
  onSendWithTool,
}: EmailResultsModalProps) {
  const [sortField, setSortField] = useState<'domain' | 'confidence'>('domain');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const totalEmails = results.reduce((total, result) => total + result.emails.length, 0);

  const flattenedEmails = results.flatMap(result =>
    result.emails.map(email => ({
      domain: result.domain,
      organization: result.organization,
      ...email
    }))
  );

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

  // Default all emails to selected when results load
  const allEmailAddresses = new Set(flattenedEmails.map(e => e.email));
  const effectiveSelected = selectedEmails.size === 0 && flattenedEmails.length > 0
    ? allEmailAddresses
    : selectedEmails;

  const handleSort = (field: 'domain' | 'confidence') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleEmail = (email: string) => {
    const next = new Set(effectiveSelected);
    if (next.has(email)) {
      next.delete(email);
    } else {
      next.add(email);
    }
    setSelectedEmails(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(flattenedEmails.map(e => e.email)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  const allSelected = flattenedEmails.length > 0 &&
    flattenedEmails.every(e => effectiveSelected.has(e.email));

  const selectedCount = effectiveSelected.size;

  const handleExport = async () => {
    const toExport = flattenedEmails.filter(e => effectiveSelected.has(e.email));
    if (toExport.length === 0) return;

    const XLSX = await import('xlsx');
    const headers = ["Domain", "Organization", "Email", "First Name", "Last Name", "Position", "Confidence"];
    const rows = toExport.map(email => [
      email.domain,
      email.organization || "N/A",
      email.email,
      email.firstName || "N/A",
      email.lastName || "N/A",
      email.position || "N/A",
      email.confidence
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Email Contacts");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "firm_email_contacts.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendWithTool = () => {
    const contacts: SelectedContact[] = flattenedEmails
      .filter(e => effectiveSelected.has(e.email))
      .map(e => ({
        email: e.email,
        firmName: e.organization || e.domain,
        domain: e.domain,
      }));
    onSendWithTool?.(contacts);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800";
    if (confidence >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Email Addresses Found</DialogTitle>
          <DialogDescription>
            {isLoading ? (
              "Searching for email addresses..."
            ) : (
              `Found ${totalEmails} email address${totalEmails !== 1 ? "es" : ""} across ${results.length} domain${results.length !== 1 ? "s" : ""}`
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-neutral-600">Searching for email addresses...</p>
            <p className="text-sm text-neutral-500 mt-2">This may take a moment</p>
          </div>
        ) : totalEmails === 0 ? (
          <div className="py-8 text-center">
            <p className="text-neutral-600">No email addresses were found for the selected domains.</p>
            <p className="text-sm text-neutral-500 mt-1">Try selecting different domains.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-50">
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                    </TableHead>
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
                    <TableRow key={index} className={effectiveSelected.has(email.email) ? "" : "opacity-40"}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={effectiveSelected.has(email.email)}
                          onCheckedChange={() => handleToggleEmail(email.email)}
                          className="w-4 h-4"
                        />
                      </TableCell>
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
                        <Badge variant="outline" className={getConfidenceBadge(email.confidence)}>
                          {email.confidence}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" className="mr-auto" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={selectedCount === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedCount})
              </Button>
              {onSendWithTool && (
                <Button
                  onClick={handleSendWithTool}
                  disabled={selectedCount === 0}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send with Tool ({selectedCount})
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
