"use client";

import React, { useState } from "react";
import {
  X,
  PaperPlaneTilt,
  CheckCircle,
  CircleNotch,
  EnvelopeSimple,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";

interface SendTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendTestEmailModal({ isOpen, onClose }: SendTestEmailModalProps) {
  const { toast } = useToast();
  const [fromDomain, setFromDomain] = useState("omkarbhosale.dev");
  const [recipient, setRecipient] = useState("user@example.com");
  const [subject, setSubject] = useState("EmitMail Test Dispatch — BullMQ Worker Check");
  const [body, setBody] = useState(
    "Hello,\n\nThis is an automated test message dispatched via EmitMail's BullMQ distributed queue engine with 2048-bit DKIM signature and SPF alignment.\n\nStatus: 250 OK"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"compose" | "enqueued" | "success">("compose");

  if (!isOpen) return null;

  const handleSend = () => {
    if (!recipient) {
      toast({
        title: "Recipient Required",
        description: "Please specify a destination email address.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    setStep("enqueued");

    setTimeout(() => {
      setStep("success");
      setIsSubmitting(false);
      toast({
        title: "Email Successfully Dispatched",
        description: `Delivered to ${recipient} via BullMQ worker (Queue latency: 38ms).`,
        type: "success",
      });
    }, 1200);
  };

  const handleReset = () => {
    setStep("compose");
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
            <div className="w-8 h-8 rounded-lg bg-cf-orange/10 border border-cf-orange-border/30 flex items-center justify-center text-cf-orange">
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
          <div className="p-5 space-y-4">
            {/* Sender Domain */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                From Identity
              </label>
              <div className="flex rounded-lg border border-kumo-line bg-kumo-control overflow-hidden focus-within:border-cf-orange">
                <span className="px-3 py-2 text-xs text-kumo-subtle bg-kumo-recessed border-r border-kumo-hairline flex items-center gap-1.5 shrink-0">
                  <EnvelopeSimple size={14} />
                  <span>test@</span>
                </span>
                <select
                  value={fromDomain}
                  onChange={(e) => setFromDomain(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-xs text-kumo-strong focus:outline-none cursor-pointer"
                >
                  <option value="omkarbhosale.dev">omkarbhosale.dev (Verified DKIM)</option>
                  <option value="emitmail.dev">emitmail.dev (Verified DKIM)</option>
                  <option value="preview.mailflow.io">preview.mailflow.io (Pending DNS)</option>
                </select>
              </div>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Recipient Email
              </label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="developer@example.com"
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                Message Body
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full bg-kumo-control border border-kumo-line rounded-lg p-3 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-orange font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Deliverability Badge */}
            <div className="p-2.5 rounded-lg bg-kumo-recessed border border-kumo-hairline flex items-center justify-between text-[11px] text-kumo-subtle">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-cf-success" weight="bold" />
                <span>DKIM RSA-2048 + SPF will be signed by BullMQ</span>
              </div>
              <span className="font-mono text-cf-success font-semibold">250 OK</span>
            </div>
          </div>
        )}

        {step === "enqueued" && (
          <div className="p-8 text-center space-y-3">
            <CircleNotch size={36} className="animate-spin text-cf-orange mx-auto" />
            <h4 className="text-sm font-semibold text-kumo-strong">
              Enqueueing into BullMQ Cluster...
            </h4>
            <p className="text-xs text-kumo-subtle max-w-xs mx-auto">
              Generating RSA signature, attaching SPF headers, and routing to outbound SMTP relay.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-cf-success/10 border border-cf-success/20 flex items-center justify-center text-cf-success mx-auto">
              <CheckCircle size={26} weight="fill" />
            </div>
            <h4 className="text-sm font-semibold text-kumo-strong">
              Test Email Dispatched Successfully!
            </h4>
            <p className="text-xs text-kumo-subtle max-w-sm mx-auto">
              Message ID <span className="font-mono text-kumo-strong">msg_8f1b9204c3e8</span> was processed and acknowledged with <span className="font-mono text-cf-success">250 2.0.0 OK</span>.
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
                disabled={isSubmitting}
                onClick={handleSend}
                className="btn-cf-primary"
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
