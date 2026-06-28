import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, AlertTriangle, X, School, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/utils/imageCompression";
import debugLogger from "@/utils/debugLogger";
import { BookFormData } from "@/types/book";
import { AIPreviewModal } from "./AIPreviewModal";
import { UNIVERSITY_YEARS, SOUTH_AFRICAN_UNIVERSITIES_SIMPLE } from "@/constants/universities";
import { ALL_READER_GENRES } from "@/constants/readerGenres";

interface AIAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  onAnalysisComplete: (extractedData: Partial<BookFormData>) => void;
}

interface UploadedImages {
  frontCover: string;
  backCover: string;
  insidePages: string;
}

interface AnalysisState {
  step: "bookType" | "details" | "images" | "analyzing";
  bookType: "school" | "university" | "reader" | null;
  uploadedImages: UploadedImages;
  curriculum?: "CAPS" | "Cambridge" | "IEB";
  grade?: string;
  university?: string;
  universityYear?: string;
  genre?: string;
  isAnalyzing: boolean;
  analysisError: string | null;
  showPreview: boolean;
  extractedData: any;
}

const AIAnalysisModal = ({
  open,
  onClose,
  onAnalysisComplete,
}: AIAnalysisModalProps) => {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = {
    frontCover: useRef<HTMLInputElement>(null),
    backCover: useRef<HTMLInputElement>(null),
    insidePages: useRef<HTMLInputElement>(null),
  };
  const [state, setState] = useState<AnalysisState>({
    step: "bookType",
    bookType: null,
    uploadedImages: {
      frontCover: "",
      backCover: "",
      insidePages: "",
    },
    curriculum: undefined,
    grade: undefined,
    university: undefined,
    universityYear: undefined,
    genre: undefined,
    isAnalyzing: false,
    analysisError: null,
    showPreview: false,
    extractedData: null,
  });

  const curricula = ["CAPS", "Cambridge", "IEB"];
  const grades = [
    "N/A",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
    "Study Guide",
    "Course Book",
  ];

  const uploadImage = async (file: File): Promise<string> => {
    const compressed = await compressImage(file, {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.8,
      format: "image/webp",
    });

    // Generate unique filename using timestamp + random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    const fileName = `${timestamp}-${randomStr}.${compressed.extension}`;
    const filePath = `book-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("book-images")
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
    } = supabase.storage.from("book-images").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageKey: keyof UploadedImages,
    label: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    const imageIndex = Object.keys(state.uploadedImages).indexOf(imageKey);
    setUploadingIndex(imageIndex);

    try {
      const imageUrl = await uploadImage(file);
      setState((prev) => ({
        ...prev,
        uploadedImages: {
          ...prev.uploadedImages,
          [imageKey]: imageUrl,
        },
      }));
      toast.success(`${label} uploaded successfully!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      debugLogger.error("AIAnalysisModal", `Upload error for ${label}:`, errorMessage);
      toast.error(`Failed to upload ${label}. Please try again.`);
    } finally {
      setUploadingIndex(null);
      // Reset the input element using ref
      const inputRef = fileInputRefs[imageKey];
      if (inputRef?.current) {
        inputRef.current.value = "";
      } else if (event.target instanceof HTMLInputElement) {
        event.target.value = "";
      }
    }
  };

  const removeImage = (imageKey: keyof UploadedImages, label: string) => {
    setState((prev) => ({
      ...prev,
      uploadedImages: {
        ...prev.uploadedImages,
        [imageKey]: "",
      },
    }));
    toast.success(`${label} removed`);
  };

  const allImagesUploaded =
    state.uploadedImages.frontCover &&
    state.uploadedImages.backCover &&
    state.uploadedImages.insidePages;

  // Validation function for details step
  const validateDetailsStep = (): boolean => {
    if (state.bookType === "school") {
      if (!state.curriculum) return false;
      if (!state.grade) return false;
    }

    if (state.bookType === "university") {
      if (!state.universityYear) return false;
    }

    if (state.bookType === "reader") {
      if (!state.genre) return false;
    }

    return true;
  };

  // Validation function for images step
  const validateImagesStep = (): boolean => {
    return allImagesUploaded;
  };

  const handleAnalyze = async () => {
    if (!validateImagesStep()) {
      toast.error("Please upload all images");
      return;
    }

    setState((prev) => ({
      ...prev,
      step: "analyzing",
      isAnalyzing: true,
      analysisError: null,
    }));

    try {
      const hints: any = {
        curriculum: state.curriculum,
        grade: state.grade,
        universityYear: state.universityYear,
      };

      const { data, error } = await supabase.functions.invoke(
        "extract-book-details",
        {
          body: {
            frontCoverUrl: state.uploadedImages.frontCover,
            backCoverUrl: state.uploadedImages.backCover,
            insidePagesUrl: state.uploadedImages.insidePages,
            hints,
          },
        }
      );

      if (error || !data.success) {
        throw new Error(data?.message || "Failed to extract book details");
      }

      setState((prev) => ({
        ...prev,
        extractedData: {
          ...data.data,
          quantity: data.data.quantity || 1,
          frontCover: state.uploadedImages.frontCover,
          backCover: state.uploadedImages.backCover,
          insidePages: state.uploadedImages.insidePages,
          curriculum: state.curriculum,
          grade: state.grade,
          university: state.university,
          universityYear: state.universityYear,
          genre: state.genre,
        },
        showPreview: true,
        isAnalyzing: false,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        step: "images",
        analysisError: errorMessage,
        isAnalyzing: false,
      }));
      toast.error(`AI analysis failed: ${errorMessage}`);
    }
  };

  const handlePreviewAccept = (extractedData: Partial<BookFormData>) => {
    setState((prev) => ({
      ...prev,
      step: "bookType",
      showPreview: false,
      uploadedImages: {
        frontCover: "",
        backCover: "",
        insidePages: "",
      },
      bookType: null,
      curriculum: undefined,
      grade: undefined,
      university: undefined,
      universityYear: undefined,
      genre: undefined,
      analysisError: null,
    }));
    onAnalysisComplete(extractedData);
    onClose();
  };

  const handlePreviewCancel = () => {
    setState((prev) => ({
      ...prev,
      showPreview: false,
      extractedData: null,
    }));
  };

  const handleClose = () => {
    if (!state.isAnalyzing && !state.showPreview) {
      setState({
        step: "bookType",
        bookType: null,
        uploadedImages: {
          frontCover: "",
          backCover: "",
          insidePages: "",
        },
        curriculum: undefined,
        grade: undefined,
        university: undefined,
        universityYear: undefined,
        genre: undefined,
        isAnalyzing: false,
        analysisError: null,
        showPreview: false,
        extractedData: null,
      });
      onClose();
    }
  };

  const ImageUploadSlot = ({
    label,
    imageKey,
    imageUrl,
    isUploading,
    inputRef,
  }: {
    label: string;
    imageKey: keyof UploadedImages;
    imageUrl: string;
    isUploading: boolean;
    inputRef?: React.RefObject<HTMLInputElement>;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-xs sm:text-sm">{label}</Label>
      <div className="relative">
        {imageUrl ? (
          <div className="relative w-full h-20 sm:h-28 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(imageKey, label)}
              disabled={isUploading}
              className="absolute top-1 right-1 sm:top-2 sm:right-2 p-1 bg-white rounded-lg shadow hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
            </button>
          </div>
        ) : (
          <label className="w-full h-20 sm:h-28 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, imageKey, label)}
              disabled={isUploading}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-0.5 sm:gap-1 text-center">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-book-600 animate-spin" />
                  <span className="text-xs font-medium text-gray-600">
                    Uploading...
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">
                    {label}
                  </span>
                </>
              )}
            </div>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open && !state.showPreview} onOpenChange={handleClose}>
        <DialogContent className="rounded-2xl max-w-xs sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>AI Book Analysis</DialogTitle>
            <DialogDescription>
              Upload photos and details to let AI extract information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 sm:space-y-4">
            {/* Step 1: Book Type Selection */}
            {state.step === "bookType" && (
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-base font-medium">
                  Select Book Type <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, bookType: "school", step: "details" }))
                    }
                    className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 border-gray-200 hover:border-book-600 hover:bg-book-50 transition-all"
                  >
                    <School className="h-6 w-6 text-gray-700" />
                    <span className="text-xs font-medium text-gray-700">
                      School
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, bookType: "university", step: "details" }))
                    }
                    className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 border-gray-200 hover:border-book-600 hover:bg-book-50 transition-all"
                  >
                    <GraduationCap className="h-6 w-6 text-gray-700" />
                    <span className="text-xs font-medium text-gray-700">
                      University
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, bookType: "reader", step: "details" }))
                    }
                    className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 border-gray-200 hover:border-book-600 hover:bg-book-50 transition-all"
                  >
                    <BookOpen className="h-6 w-6 text-gray-700" />
                    <span className="text-xs font-medium text-gray-700">
                      Reader
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Details (Type-specific fields) */}
            {state.step === "details" && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <h3 className="font-medium">Book Details</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, step: "bookType" }))
                    }
                    className="text-xs text-book-600 hover:text-book-700 font-medium"
                  >
                    Change Type
                  </button>
                </div>

                {/* School-specific fields */}
                {state.bookType === "school" && (
                  <>
                    <div>
                      <Label
                        htmlFor="curriculum"
                        className="text-sm font-medium"
                      >
                        Curriculum <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={state.curriculum || ""}
                        onValueChange={(value) =>
                          setState((prev) => ({
                            ...prev,
                            curriculum: value as
                              | "CAPS"
                              | "Cambridge"
                              | "IEB",
                          }))
                        }
                      >
                        <SelectTrigger id="curriculum" className="mt-1">
                          <SelectValue placeholder="Select curriculum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {curricula.map((curr) => (
                              <SelectItem key={curr} value={curr}>
                                {curr}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="grade" className="text-sm font-medium">
                        Grade <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={state.grade || ""}
                        onValueChange={(value) =>
                          setState((prev) => ({ ...prev, grade: value }))
                        }
                      >
                        <SelectTrigger id="grade" className="mt-1">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {grades.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* University-specific fields */}
                {state.bookType === "university" && (
                  <>
                    <div>
                      <Label
                        htmlFor="universityYear"
                        className="text-sm font-medium"
                      >
                        University Year{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={state.universityYear || ""}
                        onValueChange={(value) =>
                          setState((prev) => ({
                            ...prev,
                            universityYear: value,
                          }))
                        }
                      >
                        <SelectTrigger
                          id="universityYear"
                          className="mt-1"
                        >
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {UNIVERSITY_YEARS.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label
                        htmlFor="university"
                        className="text-sm font-medium"
                      >
                        University (Optional)
                      </Label>
                      <Select
                        value={state.university || ""}
                        onValueChange={(value) =>
                          setState((prev) => ({
                            ...prev,
                            university: value,
                          }))
                        }
                      >
                        <SelectTrigger id="university" className="mt-1">
                          <SelectValue placeholder="Select university" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {SOUTH_AFRICAN_UNIVERSITIES_SIMPLE.map(
                              (uni) => (
                                <SelectItem key={uni.id} value={uni.id}>
                                  {uni.abbreviation} - {uni.name}
                                </SelectItem>
                              )
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Reader-specific fields */}
                {state.bookType === "reader" && (
                  <div>
                    <Label htmlFor="genre" className="text-sm font-medium">
                      Genre <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={state.genre || ""}
                      onValueChange={(value) =>
                        setState((prev) => ({ ...prev, genre: value }))
                      }
                    >
                      <SelectTrigger id="genre" className="mt-1">
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {ALL_READER_GENRES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Image Upload */}
            {state.step === "images" && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Book Images</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, step: "details" }))
                    }
                    className="text-xs text-book-600 hover:text-book-700 font-medium"
                  >
                    Back
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-2 sm:mb-3">
                  Upload photos of your book's front cover, back cover, and inside pages for AI analysis.
                </p>
                <ImageUploadSlot
                  label="Front Cover"
                  imageKey="frontCover"
                  imageUrl={state.uploadedImages.frontCover}
                  isUploading={uploadingIndex === 0}
                  inputRef={fileInputRefs.frontCover}
                />
                <ImageUploadSlot
                  label="Back Cover"
                  imageKey="backCover"
                  imageUrl={state.uploadedImages.backCover}
                  isUploading={uploadingIndex === 1}
                  inputRef={fileInputRefs.backCover}
                />
                <ImageUploadSlot
                  label="Inside Pages"
                  imageKey="insidePages"
                  imageUrl={state.uploadedImages.insidePages}
                  isUploading={uploadingIndex === 2}
                  inputRef={fileInputRefs.insidePages}
                />

                {/* Error Message */}
                {state.analysisError && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      {state.analysisError}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Analyzing */}
            {state.step === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 text-book-600 animate-spin" />
                <p className="text-sm font-medium text-gray-700">
                  Analyzing your book...
                </p>
                <p className="text-xs text-gray-500">
                  This may take a few moments
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={state.isAnalyzing || state.step === "analyzing"}
              className="flex-1"
            >
              Cancel
            </Button>

            {state.step === "details" && (
              <Button
                onClick={() =>
                  setState((prev) => ({ ...prev, step: "images" }))
                }
                disabled={!validateDetailsStep()}
                className="flex-1 bg-book-600 hover:bg-book-700"
              >
                Next
              </Button>
            )}

            {state.step === "images" && (
              <Button
                onClick={handleAnalyze}
                disabled={!validateImagesStep() || state.isAnalyzing}
                className="flex-1 bg-book-600 hover:bg-book-700"
              >
                {state.isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <AIPreviewModal
        open={state.showPreview}
        extractedData={state.extractedData}
        isLoading={false}
        onAccept={handlePreviewAccept}
        onCancel={handlePreviewCancel}
      />
    </>
  );
};

export default AIAnalysisModal;
