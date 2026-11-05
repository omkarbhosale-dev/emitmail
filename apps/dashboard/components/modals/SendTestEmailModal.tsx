"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  PaperPlaneTilt,
  CheckCircle,
  CircleNotch,
  EnvelopeSimple,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";
import { ApiDomain } from "@/types";

interface SendTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendTestEmailModal({ isOpen, onClose }: SendTestEmailModalProps) {
  const { toast } = useToast();
  const { isViewer } = useAuth();
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [fromDomain, setFromDomain] = useState("");
  const [fromPrefix, setFromPrefix] = useState("test");
  const [recipient, setRecipient] = useState("user@example.com");
  const [subject, setSubject] = useState("EmitMail Test Dispatch — BullMQ Worker Check");
  const [body, setBody] = useState(
    "Hello,\n\nThis is an automated test message dispatched via EmitMail's BullMQ distributed queue engine with 2048-bit DKIM signature and SPF alignment.\n\nStatus: 250 OK"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"compose" | "enqueued" | "success">("compose");
  const [dispatchedInfo, setDispatchedInfo] = useState<{ id: string; messageId?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch domains for from identity
    api.domains.list()
      .then((items) => {
        setDomains(items);
        if (items.length > 0) {
          // Prefer verified domain if available
          const verified = items.find((d) => d.status === "VERIFIED");
          setFromDomain(verified ? verified.domainName : items[0].domainName);
        } else {
          setFromDomain("");
        }
      })
      .catch((err) => {
        console.error("Failed to load domains in SendTestEmailModal:", err);
        setFromDomain("");
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (isViewer) {
      toast({
        title: "Action Not Permitted",
        description: "View-only members are not permitted to dispatch emails.",
        type: "error",
      });
      return;
    }

    if (!fromDomain) {
      toast({
        title: "No Sending Domain",
        description: "Please configure and verify a sending domain before dispatching test emails.",
        type: "error",
      });
      return;
    }

    if (!recipient.trim()) {
      toast({
        title: "Recipient Required",
        description: "Please specify a destination email address.",
        type: "error",
      });
      return;
    }

    if (!fromDomain.trim()) {
      toast({
        title: "Sender Domain Required",
        description: "Please select or enter a sender domain.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    setStep("enqueued");

    const senderEmail = `${fromPrefix.trim() || "test"}@${fromDomain.trim()}`;

    try {
      const result = await api.emails.send({
        from: senderEmail,
        to: recipient.trim(),
        subject: subject.trim(),
        text: body,
        html: body.replace(/\n/g, "<br/>"),
      });

      setDispatchedInfo({
        id: result.id,
        messageId: result.messageId,
      });
      setStep("success");
      setIsSubmitting(false);

      toast({
        title: "Email Successfully Dispatched",
        description: `Dispatched to ${recipient.trim()} via ${senderEmail}`,
        type: "success",
      });

      // Dispatch global event for EmailsView to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("emails-updated"));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setStep("compose");
      toast({
        title: "Failed to Send Email",
        description: err.message || "An error occurred while dispatching email.",
        type: "error",
      });
    }
  };

  const handleReset = () => {
    setStep("compose");
    setDispatchedInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={handleReset}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
              <PaperPlaneTilt size={18} weight="fill" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-kumo-strong">
                Send Test Email
              </h3>
              <p className="text-[11px] text-kumo-subtle">
                Verify deliverability, DKIM signing, and BullMQ worker pipeline
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        {step === "compose" && (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {isViewer && (
              <ViewOnlyBanner message="You have view-only access and cannot dispatch test emails." />
            )}

            {/* Sender Selection */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                From Address
              </label>
              <div className="flex gap-2">
                <div className="relative w-1/3">
                  <input
                    type="text"
                    disabled={isViewer}
                    value={fromPrefix}
                    onChange={(e) => setFromPrefix(e.target.value)}
                    placeholder="prefix"
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-1.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue font-mono disabled:opacity-60"
                  />
                </div>
                <span className="self-center text-kumo-muted font-mono">@</span>
                <div className="relative flex-1">
                  <select
                    disabled={isViewer}
                    value={fromDomain}
                    onChange={(e) => setFromDomain(e.target.value)}
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-1.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue font-mono cursor-pointer disabled:opacity-60"
                  >
                    {domains.map((dom) => (
                      <option key={dom.id} value={dom.domainName}>
                        {dom.domainName} {dom.status === "VERIFIED" ? "✓" : "(Pending)"}
                      </option>
                    ))}
                    {domains.length === 0 && (
                      <option value="" disabled>No domains configured (Add a domain first)</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                To (Recipient Address)
              </label>
              <input
                type="email"
                disabled={isViewer}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-1.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue font-mono disabled:opacity-60"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Subject Line
              </label>
              <input
                type="text"
                disabled={isViewer}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Test Subject"
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-1.5 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue disabled:opacity-60"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Email Body (Plain Text & HTML)
              </label>
              <textarea
                rows={4}
                disabled={isViewer}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg p-3 text-xs text-kumo-strong focus:outline-none focus:border-cf-blue font-mono leading-relaxed disabled:opacity-60"
              />
            </div>
          </div>
        )}

        {/* Processing State */}
        {step === "enqueued" && (
          <div className="py-14 px-6 text-center space-y-3">
            <CircleNotch size={32} className="animate-spin text-cf-blue mx-auto" />
            <h4 className="text-sm font-semibold text-kumo-strong">
              Enqueuing Message into BullMQ
            </h4>
            <p className="text-xs text-kumo-subtle">
              Signing with 2048-bit DKIM private key and initializing SMTP handshake...
            </p>
          </div>
        )}

        {/* Success State */}
        {step === "success" && (
          <div className="py-10 px-6 text-center space-y-3">
            <div className="w-12 h-12 bg-cf-success/10 border border-cf-success/20 text-cf-success rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={26} weight="fill" />
            </div>
            <h4 className="text-sm font-semibold text-kumo-strong">
              Test Email Dispatched Successfully!
            </h4>
            <p className="text-xs text-kumo-subtle max-w-sm mx-auto">
              Message ID <span className="font-mono text-kumo-strong break-all">{dispatchedInfo?.messageId || dispatchedInfo?.id}</span> was processed and enqueued into BullMQ for SMTP delivery.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-end gap-2.5">
          {step === "compose" ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="btn-cf-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || isViewer}
                onClick={handleSend}
                title={isViewer ? "View-only members cannot dispatch emails" : undefined}
                className="btn-cf-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperPlaneTilt size={14} weight="bold" />
                <span>Dispatch Email</span>
              </button>
            </>
          ) : step === "success" ? (
            <button
              type="button"
              onClick={handleReset}
              className="btn-cf-primary"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
