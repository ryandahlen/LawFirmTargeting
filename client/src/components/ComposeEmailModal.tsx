import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { FirmData } from "@shared/schema";

interface Recipient {
  email: string;
  firmName: string;
  location: string;
  practiceArea: string;
  included: boolean;
}

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Array<Pick<FirmData, "name" | "emailAddress" | "location" | "practiceAreas">>;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{firmName\}\}/g, vars.firmName)
    .replace(/\{\{location\}\}/g, vars.location)
    .replace(/\{\{practiceArea\}\}/g, vars.practiceArea);
}

export default function ComposeEmailModal({ isOpen, onClose, recipients: rawRecipients }: ComposeEmailModalProps) {
  const fromEmail = (window as any).__FROM_EMAIL__ || "ryan@topicalgravity.com";
  const fromName = "Ryan Dahlen";

  const [recipients, setRecipients] = useState<Recipient[]>(() =>
    rawRecipients
      .filter((r) => r.emailAddress)
      .map((r) => ({
        email: r.emailAddress!,
        firmName: r.name,
        location: r.location,
        practiceArea: r.practiceAreas[0] ?? "",
        included: true,
      }))
  );

  const [subject, setSubject] = useState("Quick question for {{firmName}}");
  const [body, setBody] = useState(
    `<p>Hi {{firmName}},</p>\n\n<p>I came across your firm and wanted to reach out about...</p>\n\n<p>Best,<br/>Ryan</p>`
  );
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const includedRecipients = recipients.filter((r) => r.included);
  const currentPreview = includedRecipients[previewIndex] ?? includedRecipients[0];

  const insertVariable = (variable: string, target: "subject" | "body") => {
    const token = `{{${variable}}}`;
    if (target === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const newVal = subject.slice(0, start) + token + subject.slice(end);
      setSubject(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else if (target === "body" && bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const newVal = body.slice(0, start) + token + body.slice(end);
      setBody(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    }
  };

  const handleSend = async () => {
    if (includedRecipients.length === 0) return;
    setSending(true);
    setSendResults(null);

    try {
      const response = await fetch("/api/send-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: includedRecipients.map((r) => ({
            email: r.email,
            firmName: r.firmName,
            location: r.location,
            practiceArea: r.practiceArea,
          })),
          subjectTemplate: subject,
          bodyTemplate: body,
          fromName,
          fromEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Send failed");
      setSendResults(data.results);
    } catch (err) {
      setSendResults(
        includedRecipients.map((r) => ({
          email: r.email,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }))
      );
    } finally {
      setSending(false);
    }
  };

  const previewVars = currentPreview
    ? { firmName: currentPreview.firmName, location: currentPreview.location, practiceArea: currentPreview.practiceArea }
    : { firmName: "", location: "", practiceArea: "" };

  const VarButtons = ({ target }: { target: "subject" | "body" }) => (
    <div className="flex gap-1 flex-wrap mt-1">
      {["firmName", "location", "practiceArea"].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => insertVariable(v, target)}
          className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-mono"
        >
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — Compose */}
          <div className="w-1/2 flex flex-col overflow-y-auto border-r px-6 py-4 gap-4">
            <div>
              <Label className="text-xs text-neutral-500 mb-1 block">From</Label>
              <div className="text-sm text-neutral-700 bg-neutral-50 border rounded px-3 py-2">
                {fromName} &lt;{fromEmail}&gt;
              </div>
            </div>

            <div>
              <Label className="text-xs text-neutral-500 mb-1 block">
                Recipients ({includedRecipients.length} selected)
              </Label>
              <div className="border rounded divide-y max-h-36 overflow-y-auto text-sm">
                {recipients.map((r, i) => (
                  <label key={i} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-neutral-50">
                    <Checkbox
                      checked={r.included}
                      onCheckedChange={(checked) => {
                        setRecipients((prev) =>
                          prev.map((rec, idx) => idx === i ? { ...rec, included: !!checked } : rec)
                        );
                        setPreviewIndex(0);
                      }}
                    />
                    <span className="truncate flex-1">{r.firmName}</span>
                    <span className="text-neutral-400 text-xs truncate max-w-[140px]">{r.email}</span>
                  </label>
                ))}
                {recipients.length === 0 && (
                  <p className="text-neutral-400 text-xs px-3 py-2">No recipients with email addresses</p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs text-neutral-500 mb-1 block">Subject</Label>
              <Input
                ref={subjectRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line"
              />
              <VarButtons target="subject" />
            </div>

            <div className="flex-1 flex flex-col">
              <Label className="text-xs text-neutral-500 mb-1 block">Body (HTML supported)</Label>
              <Textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 font-mono text-sm resize-none min-h-[160px]"
                placeholder="Email body..."
              />
              <VarButtons target="body" />
            </div>
          </div>

          {/* Right panel — Preview */}
          <div className="w-1/2 flex flex-col overflow-hidden px-6 py-4 bg-neutral-50">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs text-neutral-500">Preview</Label>
              {includedRecipients.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <button
                    onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                    disabled={previewIndex === 0}
                    className="disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>{previewIndex + 1} / {includedRecipients.length}</span>
                  <button
                    onClick={() => setPreviewIndex((i) => Math.min(includedRecipients.length - 1, i + 1))}
                    disabled={previewIndex === includedRecipients.length - 1}
                    className="disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {currentPreview ? (
              <div className="flex-1 overflow-y-auto bg-white border rounded p-4 text-sm">
                <div className="mb-3 pb-3 border-b space-y-1 text-neutral-500 text-xs">
                  <div><span className="font-medium text-neutral-700">To:</span> {currentPreview.email}</div>
                  <div><span className="font-medium text-neutral-700">Subject:</span> {interpolate(subject, previewVars)}</div>
                </div>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: interpolate(body, previewVars) }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
                No recipients selected
              </div>
            )}

            {/* Send results */}
            {sendResults && (
              <div className="mt-3 border rounded bg-white divide-y max-h-40 overflow-y-auto text-sm">
                {sendResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1 text-xs">{r.email}</span>
                    {r.error && <span className="text-red-400 text-xs truncate max-w-[140px]">{r.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || includedRecipients.length === 0 || !!sendResults}
          >
            {sending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : sendResults ? (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Sent
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Send to {includedRecipients.length} recipient{includedRecipients.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
