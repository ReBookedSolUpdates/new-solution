import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/Layout";
import BackButton from "@/components/ui/BackButton";
import EnhancedMobileImageUpload from "@/components/EnhancedMobileImageUpload";
import { getBookById } from "@/services/book/bookQueries";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SOUTH_AFRICAN_SCHOOLS } from "@/constants/schoolNames";
import { ProvinceSelect } from "@/components/create-listing/ProvinceSelect";

const GRADES = ['N/A', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const CONDITIONS = ['New', 'Good', 'Better', 'Average', 'Below Average'];
const SUBJECTS = [
  'Accounting', 'Agricultural Sciences', 'Art', 'Biology', 'Business Studies',
  'Chemistry', 'Computer Applications Technology (CAT)', 'Consumer Studies',
  'Design', 'Dramatic Arts', 'Economics', 'Engineering Graphics & Design (EGD)',
  'English', 'French', 'Geography', 'History', 'Hospitality Studies',
  'Information Technology (IT)', 'Life Orientation', 'Life Sciences',
  'Mathematics', 'Mathematical Literacy', 'Music', 'Physical Sciences',
  'Religion Studies', 'Technical Mathematics', 'Technical Sciences',
  'Tourism', 'Zulu', 'Afrikaans', 'Xhosa', 'Setswana', 'Sesotho',
  'General / Multi-Subject', 'Other',
].sort();

const EditSupply = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: 0,
    condition: "Good" as string,
    subject: "",
    grade: "",
    schoolName: "",
    province: "",
    quantity: 1,
  });

  const [images, setImages] = useState({
    frontCover: "",
    backCover: "",
    insidePages: "",
    extra1: "",
    extra2: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!id) { setError("Item ID is missing"); setIsLoading(false); return; }
      if (!user) { setError("You must be logged in to edit items"); setIsLoading(false); return; }
      try {
        setIsLoading(true);
        const item = await getBookById(id);
        if (!item) { setError("Item not found"); setIsLoading(false); return; }
        if (item.seller?.id !== user.id) { setError("You are not authorized to edit this item"); setIsLoading(false); return; }

        setFormData({
          title: item.title || "",
          description: item.description || "",
          price: item.price || 0,
          condition: item.condition || "Good",
          subject: item.subject || "",
          grade: item.grade || "",
          schoolName: item.schoolName || "",
          province: item.province || "",
          quantity: item.availableQuantity || 1,
        });

        const additionalImages = Array.isArray(item.additionalImages) ? item.additionalImages : [];
        setImages({
          frontCover: item.frontCover || "",
          backCover: item.backCover || "",
          insidePages: item.insidePages || "",
          extra1: additionalImages[0] || "",
          extra2: additionalImages[1] || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load item");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "price" ? (parseFloat(value) || 0) : name === "quantity" ? (parseInt(value) || 1) : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.price || formData.price <= 0) newErrors.price = "Valid price is required";
    if (!formData.condition) newErrors.condition = "Condition is required";
    if (!images.frontCover) newErrors.frontCover = "At least one photo is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !id) return;
    if (!validateForm()) { toast.error("Please fill in all required fields"); return; }

    setIsSubmitting(true);
    try {
      const additionalImages = [images.extra1, images.extra2].filter(Boolean);
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        condition: formData.condition,
        subject: formData.subject || null,
        grade: formData.grade || null,
        school_name: formData.schoolName || null,
        province: formData.province || null,
        available_quantity: Math.max(1, formData.quantity),
        front_cover: images.frontCover || null,
        back_cover: images.backCover || null,
        inside_pages: images.insidePages || null,
        additional_images: additionalImages.length > 0 ? additionalImages : null,
        image_url: images.frontCover || images.backCover || images.insidePages || null,
      };

      const { error: updateError } = await supabase
        .from("school_supplies")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("School supply updated successfully!");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update school supply");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <BackButton fallbackPath="/profile" className="mb-4 md:mb-6">Back</BackButton>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Cannot Edit Supply</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate("/profile")}>Go to Profile</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const inputClass = isMobile ? "h-12 text-base" : "";
  const labelClass = isMobile ? "text-sm" : "text-base";

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-8 py-4 md:py-8 max-w-5xl">
        <BackButton fallbackPath="/profile" className="mb-4 md:mb-6">Back</BackButton>
        <div className={`bg-white rounded-lg shadow-md ${isMobile ? "p-4" : "p-8"}`}>
          <h1 className="text-xl md:text-3xl font-bold text-book-800 text-center mb-6">
            Edit School Supply
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <Label className={`${labelClass} font-medium`}>Item Title <span className="text-red-500">*</span></Label>
                  <Input name="title" value={formData.title} onChange={handleInputChange}
                    placeholder="e.g. Casio FX-991 Calculator, Cricket Bat" className={`${errors.title ? 'border-red-500' : ''} ${inputClass}`} />
                  {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <Label className={`${labelClass} font-medium`}>Description <span className="text-red-500">*</span></Label>
                  <Textarea name="description" value={formData.description} onChange={handleInputChange}
                    placeholder="Describe the item — what it is, its condition, any accessories included, etc."
                    rows={isMobile ? 3 : 4} className={errors.description ? 'border-red-500' : ''} />
                  {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                </div>

                {/* Subject */}
                <div>
                  <Label className={`${labelClass} font-medium`}>Subject <span className="text-gray-400">(Optional)</span></Label>
                  <Select value={formData.subject || ''} onValueChange={(v) => handleSelectChange('subject', v)}>
                    <SelectTrigger><SelectValue placeholder="Select subject (if applicable)" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grade */}
                <div>
                  <Label className={`${labelClass} font-medium`}>Grade <span className="text-gray-400">(Optional)</span></Label>
                  <Select value={formData.grade || ''} onValueChange={(v) => handleSelectChange('grade', v)}>
                    <SelectTrigger><SelectValue placeholder="Select grade (if applicable)" /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* School Name */}
                <div>
                  <Label className={`${labelClass} font-medium`}>School Name <span className="text-gray-400">(Optional)</span></Label>
                  <Select value={formData.schoolName || ''} onValueChange={(v) => handleSelectChange('schoolName', v)}>
                    <SelectTrigger><SelectValue placeholder="Select school (optional)" /></SelectTrigger>
                    <SelectContent>
                      {SOUTH_AFRICAN_SCHOOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Price */}
                <div>
                  <Label className={`${labelClass} font-medium`}>Price (R) <span className="text-red-500">*</span></Label>
                  <Input type="number" name="price" value={formData.price} onChange={handleInputChange}
                    placeholder="0.00" min="0" step="0.01" className={`${errors.price ? 'border-red-500' : ''} ${inputClass}`} />
                  {errors.price && <p className="text-sm text-red-500 mt-1">{errors.price}</p>}
                </div>

                {/* Quantity */}
                <div>
                  <Label className={`${labelClass} font-medium`}>Quantity</Label>
                  <Input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                    placeholder="1" min="1" className={inputClass} />
                </div>

                {/* Condition */}
                <div>
                  <Label className={`${labelClass} font-medium`}>Condition <span className="text-red-500">*</span></Label>
                  <Select value={formData.condition} onValueChange={(v) => handleSelectChange('condition', v)}>
                    <SelectTrigger className={errors.condition ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.condition && <p className="text-sm text-red-500 mt-1">{errors.condition}</p>}
                </div>

                {/* Province */}
                <ProvinceSelect value={formData.province || ''} onChange={(v) => handleSelectChange('province', v)} error={errors.province} />
              </div>
            </div>

            {/* Images */}
            <div>
              <EnhancedMobileImageUpload
                currentImages={images}
                onImagesChange={(imgs) => setImages(imgs as typeof images)}
                variant="object"
                maxImages={5}
                itemType="school_supply"
              />
              {errors.frontCover && <p className="text-sm text-red-500 mt-2">{errors.frontCover}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting}
              className="w-full font-semibold bg-book-600 hover:bg-book-700 text-white py-4 h-12 md:h-14 md:text-lg rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating Supply...</>) : "📦 Update School Supply"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditSupply;
