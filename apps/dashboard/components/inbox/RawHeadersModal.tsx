"use client";

import React, { useState } from "react";
import { X, Copy, Check, Code } from "@phosphor-icons/react";
import { useToast } from "@/components/ui/Toast";

interface RawHeadersModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers?: Record<string, any> | null;
  messageId: string;
}

export function RawHeadersModal({
  isOpen,
  onClose,
  headers,
  messageId,
}: RawHeadersModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formattedJson = headers
    ? JSON.stringify(headers, null, 2)
    : "No raw header metadata recorded for this message.";

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    toast({
      title: "Headers Copied",
      description: "Raw RFC headers copied to clipboard.",
      type: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline bg-kumo-elevated">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-kumo-recessed border border-kumo-hairline flex items-center justify-center text-kumo-strong">
              <Code size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-kumo-strong">
                Raw Email Headers
              </h3>
              <span className="text-xs text-kumo-subtle font-mono">
                {messageId}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-kumo-recessed">
          <pre className="font-mono text-xs text-kumo-default leading-relaxed whitespace-pre-wrap break-all select-all">
            {formattedJson}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-kumo-elevated border-t border-kumo-hairline flex items-center justify-between">
          <span className="text-xs text-kumo-subtle">
            Full MIME headers including SPF, DKIM, and ARC trace signatures.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-cf-secondary text-xs flex items-center gap-1.5"
            >
              {copied ? <Check size={13} className="text-cf-success" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy Raw Headers"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-cf-primary text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
