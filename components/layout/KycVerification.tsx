"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentSection {
  id: string;
  title: string;
  description: string;
  status: "required" | "in-review" | "verified";
  uploadedFiles: { name: string; url: string }[]; // now includes preview URL
}

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
  },
];

export default function KycVerification() {
  const [documents, setDocuments] =
    useState<DocumentSection[]>(initialDocuments);

  const handleFileUpload = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file), // Creates a temporary preview URL
    }));

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              uploadedFiles: [...doc.uploadedFiles, ...newFiles],
              status: doc.status === "required" ? "in-review" : doc.status,
            }
          : doc
      )
    );
  };

  const removeFile = (docId: string, fileIndex: number) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              uploadedFiles: doc.uploadedFiles.filter(
                (_, i) => i !== fileIndex
              ),
              status:
                doc.uploadedFiles.filter((_, i) => i !== fileIndex).length === 0
                  ? "required"
                  : doc.status,
            }
          : doc
      )
    );
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

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto p-8 space-y-12">

        <div className="space-y-8">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-gray-300 bg-white p-6 space-y-4 shadow-sm"
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

              {/* Uploaded Files - Shown only if in-review or verified */}
              {(doc.status === "in-review" || doc.status === "verified") && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Submitted docs:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {doc.uploadedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition"
                        >
                          {/* <Image
                            src={file.url}
                            alt={file.name}
                            width={200}
                            height={200}
                            className="w-full h-48 object-cover"
                          /> */}
                          <div className="p-2 bg-gray-50">
                            <p className="text-xs text-gray-700 truncate">
                              {file.name}
                            </p>
                          </div>
                        </a>
                        <button
                          onClick={() => removeFile(doc.id, index)}
                          className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <label className="block cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => handleFileUpload(doc.id, e)}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </label>

              <p className="text-xs text-gray-500">
                Max file size: 7MB
                <br />
                Accepted formats: pdf, png, jpg, jpeg, doc, docx.
              </p>
            </div>
          ))}
        </div>

        {/* Submit Button at Bottom */}
        <div className="flex pt-8">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white px-10 h-10 rounded-lg">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
