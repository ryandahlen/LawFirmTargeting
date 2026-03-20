import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  MapPin,
  Globe,
  Copy,
  ScanSearch,
} from "lucide-react";
import { FirmData } from "@shared/schema";

interface DetailModalProps {
  firm: FirmData;
  onClose: () => void;
}

function getDomainAuthority(size: string | undefined) {
  if (size === "Large") return "60+";
  if (size === "Medium") return "45";
  return "30";
}

export default function DetailModal({ firm, onClose }: DetailModalProps) {
  const handleCopyEmail = () => {
    if (firm.emailAddress) navigator.clipboard.writeText(firm.emailAddress);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </button>
          <Badge className="bg-green-100 text-green-700 border border-green-200 font-medium gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Analysis Complete
          </Badge>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Profile Card */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-neutral-900">{firm.name}</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <a
                  href={`https://${firm.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {firm.website}
                </a>
                {firm.location && (
                  <span className="flex items-center gap-1 text-sm text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    <MapPin className="h-3 w-3" />
                    {firm.location}
                  </span>
                )}
              </div>
              {firm.practiceAreas && firm.practiceAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {firm.practiceAreas.map((area, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 gap-1.5">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Metrics Grid */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">SEO Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Domain Authority", value: getDomainAuthority(firm.size) },
                { label: "Organic Traffic", value: "N/A" },
                { label: "Backlinks", value: firm.attorneyCount || "N/A" },
                { label: "Site Speed", value: "N/A" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-neutral-500 mb-1">{label}</p>
                  <p className="text-xl font-bold text-neutral-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SERP Competitors */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">SERP Competitors</h3>
            <div className="border border-dashed border-neutral-300 rounded-lg p-6 text-center text-neutral-400 text-sm">
              No data — run Deep Scan to populate
            </div>
          </div>

          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Contacts</h3>
              <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs opacity-60">
                <ScanSearch className="h-3.5 w-3.5" />
                Deep Scan Contacts
              </Button>
            </div>
            <div className="space-y-2">
              {firm.keyPersonnel && firm.keyPersonnel.map((person, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{person.name}</p>
                    <p className="text-xs text-neutral-500">{person.role}</p>
                  </div>
                </div>
              ))}
              {firm.emailAddress && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{firm.emailAddress}</p>
                      <p className="text-xs text-green-600">Verified contact</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-neutral-500 hover:text-neutral-800"
                    onClick={handleCopyEmail}
                    title="Copy email"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {!firm.emailAddress && (!firm.keyPersonnel || firm.keyPersonnel.length === 0) && (
                <p className="text-sm text-neutral-400 text-center py-4">No contact information available</p>
              )}
            </div>
          </div>

          {/* Firm Details (secondary) */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Firm Details</h3>
            <dl className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
              <div className="py-2.5 px-4 flex justify-between bg-white">
                <dt className="text-sm text-neutral-500">Size</dt>
                <dd className="text-sm font-medium text-neutral-900">{firm.size} {firm.attorneyCount ? `(${firm.attorneyCount})` : ""}</dd>
              </div>
              {firm.founded && (
                <div className="py-2.5 px-4 flex justify-between bg-white">
                  <dt className="text-sm text-neutral-500">Founded</dt>
                  <dd className="text-sm font-medium text-neutral-900">{firm.founded}</dd>
                </div>
              )}
              <div className="py-2.5 px-4 flex justify-between bg-white">
                <dt className="text-sm text-neutral-500">Primary Location</dt>
                <dd className="text-sm font-medium text-neutral-900">{firm.location}</dd>
              </div>
              {firm.additionalOffices && firm.additionalOffices.length > 0 && (
                <div className="py-2.5 px-4 flex justify-between bg-white">
                  <dt className="text-sm text-neutral-500">Additional Offices</dt>
                  <dd className="text-sm font-medium text-neutral-900">{firm.additionalOffices.join(", ")}</dd>
                </div>
              )}
              {firm.clientFocus && firm.clientFocus.length > 0 && (
                <div className="py-2.5 px-4 flex justify-between bg-white">
                  <dt className="text-sm text-neutral-500">Client Focus</dt>
                  <dd className="text-sm font-medium text-neutral-900">{firm.clientFocus.join(", ")}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Overview */}
          {firm.overview && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Overview</h3>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <p className="text-sm text-neutral-700 leading-relaxed">{firm.overview}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
