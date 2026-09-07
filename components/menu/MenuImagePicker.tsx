"use client";

import { useRef } from "react";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Mirrors the check the store logo already applies in StoreDetails, so the two
// upload surfaces reject the same files with the same words.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

type MenuImagePickerProps = {
  /** A data: URL for a freshly picked file, or the stored URL of a saved image. */
  value?: string;
  onChange: (dataUrl: string) => void;
  onRemove: () => void;
  invalid?: boolean;
  disabled?: boolean;
};

/**
 * The image field for menu item create and edit.
 *
 * Both screens used to render the whole tile as one `<label>`: once an image was
 * set it replaced the camera and the prompt, leaving nothing on screen to say
 * the picture could still be changed or removed. The controls here are real
 * buttons, always visible — hover-only affordances do not exist on touch.
 */
export function MenuImagePicker({
  value,
  onChange,
  onRemove,
  invalid,
  disabled,
}: MenuImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Clear the input before anything else, or re-picking the same file after a
    // rejection is a no-op — the value has not changed, so no event fires.
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only PNG and JPEG images are allowed");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("File size exceeds 2MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result as string);
    reader.onerror = () =>
      toast.error("Could not read that image. Please try another file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFile}
        className="hidden"
        disabled={disabled}
      />

      {value ? (
        <div className="space-y-3">
          {/* Customers see the photo cropped to a fixed shape, so the preview is
              framed the same way. Letting the image set its own height was what
              made a tall photo look squashed against a short one. */}
          <div
            className={cn(
              "relative w-full aspect-[4/3] max-h-72 overflow-hidden rounded-xl border bg-gray-50",
              invalid ? "border-munchred" : "border-gray-200",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Menu item"
              className="h-full w-full object-cover"
              // Stored images are served cross-origin; a freshly picked data:
              // URL is same-document and must not carry the attribute.
              crossOrigin={value.startsWith("data:") ? undefined : "anonymous"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={openPicker}
              disabled={disabled}
              className="gap-2 border-gray-300 text-gray-700 hover:bg-munchprimary/5 hover:text-munchprimary"
            >
              <ImageUp className="h-4 w-4" />
              Change image
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onRemove}
              disabled={disabled}
              className="gap-2 text-gray-500 hover:bg-munchred/5 hover:text-munchred"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
            <p className="ml-auto text-xs text-gray-500">
              PNG or JPEG, up to 2MB
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
            "hover:border-munchprimary hover:bg-munchprimary/5",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-munchprimary/40",
            invalid
              ? "border-munchred bg-munchred/5"
              : "border-gray-300 bg-gray-50",
          )}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-munchprimary/10">
            <Camera className="h-8 w-8 text-munchprimary" />
          </span>
          <span className="text-center font-medium text-gray-700">
            Add a photo of this item
          </span>
          <span className="text-center text-sm text-gray-500">
            PNG or JPEG, up to 2MB
          </span>
        </button>
      )}
    </div>
  );
}

export default MenuImagePicker;
