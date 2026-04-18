import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  Eye, 
  Loader2, 
  Camera, 
  Image, 
  RotateCcw, 
  Smartphone,
  Monitor,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { compressImage } from "@/utils/imageCompression";

interface BookImages {
  frontCover: string;
  backCover: string;
  insidePages: string;
  extra1?: string;
  extra2?: string;
}

interface EnhancedMobileImageUploadProps {
  images?: string[] | BookImages;
  onImagesChange: (images: string[] | BookImages) => void;
  maxImages?: number;
  className?: string;
  variant?: "array" | "object";
  currentImages?: BookImages;
  disabled?: boolean;
  onAllRequiredImagesReady?: () => void;
  itemType?: "book" | "uniform" | "school_supply";
}

const EnhancedMobileImageUpload = ({
  images,
  onImagesChange,
  maxImages = 3,
  className = "",
  variant = "object",
  currentImages,
  disabled = false,
  onAllRequiredImagesReady,
  itemType = "book",
}: EnhancedMobileImageUploadProps) => {
  const [isUploading, setIsUploading] = useState<{ [key: number]: boolean }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showOrientationGuide, setShowOrientationGuide] = useState<number | null>(null);
  
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cameraInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const frontCameraInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isMobile = useIsMobile();

  // Convert images to array format for consistent handling (preserve indices)
  const getImageArray = (): string[] => {
    const max = Math.max(3, maxImages);
    if (variant === "object") {
      const bookImages = (currentImages || images) as BookImages;
      const arr = [
        bookImages?.frontCover || "",
        bookImages?.backCover || "",
        bookImages?.insidePages || "",
        bookImages?.extra1 || "",
        bookImages?.extra2 || "",
      ];
      return arr.slice(0, max);
    }
    const arr = Array.isArray(images) ? (images as string[]) : [];
    // Ensure fixed length with empty slots preserved
    const filled = Array.from({ length: max }, (_, i) => arr[i] || "");
    return filled;
  };

  // Convert array back to appropriate format
  const updateImages = (newImages: string[]) => {
    if (variant === "object") {
      const bookImages: BookImages = {
        frontCover: newImages[0] || "",
        backCover: newImages[1] || "",
        insidePages: newImages[2] || "",
        extra1: newImages[3] || "",
        extra2: newImages[4] || "",
      };
      onImagesChange(bookImages);

      // Check if all 3 required images are ready
      if (newImages[0] && newImages[1] && newImages[2] && onAllRequiredImagesReady) {
        onAllRequiredImagesReady();
      }
    } else {
      onImagesChange(newImages);
    }
  };

  const imageArray = getImageArray();

  // Dynamic slot labels based on item type
  const getBaseSlots = () => {
    if (itemType === "uniform") {
      return [
        {
          label: "Front View",
          index: 0,
          required: true,
          description: "Clear front photo of the uniform",
          orientation: "portrait",
          tips: "Hold phone vertically, good lighting, flat surface"
        },
        {
          label: "Back View",
          index: 1,
          required: true,
          description: "Clear back photo of the uniform",
          orientation: "portrait",
          tips: "Hold phone vertically, capture entire back"
        },
        {
          label: "Label / Tag",
          index: 2,
          required: false,
          description: "Size label or school crest close-up",
          orientation: "portrait",
          tips: "Get close enough so label text is readable"
        },
      ];
    }
    if (itemType === "school_supply") {
      return [
        {
          label: "Main Photo",
          index: 0,
          required: true,
          description: "Clear photo of the item",
          orientation: "portrait",
          tips: "Good lighting, flat surface, item fully visible"
        },
        {
          label: "Detail Shot",
          index: 1,
          required: false,
          description: "Close-up of important details",
          orientation: "portrait",
          tips: "Show key features or branding"
        },
        {
          label: "Contents",
          index: 2,
          required: false,
          description: "Show what's included in the set",
          orientation: "landscape",
          tips: "Spread all items out and photograph from above"
        },
      ];
    }
    // Default: book
    return [
      {
        label: "Front Cover",
        index: 0,
        required: true,
        description: "Clear photo of book front",
        orientation: "portrait",
        tips: "Hold phone vertically, ensure good lighting"
      },
      {
        label: "Back Cover",
        index: 1,
        required: true,
        description: "Clear photo of book back",
        orientation: "portrait",
        tips: "Hold phone vertically, capture entire back cover"
      },
      {
        label: "Inside Pages",
        index: 2,
        required: true,
        description: "Open book showing content",
        orientation: "landscape",
        tips: "Hold phone horizontally, show 2 pages clearly"
      },
    ];
  };

  const baseSlots = getBaseSlots();

  const optionalSlots = [
    { label: "Extra Photo 1", index: 3, required: false, description: "Optional extra angle or page", orientation: "portrait", tips: "Use good lighting" },
    { label: "Extra Photo 2", index: 4, required: false, description: "Optional extra angle or page", orientation: "portrait", tips: "Use good lighting" },
  ];

  const slots = [...baseSlots, ...optionalSlots].slice(0, Math.max(3, maxImages));

  const uploadImage = async (file: File): Promise<string> => {
    // Compress to WebP before upload for faster transfers
    const compressed = await compressImage(file, {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.8,
      format: "image/webp",
    });

    // Determine bucket based on item type
    const bucket =
      itemType === "uniform"
        ? "uniform-images"
        : itemType === "school_supply"
          ? "school-supply-images"
          : "book-images";

    // Get current user — RLS requires path to start with auth.uid()
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      throw new Error("You must be signed in to upload images");
    }
    const userId = userData.user.id;

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${compressed.extension}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressed.blob, {
        upsert: false,
        cacheControl: "31536000",
        contentType: compressed.mimeType,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Hide orientation guide
    setShowOrientationGuide(null);

    // File validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/heic",
      "image/heif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPG, PNG, HEIC, WebP)");
      return;
    }

    // Instantly show local preview
    const objectUrl = URL.createObjectURL(file);
    const tempImages = [...imageArray];
    tempImages[index] = objectUrl;
    updateImages(tempImages);

    setIsUploading((prev) => ({ ...prev, [index]: true }));

    try {
      const imageUrl = await uploadImage(file);
      const newImages = [...imageArray];
      newImages[index] = imageUrl;
      updateImages(newImages);
      toast.success(`${slots[index].label} uploaded successfully!`);
    } catch (error) {
      toast.error(`Failed to upload ${slots[index].label}. Please try again.`);
      // Remove temporary preview on failure
      const newImages = [...imageArray];
      newImages[index] = "";
      updateImages(newImages);
    } finally {
      setIsUploading((prev) => ({ ...prev, [index]: false }));
      // Reset the inputs and cleanup preview URL
      try { URL.revokeObjectURL(objectUrl); } catch {}
      event.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...imageArray];
    newImages[index] = "";
    updateImages(newImages);
    toast.success(`${slots[index].label} removed`);
  };

  const triggerFileInput = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const triggerCameraInput = (index: number, facingMode: 'user' | 'environment' = 'environment') => {
    // Show orientation guide before opening camera
    setShowOrientationGuide(index);
    
    setTimeout(() => {
      const inputRef = facingMode === 'user' 
        ? frontCameraInputRefs.current[index]
        : cameraInputRefs.current[index];
      
      if (inputRef) {
        inputRef.click();
      }
    }, 500); // Small delay to show the guide
  };

  const OrientationGuide = ({ slot }: { slot: typeof slots[0] }) => (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center gap-2 mb-2">
          {slot.orientation === 'portrait' ? (
            <Smartphone className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
          <span className="font-medium">
            Hold phone {slot.orientation === 'portrait' ? 'vertically' : 'horizontally'}
          </span>
        </div>
        <p className="text-sm">{slot.tips}</p>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Orientation Guide */}
      {showOrientationGuide !== null && (
        <OrientationGuide slot={slots[showOrientationGuide]} />
      )}

      <div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 md:gap-8"
      >
        {slots.map((slot) => {
          const index = slot.index;
          const hasImage = imageArray[index];
          const isCurrentlyUploading = isUploading[index];

          return (
            <div key={slot.label} className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h3 className={`font-medium text-center ${isMobile ? "text-sm" : "text-base"}`}>
                  {slot.label} {slot.required ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(optional)</span>}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {slot.orientation === 'portrait' ? (
                    <Smartphone className="h-3 w-3 mr-1" />
                  ) : (
                    <Monitor className="h-3 w-3 mr-1" />
                  )}
                  {slot.orientation}
                </Badge>
              </div>

              <Card
                className={`${isMobile ? "h-48" : "h-48"} transition-all duration-200 hover:shadow-md border-2 ${
                  hasImage ? 'border-green-200' : 'border-dashed border-gray-300'
                }`}
              >
                <CardContent className="p-4 h-full">
                  {hasImage ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 relative">
                        <img
                          src={hasImage}
                          alt={slot.label}
                          className={`w-full h-32 object-cover rounded mb-3 cursor-pointer shadow-sm`}
                          loading="lazy"
                          decoding="async"
                          onClick={() => setPreviewImage(hasImage)}
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setPreviewImage(hasImage)}
                          className="flex-1 h-10 text-xs touch-manipulation"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {!disabled && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeImage(index)}
                            className="flex-1 h-10 text-xs touch-manipulation"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center space-y-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                        {isCurrentlyUploading ? (
                          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                        ) : (
                          <Camera className="h-6 w-6 text-gray-400" />
                        )}
                      </div>

                      {/* Hidden file inputs */}
                      <input
                        ref={(el) => (fileInputRefs.current[index] = el)}
                        type="file"
                        accept="image/*,image/heic,image/heif,image/webp"
                        onChange={(e) => handleFileUpload(e, index)}
                        className="hidden"
                        disabled={isCurrentlyUploading || disabled}
                      />
                      
                      <input
                        ref={(el) => (cameraInputRefs.current[index] = el)}
                        type="file"
                        accept="image/*,image/heic,image/heif,image/webp"
                        onChange={(e) => handleFileUpload(e, index)}
                        className="hidden"
                        disabled={isCurrentlyUploading || disabled}
                        capture="environment"
                      />

                      <input
                        ref={(el) => (frontCameraInputRefs.current[index] = el)}
                        type="file"
                        accept="image/*,image/heic,image/heif,image/webp"
                        onChange={(e) => handleFileUpload(e, index)}
                        className="hidden"
                        disabled={isCurrentlyUploading || disabled}
                        capture="user"
                      />

                      {isMobile ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isCurrentlyUploading || disabled}
                              className="w-full h-12 text-sm touch-manipulation"
                            >
                              {isCurrentlyUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Camera className="h-4 w-4 mr-2" />
                              )}
                              {isCurrentlyUploading
                                ? "Uploading..."
                                : `Add ${slot.label}`}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64" align="center">
                            <DropdownMenuLabel className="text-xs text-gray-500">
                              Choose Photo Source
                            </DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => triggerFileInput(index)}
                              className="cursor-pointer"
                            >
                              <Image className="mr-2 h-4 w-4 text-green-600" />
                              <div className="flex-1">
                                <div className="font-medium">Choose from Gallery</div>
                                <div className="text-xs text-gray-500">Browse saved photos</div>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => triggerCameraInput(index, 'environment')}
                              className="cursor-pointer"
                            >
                              <Camera className="mr-2 h-4 w-4 text-blue-600" />
                              <div className="flex-1">
                                <div className="font-medium">Back Camera</div>
                                <div className="text-xs text-gray-500">Best for book photos</div>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => triggerCameraInput(index, 'user')}
                              className="cursor-pointer"
                            >
                              <RotateCcw className="mr-2 h-4 w-4 text-purple-600" />
                              <div className="flex-1">
                                <div className="font-medium">Front Camera</div>
                                <div className="text-xs text-gray-500">Selfie camera</div>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isCurrentlyUploading || disabled}
                          onClick={() => triggerFileInput(index)}
                          className="w-full min-h-[44px] touch-manipulation"
                        >
                          {isCurrentlyUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {isCurrentlyUploading
                            ? "Uploading..."
                            : `Upload ${slot.label}`}
                        </Button>
                      )}

                      <p className="text-xs text-gray-500 text-center">
                        {slot.description}
                      </p>
                      <p className="text-xs text-gray-400 text-center">
                        {isMobile
                          ? "Gallery or Camera • PNG, JPG up to 10MB"
                          : "PNG, JPG up to 10MB"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Mobile Tips */}
      {isMobile && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Photo Tips:</strong> Use good lighting, hold steady, and make sure text is readable. 
            Gallery option lets you use photos you've already taken!
          </AlertDescription>
        </Alert>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <Button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white"
              variant="secondary"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMobileImageUpload;
