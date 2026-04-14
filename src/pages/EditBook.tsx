import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookSchema, BookInput } from "@/schemas/bookSchema";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/Layout";
import BackButton from "@/components/ui/BackButton";
import EnhancedMobileImageUpload from "@/components/EnhancedMobileImageUpload";
import { getBookById } from "@/services/book/bookQueries";
import { updateBook } from "@/services/book/bookMutations";
import { getCategoriesByBookType, READER_CATEGORIES, SCHOOL_CATEGORIES, UNIVERSITY_CATEGORIES } from "@/constants/bookTypeCategories";
import { BookInformationForm } from "@/components/create-listing/BookInformationForm";
import { PricingSection } from "@/components/create-listing/PricingSection";
import { BookTypeSection } from "@/components/create-listing/BookTypeSection";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const EditBook = () => {
  const navigate = useNavigate();
  const { id: bookId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookItemType, setBookItemType] = useState<"textbook" | "reader" | null>(null);
  const [bookType, setBookType] = useState<"school" | "university" | "reader">("school");

  // State for formData-style approach matching CreateListing
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    price: 0,
    condition: "Good" as string,
    category: "",
    itemType: "textbook" as "textbook" | "reader",
    grade: "",
    universityYear: "",
    university: "",
    genre: "",
    quantity: 1,
    curriculum: undefined as string | undefined,
    isbn: undefined as string | undefined,
  });

  const [bookImages, setBookImages] = useState({
    frontCover: "",
    backCover: "",
    insidePages: "",
    extra1: "",
    extra2: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadBookData = async () => {
      if (!bookId) {
        setError("Book ID is missing from the URL");
        setIsLoading(false);
        return;
      }

      if (!user) {
        setError("You must be logged in to edit books");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const bookData = await getBookById(bookId);

        if (bookData) {
          if (bookData.seller.id !== user.id) {
            setError("You are not authorized to edit this book");
            setIsLoading(false);
            return;
          }

          const rawItemType = bookData.itemType || "textbook";
          const itemType: "textbook" | "reader" = rawItemType === "reader" ? "reader" : "textbook";
          setBookItemType(itemType);

          // Determine book type from item data
          if (itemType === "reader") {
            setBookType("reader");
          } else if ((bookData as any).university || (bookData as any).universityYear) {
            setBookType("university");
          } else {
            setBookType("school");
          }

          setFormData({
            title: bookData.title,
            author: bookData.author,
            description: bookData.description,
            price: bookData.price,
            condition: bookData.condition || "Good",
            category: bookData.category,
            itemType: itemType as "textbook" | "reader",
            grade: (bookData as any).grade || "",
            universityYear: (bookData as any).universityYear || "",
            university: (bookData as any).university || "",
            genre: (bookData as any).genre || "",
            quantity: bookData.availableQuantity || 1,
            curriculum: (bookData.curriculum || undefined) as "CAPS" | "Cambridge" | "IEB" | undefined,
            isbn: (bookData as any).isbn || "",
          });

          const additionalImages = Array.isArray(bookData.additionalImages) ? bookData.additionalImages : [];
          setBookImages({
            frontCover: bookData.frontCover || "",
            backCover: bookData.backCover || "",
            insidePages: bookData.insidePages || "",
            extra1: additionalImages[0] || "",
            extra2: additionalImages[1] || "",
          });
        } else {
          setError("Book not found");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load book data";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookData();
  }, [bookId, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === "price") {
      const numericValue = parseFloat(value);
      processedValue = isNaN(numericValue) ? 0 : numericValue;
    }
    setFormData({ ...formData, [name]: processedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleBookTypeChange = (type: "school" | "university" | "reader") => {
    setBookType(type);
    const newItemType: "textbook" | "reader" = type === "reader" ? "reader" : "textbook";
    setFormData({
      ...formData,
      category: "",
      itemType: newItemType,
      grade: "",
      universityYear: "",
      university: "",
      genre: "",
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.author.trim()) newErrors.author = "Author is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.price || formData.price <= 0) newErrors.price = "Valid price is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.quantity || formData.quantity < 1) newErrors.quantity = "Quantity must be at least 1";
    if (bookType === "school" && !formData.grade) newErrors.grade = "Grade is required";
    if (bookType === "school" && !formData.curriculum) newErrors.curriculum = "Curriculum is required";
    if (bookType === "university" && !formData.universityYear) newErrors.universityYear = "University Year is required";
    if (bookType === "reader" && !formData.genre) newErrors.genre = "Genre is required";
    if (!bookImages.frontCover) newErrors.frontCover = "Front cover photo is required";
    if (!bookImages.backCover) newErrors.backCover = "Back cover photo is required";
    if (!bookImages.insidePages) newErrors.insidePages = "Inside pages photo is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!bookId) { toast.error("Book ID is missing"); return; }
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const additionalImages = [bookImages.extra1, bookImages.extra2].filter(Boolean);
      const updatedBook = await updateBook(bookId, {
        title: formData.title,
        author: formData.author,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        curriculum: formData.curriculum as any,
        isbn: formData.isbn,
        quantity: formData.quantity,
        frontCover: bookImages.frontCover,
        backCover: bookImages.backCover,
        insidePages: bookImages.insidePages,
        additionalImages,
      });

      if (updatedBook) {
        toast.success("Book updated successfully!");
        navigate("/profile");
      } else {
        toast.error("Failed to update book");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update book";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <BackButton fallbackPath="/profile" className={`mb-4 md:mb-6 text-book-600 hover:text-book-700 ${isMobile ? "h-10" : ""}`}>
            {isMobile ? "" : "Back"}
          </BackButton>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Cannot Edit Book</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => navigate("/profile")}>Go to Profile</Button>
              <Button variant="outline" onClick={() => navigate("/textbooks")}>Browse Books</Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <BackButton fallbackPath="/profile" className={`mb-4 md:mb-6 text-book-600 hover:text-book-700 ${isMobile ? "h-10" : ""}`}>
            {isMobile ? "" : "Back"}
          </BackButton>
          <div className={`bg-white rounded-lg shadow-md ${isMobile ? "p-4" : "p-8"}`}>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-10 w-full bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-10 w-full bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-8 py-4 md:py-8 max-w-5xl">
        <BackButton
          fallbackPath="/profile"
          className={`mb-4 md:mb-6 text-book-600 hover:text-book-700 ${isMobile ? "h-10" : ""}`}
        >
          {isMobile ? "" : "Back"}
        </BackButton>

        <div className={`bg-white rounded-lg shadow-md ${isMobile ? "p-4" : "p-8"}`}>
          <h1 className="text-xl md:text-3xl font-bold text-book-800 text-center mb-6">
            Update Listing
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <BookInformationForm
                formData={{ ...formData, imageUrl: bookImages.frontCover || "" } as any}
                errors={errors}
                onInputChange={handleInputChange}
              />

              <div className="space-y-3 md:space-y-4">
                <PricingSection
                  formData={{ ...formData, imageUrl: bookImages.frontCover || "" } as any}
                  errors={errors}
                  onInputChange={handleInputChange}
                />

                <BookTypeSection
                  bookType={bookType}
                  formData={{ ...formData, imageUrl: bookImages.frontCover || "" } as any}
                  errors={errors}
                  onBookTypeChange={handleBookTypeChange}
                  onSelectChange={handleSelectChange}
                />
              </div>
            </div>

            <div>
              <EnhancedMobileImageUpload
                currentImages={bookImages}
                onImagesChange={(images) =>
                  setBookImages(images as typeof bookImages)
                }
                variant="object"
                maxImages={5}
              />
              {(errors.frontCover || errors.backCover || errors.insidePages) && (
                <div className="mt-2 space-y-1">
                  {errors.frontCover && <p className={`${isMobile ? "text-xs" : "text-sm"} text-red-500`}>{errors.frontCover}</p>}
                  {errors.backCover && <p className={`${isMobile ? "text-xs" : "text-sm"} text-red-500`}>{errors.backCover}</p>}
                  {errors.insidePages && <p className={`${isMobile ? "text-xs" : "text-sm"} text-red-500`}>{errors.insidePages}</p>}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full transition-all duration-200 font-semibold bg-book-600 hover:bg-book-700 hover:shadow-lg active:scale-[0.98] text-white py-4 h-12 md:h-14 md:text-lg touch-manipulation rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Listing...
                </>
              ) : (
                "📚 Update Listing"
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditBook;
