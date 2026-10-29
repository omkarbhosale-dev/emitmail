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
  const [iframeHeight, setIframeHeight] = useState<number>(60);

  // Auto-resize iframe based on its content height so double scrollbars are completely avoided and content fits tightly
  useEffect(() => {
    if (viewMode !== "html" || !html) return;

    let ro: ResizeObserver | null = null;

    const updateHeight = () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      try {
        const doc = iframe.contentWindow.document;
        if (!doc) return;

        const wrapper = doc.getElementById("email-body-wrapper");
        if (wrapper) {
          const rectHeight = Math.ceil(wrapper.getBoundingClientRect().height);
          if (rectHeight > 0) {
            setIframeHeight((prev) => (Math.abs(prev - rectHeight) > 2 ? rectHeight : prev));
          }

          if (!ro && typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(() => {
              const newHeight = Math.ceil(wrapper.getBoundingClientRect().height);
              if (newHeight > 0) {
                setIframeHeight((prev) => (Math.abs(prev - newHeight) > 2 ? newHeight : prev));
              }
            });
            ro.observe(wrapper);
          }
        } else if (doc.body) {
          const bodyHeight = Math.ceil(doc.body.getBoundingClientRect().height);
          if (bodyHeight > 0) {
            setIframeHeight((prev) => (Math.abs(prev - bodyHeight) > 2 ? bodyHeight : prev));
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

    const timer = setTimeout(updateHeight, 150);

    return () => {
      clearTimeout(timer);
      if (ro) {
        ro.disconnect();
      }
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
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #111827;
      height: auto !important;
      min-height: 0 !important;
      overflow: hidden;
    }
    #email-body-wrapper {
      padding: 16px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: break-word;
      display: flow-root;
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
  <div id="email-body-wrapper">
    ${html}
  </div>
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
