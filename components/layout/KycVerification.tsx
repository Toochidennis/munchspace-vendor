"use client";

import { useState, useEffect, useId } from "react";
import Image from "next/image";
import { Upload, X, FileText, LoaderCircle } from "lucide-react";

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

interface DocumentSection {
  id: string;
  title: string;
  description: string;
  status: "required" | "in-review" | "verified";
  uploadedFiles: { name: string; url: string }[];
  tinNumber?: string;
}

const tinSchema = z.object({
  tin: z
    .string()
    .min(1, "TIN is required")
    .regex(/^\d{10,11}$/, "TIN must be 10 or 11 digits"),
});

type TinFormValues = z.infer<typeof tinSchema>;

const initialDocuments: DocumentSection[] = [
  {
    id: "cac",
    title: "CAC Documents",
    description:
      "Upload your CAC registration papers so we can confirm your business is officially registered. This helps unlock payouts and keeps the platform compliant.",
    status: "required",
    uploadedFiles: [],
  },
  {
    id: "id",
    title: "Owner/Signatory ID",
    description:
      "Provide a valid government-issued ID (NIN, Voter's Card, Passport, Driver's License). This verifies the real person behind the business.",
    status: "in-review",
    uploadedFiles: [
      { name: "nin_front.png", url: "/placeholder/nin-front.jpg" },
      { name: "nin_back.png", url: "/placeholder/nin-back.jpg" },
    ],
  },
  {
    id: "health",
    title: "Food/Health Safety Certificate",
    description:
      "Upload your food handling or health certification. This assures customers that your meals meet safety standards.",
    status: "verified",
    uploadedFiles: [
      { name: "health_cert_001.pdf", url: "/placeholder/health-cert.jpg" },
      { name: "health_cert_002.pdf", url: "/placeholder/health-cert-2.jpg" },
    ],
  },
  {
    id: "tin",
    title: "Tax Identification Number (TIN)",
    description:
      "Submit your TIN so we can complete basic business verification requirements.",
    status: "required",
    uploadedFiles: [],
    tinNumber: "",
  },
];

export default function KycVerification() {
  const [documents, setDocuments] =
    useState<DocumentSection[]>(initialDocuments);
  const [isTinSubmitting, setIsTinSubmitting] = useState(false);

  const tinForm = useForm<TinFormValues>({
    resolver: zodResolver(tinSchema),
    defaultValues: {
      tin: documents.find((d) => d.id === "tin")?.tinNumber || "",
    },
  });

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      documents.forEach((doc) => {
        doc.uploadedFiles.forEach((file) => {
          if (file.url.startsWith("blob:")) {
            URL.revokeObjectURL(file.url);
          }
        });
      });
    };
  }, [documents]);

  const handleFileUpload = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              uploadedFiles: [...doc.uploadedFiles, ...newFiles],
              status:
                doc.uploadedFiles.length === 0 && doc.status === "required"
                  ? "in-review"
                  : doc.status,
            }
          : doc
      )
    );

    e.target.value = "";
  };

  const removeFile = (docId: string, fileIndex: number) => {
    let revokedUrl = "";

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const fileToRemove = doc.uploadedFiles[fileIndex];
          if (fileToRemove && fileToRemove.url.startsWith("blob:")) {
            revokedUrl = fileToRemove.url;
          }

          const remainingFiles = doc.uploadedFiles.filter(
            (_, i) => i !== fileIndex
          );

          return {
            ...doc,
            uploadedFiles: remainingFiles,
            status:
              remainingFiles.length === 0 && doc.status !== "verified"
                ? "required"
                : doc.status,
          };
        }
        return doc;
      })
    );

    if (revokedUrl) {
      URL.revokeObjectURL(revokedUrl);
    }
  };

  const onTinSubmit = (data: TinFormValues) => {
    setIsTinSubmitting(true);

    // Simulate submission delay
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === "tin"
            ? { ...doc, tinNumber: data.tin, status: "in-review" }
            : doc
        )
      );
      tinForm.reset({ tin: data.tin });
      setIsTinSubmitting(false);
    }, 800);
  };

  const getStatusBadge = (status: DocumentSection["status"]) => {
    switch (status) {
      case "required":
        return <Badge className="bg-pink-100 text-pink-700">Required</Badge>;
      case "in-review":
        return <Badge className="bg-blue-100 text-blue-700">In Review</Badge>;
      case "verified":
        return <Badge className="bg-green-100 text-green-700">Verified</Badge>;
    }
  };

  const isImageFile = (fileName: string) => {
    const ext = fileName.toLowerCase().split(".").pop();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
  };

  const currentTinValue =
    documents.find((d) => d.id === "tin")?.tinNumber || "";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="space-y-8">
          {documents.map((doc) => {
            const inputId = useId();

            return (
              <div
                key={doc.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {doc.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed">
                  {doc.description}
                </p>

                {/* TIN Form Section */}
                {doc.id === "tin" &&
                  (doc.status === "required" || doc.status === "in-review") && (
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
                                <span className="-ms-1 pt-1 text-xl text-munchred">
                                  *
                                </span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your TIN"
                                  className="h-12 max-w-md"
                                  {...field}
                                  disabled={doc.status === "in-review"}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {doc.status !== "in-review" && (
                            <div className="flex gap-4 items-center">
                              <Button
                                type="submit"
                                disabled={isTinSubmitting}
                                className="bg-munchprimary hover:bg-munchprimaryDark h-10 rounded-lg"
                              >
                                {isTinSubmitting ? (
                                  <LoaderCircle className="animate-spin" />
                                ) : (
                                  "Submit"
                                )}
                              </Button>
                            </div>
                        )}

                        {doc.status === "in-review" && currentTinValue && (
                          <p className="text-sm text-gray-600">
                            Submitted TIN:{" "}
                            <span className="font-medium">
                              {currentTinValue}
                            </span>
                          </p>
                        )}
                      </form>
                    </Form>
                  )}

                {/* Uploaded Files Preview (non-TIN sections) */}
                {doc.id !== "tin" && doc.uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">
                      Submitted documents:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {doc.uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-shadow hover:shadow-md">
                            {isImageFile(file.name) ? (
                              <Image
                                src={file.url}
                                alt={file.name}
                                width={200}
                                height={200}
                                className="w-full h-48 object-cover"
                              />
                            ) : (
                              <div className="h-48 bg-gray-100 flex flex-col items-center justify-center p-4">
                                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center mb-3">
                                  <FileText className="h-8 w-8 text-gray-500" />
                                </div>
                                <p className="text-xs text-gray-600 text-center truncate w-full">
                                  {file.name}
                                </p>
                              </div>
                            )}
                            <div className="p-2 bg-gray-50 border-t">
                              <p className="text-xs text-gray-700 truncate">
                                {file.name}
                              </p>
                            </div>
                          </div>

                          {(doc.status === "required" ||
                            doc.status === "in-review") && (
                            <button
                              onClick={() => removeFile(doc.id, index)}
                              className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition"
                              aria-label="Remove file"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Section (non-TIN sections) */}
                {doc.id !== "tin" &&
                  (doc.status === "required" || doc.status === "in-review") && (
                    <>
                      <label htmlFor={inputId} className="block cursor-pointer">
                        <input
                          id={inputId}
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => handleFileUpload(doc.id, e)}
                          className="hidden"
                        />
                        <div className="inline-flex items-center justify-center gap-2 rounded-md border border-orange-500 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition">
                          <Upload className="h-4 w-4" />
                          Upload Files
                        </div>
                      </label>

                      <p className="text-xs text-gray-500 mt-2">
                        Max file size: 7MB
                        <br />
                        Accepted formats: PDF, PNG, JPG, JPEG, DOC, DOCX
                      </p>
                    </>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
