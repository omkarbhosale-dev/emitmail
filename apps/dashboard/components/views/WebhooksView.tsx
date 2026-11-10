"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Copy,
  Eye,
  EyeSlash,
  Trash,
  ArrowsClockwise,
  Check,
  X,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { WebhookEndpoint, WebhookDeliveryLog } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";

const AVAILABLE_EVENTS = [
  { id: "email.sent", label: "email.sent", desc: "Triggered when message is queued and dispatched" },
  { id: "email.delivered", label: "email.delivered", desc: "Remote mail server acknowledged receipt" },
  { id: "email.bounced", label: "email.bounced", desc: "Remote server rejected delivery" },
  { id: "email.complaint", label: "email.complaint", desc: "Recipient reported message as spam" },
  { id: "inbound.email.received", label: "inbound.received", desc: "Incoming email received and parsed" },
];

export function WebhooksView() {
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "email.delivered",
    "email.bounced",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Testing & Deleting state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [endpointsData, deliveriesData] = await Promise.allSettled([
        api.webhooks.list(),
        api.webhooks.listDeliveries(),
      ]);

      if (endpointsData.status === "fulfilled") {
        setEndpoints(endpointsData.value || []);
      }
      if (deliveriesData.status === "fulfilled") {
        setDeliveries(deliveriesData.value || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load webhooks";
      toast({
        title: "Load Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast({
      title: "Webhooks Synchronized",
      description: "Loaded latest endpoints and deliveries.",
      type: "info",
    });
  };

  const toggleShowSecret = (id: string) => {
    setShowSecret((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copied to Clipboard",
      description: "Signing secret copied.",
      type: "success",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendTestWebhook = async (endpoint: WebhookEndpoint) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to trigger test webhooks.",
        type: "warning",
      });
      return;
    }

    setTestingId(endpoint.id);
    try {
      const result = await api.webhooks.test(endpoint.id);
      if (result.success) {
        toast({
          title: `Webhook Acknowledged (${result.statusCode || 200})`,
          description: `Target responded in ${result.latencyMs}ms.`,
          type: "success",
        });
      } else {
        toast({
          title: `Delivery Failed (${result.statusCode || "Error"})`,
          description: result.lastError || "Target endpoint could not be reached.",
          type: "warning",
        });
      }

      const updatedDeliveries = await api.webhooks.listDeliveries().catch(() => null);
      if (updatedDeliveries) {
        setDeliveries(updatedDeliveries);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test dispatch failed";
      toast({
        title: "Test Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteEndpoint = async (id: string, url: string) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to delete webhook endpoints.",
        type: "warning",
      });
      return;
    }

    if (!window.confirm(`Delete webhook "${url}"? Events will no longer be dispatched to this URL.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.webhooks.delete(id);
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
      toast({
        title: "Webhook Deleted",
        description: `Removed endpoint ${url}`,
        type: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete endpoint";
      toast({
        title: "Delete Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;

    if (!newUrl.trim()) return;
    if (selectedEvents.length === 0) {
      toast({
        title: "Event Selection Required",
        description: "Please select at least one event type.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.webhooks.create({
        url: newUrl.trim(),
        events: selectedEvents,
      });

      setEndpoints((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewUrl("");
      setSelectedEvents(["email.delivered", "email.bounced"]);
      toast({
        title: "Webhook Registered",
        description: `Listening for ${created.events.length} event types.`,
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create webhook";
      toast({
        title: "Registration Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="border-b border-zinc-800/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-zinc-100">
            Webhooks
          </h1>
          <p className="text-sm md:text-[15px] text-zinc-400 mt-1">
            Real-time HTTP POST notifications with HMAC-SHA256 signatures for delivery lifecycle events.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="btn-cf-secondary px-3"
            title="Refresh webhooks"
          >
            <ArrowsClockwise
              size={15}
              className={isRefreshing ? "animate-spin text-zinc-400" : "text-zinc-400"}
            />
          </button>

          {!isViewer && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-cf-primary"
            >
              <Plus size={15} weight="bold" />
              <span>Add Endpoint</span>
            </button>
          )}
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot register or delete webhook endpoints." />
      )}

      {/* 2. Flat Webhooks Table */}
      <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-900/40">
        {isLoading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : endpoints.length === 0 ? (
          <div className="py-14 text-center">
            <div className="max-w-sm mx-auto px-4 flex flex-col items-center">
              <div className="w-8 h-8 rounded-md bg-zinc-900 text-zinc-500 flex items-center justify-center mb-2.5 border border-zinc-800">
                <PaperPlaneTilt size={16} />
              </div>
              <div className="text-xs font-medium text-zinc-200">
                No webhook endpoints configured
              </div>
              <p className="text-2xs text-zinc-500 mt-0.5 max-w-64 leading-relaxed">
                Add an endpoint to receive instantaneous notifications when emails are delivered or bounced.
              </p>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="btn-cf-primary text-xs mt-3.5"
                >
                  <Plus size={13} weight="bold" />
                  <span>Add Endpoint</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 font-semibold">Endpoint URL</th>
                  <th className="py-3.5 px-4 font-semibold">Events</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Signing Secret</th>
                  {!isViewer && <th className="py-3.5 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm md:text-[15px]">
                {endpoints.map((ep) => {
                  const isRevealed = Boolean(showSecret[ep.id]);
                  const secret = ep.secret || "whsec_••••••••••••••••";
                  const displaySecret = isRevealed ? secret : `${secret.slice(0, 8)}••••••••`;

                  return (
                    <tr
                      key={ep.id}
                      className="h-13 hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Endpoint URL */}
                      <td className="py-3.5 px-4 max-w-80 align-middle font-mono text-[13px] md:text-sm text-zinc-200 truncate">
                        {ep.url}
                      </td>

                      {/* Subscribed Events (Monochrome Tags) */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ep.events.map((ev) => (
                            <span
                              key={ev}
                              className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                            >
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {ep.isActive !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-2xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-2xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Signing Secret */}
                      <td className="py-3.5 px-4 align-middle font-mono text-2xs text-zinc-400 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          <span>{displaySecret}</span>
                          <button
                            type="button"
                            onClick={() => toggleShowSecret(ep.id)}
                            className="text-zinc-500 hover:text-zinc-200 p-0.5"
                            title={isRevealed ? "Hide secret" : "Reveal secret"}
                          >
                            {isRevealed ? <EyeSlash size={11} /> : <Eye size={11} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(secret, ep.id)}
                            className="text-zinc-500 hover:text-zinc-200 p-0.5"
                            title="Copy secret"
                          >
                            {copiedId === ep.id ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      {!isViewer && (
                        <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendTestWebhook(ep)}
                              disabled={testingId === ep.id}
                              className="btn-cf-secondary text-xs h-8 px-2.5"
                              title="Test endpoint"
                            >
                              <span>{testingId === ep.id ? "Testing..." : "Test"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEndpoint(ep.id, ep.url)}
                              disabled={deletingId === ep.id}
                              className="btn-cf-danger text-xs h-8 px-2.5"
                              title="Delete endpoint"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Endpoint Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800/80 rounded-lg shadow-2xl p-5 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h3 className="text-sm font-semibold text-zinc-100">Add Webhook Endpoint</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddEndpoint} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Endpoint URL <span className="text-zinc-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/webhooks"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Subscribe to Events
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {AVAILABLE_EVENTS.map((ev) => {
                    const isChecked = selectedEvents.includes(ev.id);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => toggleEvent(ev.id)}
                        className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isChecked
                            ? "bg-zinc-900 border-zinc-700 text-zinc-200"
                            : "bg-zinc-900/30 border-zinc-800/80 text-zinc-400 hover:text-zinc-300"
                        }`}
                      >
                        <div>
                          <span className="font-mono font-medium block">{ev.label}</span>
                          <span className="text-2xs text-zinc-500 block">{ev.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-zinc-800 text-zinc-100 bg-zinc-900 focus:ring-0 cursor-pointer pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-cf-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newUrl.trim() || selectedEvents.length === 0}
                  className="btn-cf-primary text-xs"
                >
                  {isSubmitting ? "Adding..." : "Add Endpoint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
