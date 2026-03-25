"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  LoaderCircle,
  Link as LinkIcon,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getAccessToken,
  getBusinessId,
} from "@/app/lib/auth";
import { Skeleton } from "../ui/skeleton";
import { refreshAccessToken } from "@/app/lib/api";

// ────────────────────────────────────────────────
//  Constants
// ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

// ────────────────────────────────────────────────
//  Authenticated Fetch
// ────────────────────────────────────────────────

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) throw new Error("Session expired");
    token = getAccessToken();
  }

  const headers: HeadersInit = {
    "x-api-key": API_KEY,
    Authorization: `Bearer ${token}`,
    ...init.headers,
  };

  if (!(init.body instanceof FormData)) {
    (headers as any)["Content-Type"] = "application/json";
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) throw new Error("Session expired");
    token = getAccessToken();

    response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return response;
}

// ────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────

interface DocumentState {
  fileUrl?: string | null;
  status?: "NOT_UPLOADED" | "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt?: string | null;
  value?: string | null;
  exists?: boolean;
}

interface Document {
  id: string;
  key: string;
  label: string;
  description: string;
  scope: "VENDOR" | "BUSINESS";
  input: {
    kind: "FILE_UPLOAD" | "TEXT_INPUT";
    field: string;
  };
  state: DocumentState;
}

const tinSchema = z.object({
  tin: z.string().min(1, "TIN is required"),
});

type TinFormValues = z.infer<typeof tinSchema>;

// ────────────────────────────────────────────────
//  Main Component
// ────────────────────────────────────────────────

export default function KycVerification() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTinSubmitting, setIsTinSubmitting] = useState(false);
  const [fetchNetworkError, setFetchNetworkError] = useState<string | null>(null);

  const tinForm = useForm<TinFormValues>({
    resolver: zodResolver(tinSchema),
    defaultValues: { tin: "" },
  });

  const businessId = getBusinessId();

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!businessId) {
        toast.error("Business identifier not found. Please sign in again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchNetworkError(null);

      try {
        const res = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/documents`,
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        console.log("Documents response:", json);

        if (!json.success || !json.data?.documents) {
          throw new Error("Invalid response format");
        }

        const fetchedDocs: Document[] = json.data.documents;
        setDocuments(fetchedDocs);

        const taxDoc = fetchedDocs.find((d) => d.key === "tax_id");
        if (taxDoc?.state?.exists && taxDoc.state.value) {
          tinForm.reset({ tin: taxDoc.state.value });
        }
      } catch (err: any) {
        console.error("Fetch documents error:", err);
        if (err.message?.includes("fetch") || err.message?.includes("Network")) {
          setFetchNetworkError("Unable to load verification requirements. Please check your internet connection.");
        } else {
          const msg = err.message?.includes("expired")
            ? "Your session has expired. Please sign in again."
            : "Could not load verification requirements. Please try again later.";
          toast.error(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [businessId, tinForm]);

  // ───── File Upload Handler ─────
  const handleFileUpload = async (doc: Document, file: File) => {
    if (!businessId || !doc.id) {
      toast.error("Missing required information for upload");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, JPG, and PNG files are allowed");
      return;
    }

    const formData = new FormData();
    formData.append("documentTypeId", doc.id);
    formData.append("file", file);

    // Determine correct endpoint based on scope
    const endpoint =
      doc.scope === "VENDOR"
        ? `${API_BASE}/vendors/me/documents`
        : `${API_BASE}/vendors/me/businesses/${businessId}/documents`;

    try {
      const res = await authenticatedFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || result.error || "Upload failed");
      }

      const fileUrl = result.fileUrl || result.url || result.data?.fileUrl || result.document?.fileUrl || null;
      if (!fileUrl) throw new Error("Server did not return a document URL");

      const rawStatus = result.status || result.state?.status || result.data?.status || "PENDING";
      const finalStatus: DocumentState["status"] = 
        rawStatus.toUpperCase().includes("APPROV") ? "APPROVED" :
        rawStatus.toUpperCase().includes("REJECT") ? "REJECTED" : "PENDING";

      toast.success("Document uploaded successfully");

      setDocuments((prev) =>
        prev.map((d) =>
          d.key === doc.key
            ? {
                ...d,
                state: {
                  ...d.state,
                  fileUrl,
                  status: finalStatus,
                  createdAt: result.createdAt || new Date().toISOString(),
                },
              }
            : d
        )
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg = err.message?.includes("expired")
        ? "Your session has expired. Please sign in again."
        : err.message || "Failed to upload document";
      toast.error(msg);
    }
  };

  // ───── TIN Submit Handler ─────
  const onTinSubmit = async (data: TinFormValues) => {
    if (!businessId) {
      toast.error("Business ID not found");
      return;
    }

    setIsTinSubmitting(true);

    try {
      const endpoint = `${API_BASE}/vendors/me/businesses/${businessId}/tax-id`;

      const res = await authenticatedFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ taxId: data.tin.trim() }),   // Change to { tin: ... } if backend expects "tin"
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update TIN");
      }

      toast.success("Tax Identification Number updated successfully");

      setDocuments((prev) =>
        prev.map((d) =>
          d.key === "tax_id"
            ? {
                ...d,
                state: { ...d.state, value: data.tin, exists: true },
              }
            : d
        )
      );

      tinForm.reset({ tin: data.tin });
    } catch (err: any) {
      console.error("TIN update error:", err);
      const msg = err.message?.includes("expired")
        ? "Your session has expired. Please sign in again."
        : err.message || "Failed to update TIN";
      toast.error(msg);
    } finally {
      setIsTinSubmitting(false);
    }
  };

  const getStatusBadge = (doc: Document) => {
    switch (doc.state.status) {
      case "NOT_UPLOADED":
        return <Badge className="bg-pink-100 text-pink-700">Required</Badge>;
      case "PENDING":
        return <Badge className="bg-blue-100 text-blue-700">In Review</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-700">Verified</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (fetchNetworkError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Connection Error</h2>
        <p className="text-gray-600 max-w-md mb-8">{fetchNetworkError}</p>
        <Button onClick={() => window.location.reload()} className="gap-2 bg-munchprimary hover:bg-munchprimaryDark">
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    );
  }

  if (loading) return <KycSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="space-y-8">
          {documents.map((doc) => (
            <div
              key={doc.key}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{doc.label}</h2>
                  {doc.input.kind === "FILE_UPLOAD" && (
                    <div className="mt-2">{getStatusBadge(doc)}</div>
                  )}
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {doc.description}
              </p>

              {/* Tax ID (TEXT_INPUT) */}
              {doc.key === "tax_id" && (
                <Form {...tinForm}>
                  <form onSubmit={tinForm.handleSubmit(onTinSubmit)} className="space-y-6">
                    <FormField
                      control={tinForm.control}
                      name="tin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-normal text-slate-500">
                            Tax Identification Number (TIN)
                            <span className="text-xl text-red-600 ms-1">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your TIN"
                              className="h-12 max-w-md"
                              {...field}
                              disabled={isTinSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={isTinSubmitting}
                      className="bg-munchprimary hover:bg-munchprimaryDark h-10 rounded-lg min-w-[140px]"
                    >
                      {isTinSubmitting ? (
                        <LoaderCircle className="animate-spin mr-2" />
                      ) : doc.state.exists ? (
                        "Update TIN"
                      ) : (
                        "Submit TIN"
                      )}
                    </Button>

                    {doc.state.exists && doc.state.value && (
                      <p className="text-sm text-gray-600">
                        Current submitted TIN: <span className="font-medium">{doc.state.value}</span>
                      </p>
                    )}
                  </form>
                </Form>
              )}

              {/* File Upload Documents */}
              {doc.input.kind === "FILE_UPLOAD" && (
                <div className="space-y-4">
                  {doc.state.fileUrl && (
                    <a
                      href={doc.state.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <LinkIcon className="h-4 w-4" />
                      View document
                    </a>
                  )}

                  {(doc.state.status === "NOT_UPLOADED" ||
                    doc.state.status === "PENDING" ||
                    doc.state.status === "REJECTED") && (
                    <div className="space-y-2">
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(doc, file);
                          }}
                          className="hidden"
                        />
                        <div className="inline-flex items-center justify-center gap-2 rounded-md border border-orange-500 px-5 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 transition">
                          <Upload className="h-4 w-4" />
                          {doc.state.fileUrl ? "Replace Document" : "Upload Document"}
                        </div>
                      </label>
                      <p className="text-xs text-gray-500">
                        Accepted formats: PDF, JPG, JPEG, PNG • One file only
                      </p>
                      {doc.state.status === "REJECTED" && doc.state.rejectionReason && (
                        <p className="text-sm text-red-600 mt-2">
                          Rejection reason: {doc.state.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton remains unchanged
const KycSkeleton = () => (
  // ... (same as previous version)
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="mx-auto max-w-5xl space-y-12">
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            {/* Skeleton content - unchanged */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-64 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
            <div className="pt-4 space-y-4">
              <Skeleton className="h-10 w-40 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);