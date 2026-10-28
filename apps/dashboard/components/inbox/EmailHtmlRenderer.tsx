"use client";

import React, { useState, useRef, useEffect } from "react";
import { Code, Eye } from "@phosphor-icons/react";

interface EmailHtmlRendererProps {
  html?: string | null;
  text?: string | null;
}

export function EmailHtmlRenderer({ html, text }: EmailHtmlRendererProps) {
  const [viewMode, setViewMode] = useState<"html" | "text">(html ? "html" : "text");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(300);

  // Auto-resize iframe based on its content height so double scrollbars are completely avoided
  useEffect(() => {
    if (viewMode !== "html" || !html) return;

    const updateHeight = () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      try {
        const doc = iframe.contentWindow.document;
        if (doc && doc.documentElement) {
          const scrollHeight = Math.max(
            doc.body?.scrollHeight || 0,
            doc.documentElement.scrollHeight || 0,
            doc.body?.offsetHeight || 0,
            doc.documentElement.offsetHeight || 0
          );
          if (scrollHeight > 50) {
            setIframeHeight(scrollHeight + 24);
          }
        }
      } catch {
        // Cross-origin restriction fallback
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", updateHeight);
    }

    // Set interval check for lazy loaded images
    const timer = setTimeout(updateHeight, 300);
    const intervalTimer = setInterval(updateHeight, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalTimer);
      if (iframe) {
        iframe.removeEventListener("load", updateHeight);
      }
    };
  }, [html, viewMode]);

  const sanitizedSrcDoc = React.useMemo(() => {
    if (!html) return "";
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank" rel="noopener noreferrer" />
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #111827;
      background-color: #ffffff;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
    }
    a {
      color: #0066FF;
      text-decoration: underline;
    }
    pre, code {
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      white-space: pre-wrap;
    }
    table {
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }, [html]);

  const hasHtml = Boolean(html?.trim());
  const hasText = Boolean(text?.trim());

  if (!hasHtml && !hasText) {
    return (
      <div className="p-8 text-center text-xs text-kumo-subtle italic">
        (This message has no body content)
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Toggle Switch Bar (if both HTML and text exist) */}
      {hasHtml && hasText && (
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center bg-kumo-control border border-kumo-line rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("html")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === "html"
                  ? "bg-kumo-elevated text-kumo-strong shadow-2xs font-semibold"
                  : "text-kumo-subtle hover:text-kumo-strong"
              }`}
            >
              <Eye size={13} />
              <span>Rich HTML</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("text")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === "text"
                  ? "bg-kumo-elevated text-kumo-strong shadow-2xs font-semibold"
                  : "text-kumo-subtle hover:text-kumo-strong"
              }`}
            >
              <Code size={13} />
              <span>Plain Text</span>
            </button>
          </div>
        </div>
      )}

      {/* Viewport */}
      {viewMode === "html" && hasHtml ? (
        <div className="rounded-xl overflow-hidden border border-kumo-hairline bg-white shadow-2xs transition-all">
          <iframe
            ref={iframeRef}
            srcDoc={sanitizedSrcDoc}
            sandbox="allow-same-origin allow-popups"
            title="Email Content"
            style={{ height: `${iframeHeight}px` }}
            className="w-full border-0 block bg-white"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-kumo-hairline bg-kumo-base p-6 font-sans text-sm text-kumo-default leading-relaxed whitespace-pre-wrap select-text break-words shadow-2xs">
          {text || html}
        </div>
      )}
    </div>
  );
}
