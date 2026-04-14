import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "@/components/ui/BackButton";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { createBook } from "@/services/book/bookMutations";
import { BookFormData } from "@/types/book";
import { UniformFormData, SchoolSupplyFormData, ListingCategory } from "@/types/listing";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertTriangle, BookOpen, Shirt, Backpack } from "lucide-react";
import EnhancedMobileImageUpload from "@/components/EnhancedMobileImageUpload";
import FirstUploadSuccessDialog from "@/components/FirstUploadSuccessDialog";
import PostListingSuccessDialog from "@/components/PostListingSuccessDialog";
import ShareProfileDialog from "@/components/ShareProfileDialog";
import CommitReminderModal from "@/components/CommitReminderModal";
import {
  shouldShowCommitReminder,
  shouldShowFirstUpload,
  shouldShowPostListing,
  markPopupAsShown,
} from "@/services/popupTrackingService";
import { NotificationService } from "@/services/notificationService";
import BankingRequirementCheck from "@/components/BankingRequirementCheck";
import { isFirstBookListing } from "@/services/userBookCountService";
import { BookInformationForm } from "@/components/create-listing/BookInformationForm";
import { PricingSection } from "@/components/create-listing/PricingSection";
import { BookTypeSection } from "@/components/create-listing/BookTypeSection";
import { ParcelSizeSelector } from "@/components/create-listing/ParcelSizeSelector";
import { UniformInformationForm } from "@/components/create-listing/UniformInformationForm";
import { SchoolSupplyInformationForm } from "@/components/create-listing/SchoolSupplyInformationForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import PudoLockerSelector from "@/components/checkout/BobGoLockerSelector";
import { ParcelSizeKey } from "@/constants/parcelSizes";
import { cn } from "@/lib/utils";

// ─── Initial States ───────────────────────────────────────────────────────────
const initialBookForm: BookFormData = {
  title: "",
  author: "",
  description: "",
  price: 0,
  condition: "Good",
  category: "",
  itemType: "textbook",
  grade: "",
  universityYear: "",
  university: "",
  genre: "",
  imageUrl: "",
  frontCover: "",
  backCover: "",
  insidePages: "",
  quantity: 1,
  curriculum: undefined,
  isbn: undefined,
  parcelSize: undefined,
  province: "",
};

const initialUniformForm: UniformFormData = {
  title: "",
  description: "",
  price: 0,
  condition: "Good",
  quantity: 1,
  parcelSize: "" as ParcelSizeKey,
  schoolName: "",
  gender: undefined,
  size: "",
  color: "",
  grade: "",
  province: "",
};

const initialSupplyForm: SchoolSupplyFormData = {
  title: "",
  description: "",
  price: 0,
  condition: "Good",
  quantity: 1,
  parcelSize: "" as ParcelSizeKey,
  subject: "",
  grade: "",
  schoolName: "",
  province: "",
};

const initialImages = { frontCover: "", backCover: "", insidePages: "", extra1: "", extra2: "" };
const FIRST_UPLOAD_COMPLETED_KEY = "rebooked_first_upload_completed";

const hasCompletedFirstUpload = async (userId: string): Promise<boolean> => {
  try {
    return localStorage.getItem(`${FIRST_UPLOAD_COMPLETED_KEY}_${userId}`) === "true";
  } catch {
    return false;
  }
};

const markFirstUploadCompleted = async (userId: string): Promise<void> => {
  try {
    localStorage.setItem(`${FIRST_UPLOAD_COMPLETED_KEY}_${userId}`, "true");
  } catch {
  }
};

// ─── Tab config ───────────────────────────────────────────────────────────────
const LISTING_TABS: { key: ListingCategory; label: string; icon: React.ReactNode }[] = [
  { key: "book", label: "Book", icon: <BookOpen className="h-4 w-4" /> },
  { key: "uniform", label: "Uniform", icon: <Shirt className="h-4 w-4" /> },
  { key: "school_supply", label: "School Supply", icon: <Backpack className="h-4 w-4" /> },
];

// ─── Component ────────────────────────────────────────────────────────────────
const CreateListing = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Listing category tab
  const [activeCategory, setActiveCategory] = useState<ListingCategory>("book");

  // Book form
  const [bookFormData, setBookFormData] = useState<BookFormData>(initialBookForm);
  const [bookType, setBookType] = useState<"school" | "university" | "reader">("school");
  const [bookParcelSize, setBookParcelSize] = useState<ParcelSizeKey | "">("");

  // Uniform form
  const [uniformFormData, setUniformFormData] = useState<UniformFormData>(initialUniformForm);

  // Supply form
  const [supplyFormData, setSupplyFormData] = useState<SchoolSupplyFormData>(initialSupplyForm);

  // Shared
  const [itemImages, setItemImages] = useState(initialImages);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dialogs
  const [showFirstUploadDialog, setShowFirstUploadDialog] = useState(false);
  const [showPostListingDialog, setShowPostListingDialog] = useState(false);
  const [showShareProfileDialog, setShowShareProfileDialog] = useState(false);
  const [showCommitReminderModal, setShowCommitReminderModal] = useState(false);

  // Address / locker / phone check
  const [canListItems, setCanListItems] = useState<boolean | null>(null);
  const [hasPhoneNumber, setHasPhoneNumber] = useState<boolean | null>(null);
  const [isCheckingRequirements, setIsCheckingRequirements] = useState(true);
  const [savedLocker, setSavedLocker] = useState<any>(null);
  const requirementsCheckDoneRef = useRef(false);

  // ── Requirements check ───────────────────────────────────────────────────
  useEffect(() => {
    requirementsCheckDoneRef.current = false;

    const checkRequirementsStatus = async () => {
      if (!user?.id || requirementsCheckDoneRef.current) {
        setCanListItems(false);
        setHasPhoneNumber(false);
        setIsCheckingRequirements(false);
        return;
      }
      requirementsCheckDoneRef.current = true;

      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("preferred_delivery_locker_data, phone_number")
          .eq("id", user.id)
          .maybeSingle();

        // Check phone number
        const hasPhone = !!profileData?.phone_number;
        setHasPhoneNumber(hasPhone);

        // Check locker
        let hasLocker = false;
        if (profileData?.preferred_delivery_locker_data) {
          const lockerData = profileData.preferred_delivery_locker_data as any;
          if (lockerData.id && lockerData.name) {
            setSavedLocker(lockerData);
            hasLocker = true;
            
            // Auto-populate province if available
            if (lockerData.province) {
              setBookFormData(prev => ({ ...prev, province: lockerData.province }));
              setUniformFormData(prev => ({ ...prev, province: lockerData.province }));
              setSupplyFormData(prev => ({ ...prev, province: lockerData.province }));
            }
          }
        }
        setCanListItems(hasLocker);
      } catch {
        setCanListItems(false);
        setHasPhoneNumber(false);
      } finally {
        setIsCheckingRequirements(false);
      }
    };

    checkRequirementsStatus();
  }, [user?.id, profile?.preferred_delivery_locker_data]);

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleBookInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processed = name === "price" ? (parseFloat(value) || 0) : value;
    setBookFormData((prev) => ({ ...prev, [name]: processed }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBookSelectChange = (name: string, value: string) => {
    setBookFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBookTypeChange = (type: "school" | "university" | "reader") => {
    setBookType(type);
    setBookFormData((prev) => ({
      ...prev,
      category: "",
      itemType: type === "reader" ? "reader" : "textbook",
      grade: "",
      universityYear: "",
      university: "",
      genre: "",
    }));
  };

  const handleUniformInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processed = name === "price" ? (parseFloat(value) || 0) : value;
    setUniformFormData((prev) => ({ ...prev, [name]: processed }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleUniformSelectChange = (name: string, value: string) => {
    setUniformFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSupplyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processed = name === "price" ? (parseFloat(value) || 0) : value;
    setSupplyFormData((prev) => ({ ...prev, [name]: processed }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSupplySelectChange = (name: string, value: string) => {
    setSupplyFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (activeCategory === "book") {
      if (!bookFormData.title.trim()) newErrors.title = "Title is required";
      if (!bookFormData.author.trim()) newErrors.author = "Author is required";
      if (!bookFormData.description.trim()) newErrors.description = "Description is required";
      if (!bookFormData.price || bookFormData.price <= 0) newErrors.price = "Valid price is required";
      if (!bookFormData.category) newErrors.category = "Category is required";
      if (!bookFormData.condition) newErrors.condition = "Condition is required";
      if (!bookFormData.quantity || bookFormData.quantity < 1) newErrors.quantity = "Quantity must be at least 1";
      if (!bookParcelSize) newErrors.parcelSize = "Please select the parcel size for this item";
      if (!bookFormData.province) newErrors.province = "Province is required";
      if (bookType === "school") {
        if (!bookFormData.grade) newErrors.grade = "Grade is required for school books";
        if (!(bookFormData as any).curriculum) newErrors.curriculum = "Curriculum is required for school books";
      }
      if (bookType === "university" && !bookFormData.universityYear) newErrors.universityYear = "University Year is required";
      if (bookType === "reader" && !(bookFormData as any).genre) newErrors.genre = "Genre is required";
      if (!itemImages.frontCover) newErrors.frontCover = "Front cover photo is required";
      if (!itemImages.backCover) newErrors.backCover = "Back cover photo is required";
      if (!itemImages.insidePages) newErrors.insidePages = "Inside pages photo is required";
    }

    if (activeCategory === "uniform") {
      if (!uniformFormData.title.trim()) newErrors.title = "Title is required";
      if (!uniformFormData.description.trim()) newErrors.description = "Description is required";
      if (!uniformFormData.price || uniformFormData.price <= 0) newErrors.price = "Valid price is required";
      if (!uniformFormData.condition) newErrors.condition = "Condition is required";
      if (!uniformFormData.quantity || uniformFormData.quantity < 1) newErrors.quantity = "Quantity must be at least 1";
      if (!uniformFormData.parcelSize) newErrors.parcelSize = "Please select the parcel size for this item";
      if (!uniformFormData.province) newErrors.province = "Province is required";
      if (!itemImages.frontCover) newErrors.frontCover = "At least one photo is required";
    }

    if (activeCategory === "school_supply") {
      if (!supplyFormData.title.trim()) newErrors.title = "Title is required";
      if (!supplyFormData.description.trim()) newErrors.description = "Description is required";
      if (!supplyFormData.price || supplyFormData.price <= 0) newErrors.price = "Valid price is required";
      if (!supplyFormData.condition) newErrors.condition = "Condition is required";
      if (!supplyFormData.quantity || supplyFormData.quantity < 1) newErrors.quantity = "Quantity must be at least 1";
      if (!supplyFormData.parcelSize) newErrors.parcelSize = "Please select the parcel size for this item";
      if (!supplyFormData.province) newErrors.province = "Province is required";
      if (!itemImages.frontCover) newErrors.frontCover = "At least one photo is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!user) { toast.error("You must be logged in to create a listing"); return; }
    if (canListItems === false) { toast.error("❌ Please select and save a Pudo locker before listing."); return; }
    if (!validateForm()) {
      toast.error("Please fill in all required fields and upload photos");
      return;
    }

    // Check if user has phone number
    try {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle();

      if (!userProfile?.phone_number) {
        toast.error("Please add your phone number in your profile before listing items. It's used for shipping.");
        navigate("/profile");
        return;
      }
    } catch (error) {
      toast.error("Unable to verify phone number. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeCategory === "book") {
        const additionalImages = [itemImages.extra1, itemImages.extra2].filter(Boolean);
        const bookData: BookFormData = {
          ...bookFormData,
          frontCover: itemImages.frontCover,
          backCover: itemImages.backCover,
          insidePages: itemImages.insidePages,
          additionalImages,
          parcelSize: bookParcelSize as ParcelSizeKey,
        };
        const createdBook = await createBook({ ...bookData, quantity: bookFormData.quantity || 1 }, false);

        try {
          await NotificationService.createNotification({
            userId: user.id,
            type: 'listing',
            title: 'Item Listed Successfully!',
            message: `Your item "${bookData.title}" has been listed successfully.`,
          });
        } catch {}

        toast.success("Your book has been listed successfully!", { description: "Students can now find and purchase it.", duration: 5000 });
        await handlePostListingFlow();

      } else if (activeCategory === "uniform") {
        // Insert directly
        const province = uniformFormData.province || null;

        const { error } = await supabase.from("uniforms").insert([{
          seller_id: user.id,
          title: uniformFormData.title,
          description: uniformFormData.description,
          price: uniformFormData.price,
          condition: uniformFormData.condition,
          quantity: uniformFormData.quantity || 1,
          parcel_size: uniformFormData.parcelSize,
          school_name: uniformFormData.schoolName || null,
          gender: uniformFormData.gender || null,
          size: uniformFormData.size || null,
          color: uniformFormData.color || null,
          grade: uniformFormData.grade || null,
          image_url: itemImages.frontCover,
          additional_images: [itemImages.backCover, itemImages.insidePages, itemImages.extra1, itemImages.extra2].filter(Boolean),
          province,
          initial_quantity: uniformFormData.quantity || 1,
          available_quantity: uniformFormData.quantity || 1,
          sold_quantity: 0,
        }]);

        if (error) throw new Error(error.message);
        toast.success("Your uniform has been listed successfully!", { duration: 5000 });
        setShowShareProfileDialog(true);

      } else if (activeCategory === "school_supply") {
        const province = supplyFormData.province || null;

        const { error } = await supabase.from("school_supplies").insert([{
          seller_id: user.id,
          title: supplyFormData.title,
          description: supplyFormData.description,
          price: supplyFormData.price,
          condition: supplyFormData.condition,
          quantity: supplyFormData.quantity || 1,
          parcel_size: supplyFormData.parcelSize,
          subject: supplyFormData.subject || null,
          grade: supplyFormData.grade || null,
          school_name: supplyFormData.schoolName || null,
          image_url: itemImages.frontCover,
          additional_images: [itemImages.backCover, itemImages.insidePages, itemImages.extra1, itemImages.extra2].filter(Boolean),
          province,
          initial_quantity: supplyFormData.quantity || 1,
          available_quantity: supplyFormData.quantity || 1,
          sold_quantity: 0,
        }]);

        if (error) throw new Error(error.message);
        toast.success("Your school supply has been listed successfully!", { duration: 5000 });
        setShowShareProfileDialog(true);
      }

      // Reset forms
      setBookFormData(initialBookForm);
      setUniformFormData(initialUniformForm);
      setSupplyFormData(initialSupplyForm);
      setItemImages(initialImages);
      setBookParcelSize("");
      setErrors({});

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostListingFlow = async () => {
    try {
      const hasCompleted = await hasCompletedFirstUpload(user!.id);
      const isFirstBook = await isFirstBookListing(user!.id);
      if (shouldShowCommitReminder(user!.id)) {
        setShowCommitReminderModal(true);
      } else if (!hasCompleted && shouldShowFirstUpload(user!.id)) {
        setShowFirstUploadDialog(true);
      } else if (isFirstBook && shouldShowPostListing(user!.id)) {
        setShowPostListingDialog(true);
      } else {
        setShowShareProfileDialog(true);
      }
      if (!hasCompleted) await markFirstUploadCompleted(user!.id).catch(() => {});
    } catch {
      setShowShareProfileDialog(true);
    }
  };

  // ── Tab change ────────────────────────────────────────────────────────────
  const handleTabChange = (tab: ListingCategory) => {
    setActiveCategory(tab);
    setErrors({});
    setItemImages(initialImages);
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p>You need to be signed in to create a listing.</p>
        </div>
      </Layout>
    );
  }

  const submitLabel = activeCategory === "book" ? "📚 List Book" : activeCategory === "uniform" ? "👕 List Uniform" : "🎒 List Supply";

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-8 py-4 md:py-8 max-w-5xl">
        <BackButton
          fallbackPath="/listings"
          className={`mb-4 md:mb-6 text-book-600 hover:text-book-700 ${isMobile ? "h-10" : ""}`}
        >
          {isMobile ? "" : "Back"}
        </BackButton>

        <BankingRequirementCheck onCanProceed={() => {}}>
          {(canListItems === false || hasPhoneNumber === false) && !isCheckingRequirements ? (
            <div className="max-w-2xl mx-auto space-y-6 bg-white p-6 md:p-8 rounded-lg shadow-md border border-amber-100">
              <div className="text-center space-y-2 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Action Required Before Listing</h2>
                <p className="text-gray-600">Please complete the required information before listing items.</p>
              </div>

              {!hasPhoneNumber && (
                <Alert className="bg-red-50 border-red-200 text-red-900 mb-6">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <AlertTitle className="font-bold">Phone Number Required</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>A phone number is required for courier collection purposes. You cannot list items without one.</p>
                    <Button 
                      onClick={() => navigate("/profile")}
                      className="bg-red-600 hover:bg-red-700 text-white mt-2"
                    >
                      Add Phone Number to Profile
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {canListItems === false && (
                <>
                  <Alert className="bg-amber-50 border-amber-200 text-amber-900 mb-6">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="font-bold">Locker Information Needed</AlertTitle>
                    <AlertDescription>
                      Please search for and save a Pudo locker below. This is where you will drop off your items once they are sold. <strong>You must click "Save to Profile" on your chosen locker.</strong>
                    </AlertDescription>
                  </Alert>
                  <PudoLockerSelector
                    onLockerSelect={(locker) => {
                      if (locker) {
                        requirementsCheckDoneRef.current = false;
                        setIsCheckingRequirements(true);
                        setTimeout(() => {
                          setSavedLocker(locker);
                          setCanListItems(true);
                          setIsCheckingRequirements(false);
                        }, 500);
                      }
                    }}
                    title="Select & Save Your Pudo Locker"
                    description="Search for an address to find nearby Pudo lockers, then click 'Save to Profile'."
                  />
                </>
              )}
            </div>
          ) : (
            <div className={`bg-white rounded-lg shadow-md ${isMobile ? "p-4" : "p-8"}`}>
              {/* ─── Page Header ─── */}
              <div className="text-center mb-6">
                <h1 className="text-xl md:text-3xl font-bold text-book-800">Create New Listing</h1>
                <p className="text-gray-500 text-sm mt-1">List your books, uniforms, or school supplies for other students to find.</p>
              </div>

              {/* ─── Category Tabs ─── */}
              <div className="flex items-center justify-center mb-8">
                <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  {LISTING_TABS.map((tab, i) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleTabChange(tab.key)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all",
                        i > 0 && "border-l border-gray-200",
                        activeCategory === tab.key
                          ? "bg-book-600 text-white shadow-inner"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Form ─── */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Book form */}
                {activeCategory === "book" && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                    <BookInformationForm
                      formData={bookFormData}
                      errors={errors}
                      onInputChange={handleBookInputChange}
                    />
                    <div className="space-y-4">
                      <PricingSection
                        formData={bookFormData}
                        errors={errors}
                        onInputChange={handleBookInputChange}
                      />
                      <BookTypeSection
                        bookType={bookType}
                        formData={bookFormData}
                        errors={errors}
                        onBookTypeChange={handleBookTypeChange}
                        onSelectChange={handleBookSelectChange}
                      />
                    </div>
                  </div>
                )}

                {/* Uniform form */}
                {activeCategory === "uniform" && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                    <UniformInformationForm
                      formData={uniformFormData}
                      errors={errors}
                      onInputChange={handleUniformInputChange}
                      onSelectChange={handleUniformSelectChange}
                    />
                    <div className="space-y-4">
                      <PricingSection
                        formData={uniformFormData as any}
                        errors={errors}
                        onInputChange={handleUniformInputChange}
                      />
                    </div>
                  </div>
                )}

                {/* School Supply form */}
                {activeCategory === "school_supply" && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                    <SchoolSupplyInformationForm
                      formData={supplyFormData}
                      errors={errors}
                      onInputChange={handleSupplyInputChange}
                      onSelectChange={handleSupplySelectChange}
                    />
                    <div className="space-y-4">
                      <PricingSection
                        formData={supplyFormData as any}
                        errors={errors}
                        onInputChange={handleSupplyInputChange}
                      />
                    </div>
                  </div>
                )}

                {/* ─── Parcel Size — always shown, must select each time ─── */}
                <div className="border-t pt-6">
                  <ParcelSizeSelector
                    value={
                      activeCategory === "book" ? bookParcelSize :
                      activeCategory === "uniform" ? uniformFormData.parcelSize :
                      supplyFormData.parcelSize
                    }
                    onChange={(size) => {
                      if (errors.parcelSize) setErrors((prev) => ({ ...prev, parcelSize: "" }));
                      if (activeCategory === "book") setBookParcelSize(size);
                      else if (activeCategory === "uniform") setUniformFormData((prev) => ({ ...prev, parcelSize: size }));
                      else setSupplyFormData((prev) => ({ ...prev, parcelSize: size }));
                    }}
                    error={errors.parcelSize}
                  />
                </div>

                {/* ─── Photos ─── */}
                <div className="border-t pt-6">
                  <EnhancedMobileImageUpload
                    currentImages={itemImages}
                    onImagesChange={(images) => setItemImages(images as typeof itemImages)}
                    variant="object"
                    maxImages={5}
                    onAllRequiredImagesReady={() => {}}
                    itemType={activeCategory === "book" ? "book" : activeCategory === "uniform" ? "uniform" : "school_supply"}
                  />
                  {(errors.frontCover || errors.backCover || errors.insidePages) && (
                    <div className="mt-2 space-y-1">
                      {errors.frontCover && <p className={`${isMobile ? "text-xs" : "text-sm"} text-red-500`}>{errors.frontCover}</p>}
                      {errors.backCover && <p className={`${isMobile ? "text-xs" : "text-sm"} text-red-500`}>{errors.backCover}</p>}
                      {errors.insidePages && <p className={`${isMobile ? "text-xs" : "text-sm"} text-red-500`}>{errors.insidePages}</p>}
                    </div>
                  )}
                </div>

                {/* ─── Submit ─── */}
                <Button
                  type="submit"
                  disabled={isSubmitting || isCheckingRequirements || canListItems === false}
                  className="w-full transition-all duration-200 font-semibold bg-book-600 hover:bg-book-700 hover:shadow-lg active:scale-[0.98] text-white py-4 h-12 md:h-14 md:text-lg touch-manipulation rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Listing...</>
                  ) : isCheckingRequirements ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking Requirements...</>
                  ) : canListItems === false ? (
                    "❌ Locker Selection Required"
                  ) : submitLabel}
                </Button>
              </form>
            </div>
          )}

          {/* ─── Post-listing dialogs ─── */}
          <FirstUploadSuccessDialog
            isOpen={showFirstUploadDialog}
            onClose={async () => {
              setShowFirstUploadDialog(false);
              markPopupAsShown(user.id, 'firstUploadShown');
              try {
                const isFirstBook = await isFirstBookListing(user.id);
                if (isFirstBook && shouldShowPostListing(user.id)) {
                  setShowPostListingDialog(true);
                } else {
                  setShowShareProfileDialog(true);
                }
              } catch {
                setShowShareProfileDialog(true);
              }
            }}
            onShareProfile={() => {
              setShowFirstUploadDialog(false);
              setShowShareProfileDialog(true);
            }}
          />
          <PostListingSuccessDialog
            isOpen={showPostListingDialog}
            onClose={() => {
              setShowPostListingDialog(false);
              markPopupAsShown(user.id, 'postListingShown');
            }}
            onShareProfile={() => {
              setShowPostListingDialog(false);
              markPopupAsShown(user.id, 'postListingShown');
              setShowShareProfileDialog(true);
            }}
          />
          <ShareProfileDialog
            isOpen={showShareProfileDialog}
            onClose={() => setShowShareProfileDialog(false)}
            userId={user?.id || ""}
            userName={[(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(" ") || profile?.name || "Your"}
            isOwnProfile={true}
          />
          <CommitReminderModal
            isOpen={showCommitReminderModal}
            onClose={() => {
              setShowCommitReminderModal(false);
              markPopupAsShown(user.id, 'commitReminderShown');
              handlePostListingFlow();
            }}
            type="seller"
          />
        </BankingRequirementCheck>
      </div>
    </Layout>
  );
};

export default CreateListing;
