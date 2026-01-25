"use client";

import { useState, useEffect } from "react";
import { Upload, LoaderCircle, Link as LinkIcon } from "lucide-react";
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
import { getAccessToken, getBusinessId } from "@/app/lib/auth";
import { refreshAccessToken } from "@/app/lib/api";

interface DocumentState {
  fileUrl?: string | null;
  status?: "NOT_UPLOADED" | "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt?: string | null;
  value?: string;
  exists?: boolean;
}

interface Document {
  id?: string;
  key: string;
  label: string;
  description: string;
  scope: "VENDOR" | "BUSINESS";
  upload?: {
    method: "POST" | "PATCH";
    endpoint: string;
    field?: string;
  };
  state: DocumentState;
}

const tinSchema = z.object({
  tin: z.string().min(1, "TIN is required"),
  // .regex(/^\d{12,13}$/, "TIN must be 12 or 13 digits"), // ← uncomment when ready
});

type TinFormValues = z.infer<typeof tinSchema>;

const API_BASE = "https://api.munchspace.io/api/v1";
const API_KEY =
  "eH4u8eujRzIrLWE+xkqyUWg33ggZ1Ts5bAKi/Ze5l23dyc7aLZSVMEssML0vUvDHrhchMtyskMxzGW3c4jhQCA==";

// ──────────────────────────────────────────────────────────────
// Reusable authenticated fetch with refresh + single retry
// ──────────────────────────────────────────────────────────────

async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  // No token → try refresh first
  if (!token) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) {
      throw new Error("Session expired - refresh failed");
    }
    token = getAccessToken();
    if (!token) {
      throw new Error("Refresh succeeded but no token available");
    }
  }

  const headers: HeadersInit = {
    "x-api-key": API_KEY,
    Authorization: `Bearer ${token}`,
    ...init.headers,
  };

  // Do not set Content-Type when sending FormData
  if (!(init.body instanceof FormData)) {
    (headers as any)["Content-Type"] = "application/json";
  }

  let response = await fetch(url, { ...init, headers });

  // Handle 401 → refresh + retry once
  if (response.status === 401) {
    const refreshOk = await refreshAccessToken();
    if (!refreshOk) {
      throw new Error("Session expired during request (refresh failed)");
    }

    token = getAccessToken();
    if (!token) {
      throw new Error("Refresh succeeded but no token available");
    }

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

export default function KycVerification() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTinSubmitting, setIsTinSubmitting] = useState(false);

  const tinForm = useForm<TinFormValues>({
    resolver: zodResolver(tinSchema),
    defaultValues: { tin: "" },
  });

  const businessId = getBusinessId();

  // Fetch all document requirements and current states
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!businessId) {
        toast.error("Business identifier not found. Please sign in again.");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await authenticatedFetch(
          `${API_BASE}/vendors/me/businesses/${businessId}/documents`,
          { method: "GET" },
        );

        if (!res.ok) {
          throw new Error(`Failed to load documents: ${res.status}`);
        }

        const json = await res.json();
        if (!json.success || !json.data?.documents) {
          throw new Error("Invalid response format");
        }

        const fetchedDocs = json.data.documents;
        console.log("fetchedDocs", fetchedDocs);
        setDocuments(fetchedDocs);

        // Pre-fill TIN if it already exists
        const taxDoc = fetchedDocs.find((d: Document) => d.key === "tax_id");
        if (taxDoc?.state?.exists && taxDoc.state.value) {
          tinForm.reset({ tin: taxDoc.state.value });
        }
      } catch (err: any) {
        console.error("Documents fetch error:", err);
        const msg =
          err.message?.includes("expired") || err.message?.includes("refresh")
            ? "Your session has expired. Please sign in again."
            : "Could not load verification requirements. Please try again later.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [businessId, tinForm]);

  // Unified file upload handler
  const handleFileUpload = async (doc: Document, file: File) => {
    if (!businessId || !doc.id) {
      toast.error("Cannot upload: missing required information");
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

    const endpoint =
      doc.scope === "BUSINESS"
        ? `${API_BASE}/vendors/me/businesses/${businessId}/documents`
        : `${API_BASE}/vendors/me/documents`;

    try {
      const res = await authenticatedFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      console.log("=== UPLOAD RESPONSE DEBUG ===");
      console.log("Status:", res.status);
      console.log("Full response body:", JSON.stringify(result, null, 2));
      console.log("============================");

      if (!res.ok) {
        const errorMessage = result.message || result.error || "Upload failed";
        throw new Error(errorMessage);
      }

      const fileUrl =
        result.fileUrl ||
        result.url ||
        result.documentUrl ||
        result.signedUrl ||
        result.path ||
        result.data?.fileUrl ||
        result.data?.url ||
        result.document?.fileUrl ||
        result.document?.url ||
        null;

      const rawStatus =
        result.status ||
        result.state ||
        result.documentStatus ||
        result.data?.status ||
        result.document?.status ||
        "";

      const normalizedStatus = String(rawStatus).toUpperCase().trim();

      if (!fileUrl) {
        console.warn("No file URL found in response");
        throw new Error("Server did not return a valid document URL");
      }

      const finalStatus = normalizedStatus.includes("PEND")
        ? "PENDING"
        : normalizedStatus.includes("APPROV")
          ? "APPROVED"
          : normalizedStatus.includes("REJECT")
            ? "REJECTED"
            : "PENDING";

      toast.success("Document uploaded successfully");

      setDocuments((prev) =>
        prev.map((d) =>
          d.key === doc.key
            ? {
                ...d,
                state: {
                  ...d.state,
                  fileUrl: fileUrl,
                  status: finalStatus,
                  createdAt:
                    result.createdAt ||
                    result.uploadedAt ||
                    new Date().toISOString(),
                },
              }
            : d,
        ),
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg =
        err.message?.includes("expired") || err.message?.includes("refresh")
          ? "Your session has expired. Please sign in again."
          : err.message || "Failed to upload document";
      toast.error(msg);
    }
  };

  // Handle TIN submission/update
  const onTinSubmit = async (data: TinFormValues) => {
    setIsTinSubmitting(true);

    try {
      const taxDoc = documents.find((d) => d.key === "tax_id");
      if (!taxDoc?.upload?.endpoint) {
        throw new Error("Tax ID endpoint configuration missing");
      }

      const endpoint = taxDoc.upload.endpoint.replace(
        "{businessId}",
        businessId || "",
      );

      const res = await authenticatedFetch(`${API_BASE}${endpoint}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taxId: data.tin.trim() }),
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
                state: {
                  ...d.state,
                  value: data.tin,
                  exists: true,
                },
              }
            : d,
        ),
      );

      tinForm.reset({ tin: data.tin });
    } catch (err: any) {
      console.error("TIN update error:", err);
      const msg =
        err.message?.includes("expired") || err.message?.includes("refresh")
          ? "Your session has expired. Please sign in again."
          : err.message || "Failed to update TIN";
      toast.error(msg);
    } finally {
      setIsTinSubmitting(false);
    }
  };

  const getStatusBadge = (doc: Document) => {
    if (doc.key === "tax_id") {
      return doc.state.exists ? (
        <Badge className="bg-blue-100 text-blue-700">In Review</Badge>
      ) : (
        <Badge className="bg-pink-100 text-pink-700">Required</Badge>
      );
    }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-gray-500" />
      </div>
    );
  }

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
                  <h2 className="text-xl font-semibold text-gray-900">
                    {doc.label}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    {getStatusBadge(doc)}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {doc.description}
              </p>

              {/* Tax ID (TIN) Section */}
              {doc.key === "tax_id" && (
                <Form {...tinForm}>
                  <form
                    onSubmit={tinForm.handleSubmit(onTinSubmit)}
                    className="space-y-6"
                  >
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
                        Current submitted TIN:{" "}
                        <span className="font-medium">{doc.state.value}</span>
                      </p>
                    )}
                  </form>
                </Form>
              )}

              {/* File-based document section */}
              {doc.key !== "tax_id" && doc.upload && (
                <div className="space-y-4">
                  {doc.state.fileUrl && (
                    <a
                      href={doc.state.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      <LinkIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate max-w-[420px]">
                        View document
                      </span>
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
                          {doc.state.fileUrl
                            ? "Replace Document"
                            : "Upload Document"}
                        </div>
                      </label>
                      <p className="text-xs text-gray-500">
                        Accepted formats: PDF, JPG, JPEG, PNG • One file only
                      </p>
                      {doc.state.status === "REJECTED" &&
                        doc.state.rejectionReason && (
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
