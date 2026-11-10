"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  PaperPlaneTilt,
  CheckCircle,
  CircleNotch,
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

function getTemplate(domain: string) {
  const dom = domain || "yourdomain.com";
  const now = new Date().toISOString();
  return {
    subject: `Confirm your email configuration for ${dom}`,
    fromName: `${dom} Security`,
    body: `Hi there,\n\nThis is a confirmation message from your ${dom} mail server to verify that outbound SMTP, SPF, and 2048-bit DKIM signatures are properly aligned.\n\nConfiguration Details:\n- Sending Domain: ${dom}\n- Authentication: SPF & DKIM Aligned\n- Timestamp: ${now}\n\nNo further action is required. If you received this message in your primary inbox, your domain is ready for production traffic.\n\nBest regards,\n${dom} Infrastructure Team`,
  };
}

export function SendTestEmailModal({ isOpen, onClose }: SendTestEmailModalProps) {
  const { toast } = useToast();
  const { isViewer } = useAuth();
  const [domains, setDomains] = useState<ApiDomain[]>([]);
  const [fromDomain, setFromDomain] = useState("");
  const [fromPrefix, setFromPrefix] = useState("notifications");
  const [fromName, setFromName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"compose" | "enqueued" | "success">("compose");
  const [dispatchedInfo, setDispatchedInfo] = useState<{ id: string; messageId?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    api.domains.list()
      .then((items) => {
        setDomains(items);
        if (items.length > 0) {
          const verified = items.find((d) => d.status === "VERIFIED");
          const selected = verified ? verified.domainName : items[0].domainName;
          setFromDomain(selected);
          const tpl = getTemplate(selected);
          setFromName(tpl.fromName);
          setSubject(tpl.subject);
          setBody(tpl.body);
        } else {
          setFromDomain("");
          const tpl = getTemplate("yourdomain.com");
          setFromName(tpl.fromName);
          setSubject(tpl.subject);
          setBody(tpl.body);
        }
      })
      .catch((err) => {
        console.error("Failed to load domains in SendTestEmailModal:", err);
        setFromDomain("");
      });
  }, [isOpen]);

  const handleDomainSelect = (domain: string) => {
    setFromDomain(domain);
    const tpl = getTemplate(domain);
    setFromName(tpl.fromName);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

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

    setIsSubmitting(true);
    setStep("enqueued");

    const senderAddress = `${fromPrefix.trim() || "notifications"}@${fromDomain.trim()}`;
    const fullFrom = fromName.trim()
      ? `"${fromName.trim()}" <${senderAddress}>`
      : senderAddress;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject.trim()}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #18181b; background-color: #f4f4f5; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 32px;">
    <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f4f4f5;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #09090b;">Email Configuration Notice</h2>
    </div>
    <div style="font-size: 14px; color: #27272a; white-space: pre-wrap;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <div style="margin-top: 32px; pt: 16px; border-top: 1px solid #f4f4f5; font-size: 12px; color: #71717a;">
      Sent via EmitMail Platform &bull; High-deliverability transactional delivery
    </div>
  </div>
</body>
</html>`;

    try {
      const result = await api.emails.send({
        from: fullFrom,
        to: recipient.trim(),
        subject: subject.trim(),
        text: body,
        html: htmlBody,
      });

      setDispatchedInfo({
        id: result.id,
        messageId: result.messageId,
      });
      setStep("success");
      setIsSubmitting(false);

      toast({
        title: "Email Dispatched",
        description: `Delivered to ${recipient.trim()} via ${senderAddress}`,
        type: "success",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("emails-updated"));
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      setStep("compose");
      const msg = err instanceof Error ? err.message : "An error occurred while dispatching email.";
      toast({
        title: "Failed to Send Email",
        description: msg,
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
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={handleReset}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800/80 rounded-lg shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              Send Email
            </h3>
            <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              Transactional
            </span>
          </div>
          <button
            onClick={handleReset}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        {step === "compose" && (
          <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
            {isViewer && (
              <ViewOnlyBanner message="You have view-only access and cannot dispatch test emails." />
            )}

            {/* From Name & From Address */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">
                From
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  disabled={isViewer}
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Sender Name"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 disabled:opacity-60"
                />

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    disabled={isViewer}
                    value={fromPrefix}
                    onChange={(e) => setFromPrefix(e.target.value)}
                    placeholder="notifications"
                    className="w-28 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono disabled:opacity-60"
                  />
                  <span className="text-zinc-500 font-mono text-xs">@</span>
                  <select
                    disabled={isViewer}
                    value={fromDomain}
                    onChange={(e) => handleDomainSelect(e.target.value)}
                    className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono cursor-pointer disabled:opacity-60"
                  >
                    {domains.map((dom) => (
                      <option key={dom.id} value={dom.domainName}>
                        {dom.domainName}
                      </option>
                    ))}
                    {domains.length === 0 && (
                      <option value="" disabled>No domains configured</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                To
              </label>
              <input
                type="email"
                disabled={isViewer}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono disabled:opacity-60"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Subject
              </label>
              <input
                type="text"
                disabled={isViewer}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject Line"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 disabled:opacity-60"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Body
              </label>
              <textarea
                rows={6}
                disabled={isViewer}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono leading-relaxed disabled:opacity-60"
              />
            </div>
          </div>
        )}

        {/* Processing State */}
        {step === "enqueued" && (
          <div className="py-14 px-6 text-center space-y-2">
            <CircleNotch size={28} className="animate-spin text-zinc-400 mx-auto" />
            <h4 className="text-xs font-medium text-zinc-200">
              Enqueuing Message
            </h4>
            <p className="text-2xs text-zinc-500">
              Signing with 2048-bit RSA DKIM key and dispatching via SMTP...
            </p>
          </div>
        )}

        {/* Success State */}
        {step === "success" && (
          <div className="py-10 px-6 text-center space-y-2.5">
            <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={20} weight="fill" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-100">
              Email Dispatched
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto font-mono text-2xs break-all">
              ID: {dispatchedInfo?.messageId || dispatchedInfo?.id}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-zinc-900/50 border-t border-zinc-800/80 flex items-center justify-end gap-2">
          {step === "compose" ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="btn-cf-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || isViewer}
                onClick={handleSend}
                className="btn-cf-primary text-xs"
              >
                <PaperPlaneTilt size={13} weight="bold" />
                <span>Send</span>
              </button>
            </>
          ) : step === "success" ? (
            <button
              type="button"
              onClick={handleReset}
              className="btn-cf-primary text-xs"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
