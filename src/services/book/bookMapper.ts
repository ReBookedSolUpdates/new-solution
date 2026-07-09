import { Book } from "@/types/book";
import { BookQueryResult } from "./bookTypes";
import { getProvinceFromLocker } from "@/utils/provinceExtractorUtils";

export const mapBookFromDatabase = (bookData: any): Book => {
  const profile = bookData.profiles;

  // Ensure we have required fields
  if (!bookData.id || !bookData.seller_id) {
    throw new Error("Invalid listing data: missing required fields");
  }

  // Determine province: use listing.province, or fall back to seller's locker province
  let province = bookData.province || null;
  if (!province && profile?.preferred_delivery_locker_data) {
    province = getProvinceFromLocker(profile.preferred_delivery_locker_data);
  }

  // Determine item type
  let itemType: Book['itemType'] = 'textbook';
  if (bookData.item_type) {
    itemType = bookData.item_type as any;
  } else if (bookData.school_name && bookData.size) {
    itemType = 'uniform';
  } else if (bookData.subject) {
    itemType = 'school_supply';
  }

  return {
    id: bookData.id,
    title: bookData.title || "",
    author: bookData.author || (itemType === 'uniform' ? bookData.school_name : itemType === 'school_supply' ? bookData.subject : ""),
    description: bookData.description || "",
    price: bookData.price || 0,
    originalPrice: bookData.original_price || undefined,
    category: bookData.category || (itemType === 'uniform' ? 'Uniform' : itemType === 'school_supply' ? 'School Supply' : "Other"),
    condition:
      (bookData.condition as
        | "New"
        | "Good"
        | "Better"
        | "Average"
        | "Below Average") || "Good",
    imageUrl:
      bookData.front_cover ||
      bookData.image_url ||
      (Array.isArray(bookData.additional_images) && bookData.additional_images[0]) ||
      "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop&auto=format&q=80",
    frontCover: bookData.front_cover || undefined,
    backCover: bookData.back_cover || undefined,
    insidePages: bookData.inside_pages || undefined,
    additionalImages: Array.isArray(bookData.additional_images) ? bookData.additional_images : [],
    sold: bookData.sold || false,
    createdAt: bookData.created_at || new Date().toISOString(),
    itemType: itemType,
    grade: bookData.grade,
    genre: bookData.genre || undefined,
    universityYear: bookData.university_year,
    university: bookData.university,
    curriculum: (bookData as any).curriculum || undefined,
    isbn: (bookData as any).isbn || undefined,
    province: province,
    // Uniform/Supply specific fields
    schoolName: bookData.school_name || undefined,
    gender: bookData.gender || undefined,
    size: bookData.size || undefined,
    color: bookData.color || undefined,
    subject: bookData.subject || undefined,
    parcelSize: bookData.parcel_size || undefined,
    // Quantity fields
    initialQuantity: bookData.initial_quantity ?? undefined,
    availableQuantity: bookData.available_quantity ?? undefined,
    soldQuantity: bookData.sold_quantity ?? undefined,
    seller: {
      id: bookData.seller_id,
      full_name: profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || (profile as any).name || "" : "",
      name:
        profile
          ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || (profile as any).name || profile.email?.split("@")[0] || ""
          : "",
      email: profile?.email || "",
      createdAt: (profile as any)?.created_at || undefined,
      is_away: !!(profile as any)?.is_away,
      pickupEnabled: !!profile?.pickup_enabled,
    },
  };
};
