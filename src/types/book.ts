export interface BookMetadata {
  ai_assisted?: boolean;
  [key: string]: unknown;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  category: string;
  condition: "New" | "Good" | "Better" | "Average" | "Below Average";
  imageUrl: string;
  frontCover?: string;
  backCover?: string;
  insidePages?: string;
  additionalImages?: string[];
  sold: boolean;
  status?: string;
  createdAt: string;
  // Prefer normalized values: 'book' for all book variants, plus uniform and school_supply
  itemType: "book" | "uniform" | "school_supply" | "textbook" | "reader";
  parcelSize?: 'extra_small' | 'small' | 'medium' | 'large' | 'extra_large';
  grade?: string;
  universityYear?: string;
  university?: string;
  curriculum?: 'CAPS' | 'Cambridge' | 'IEB';
  isbn?: string;
  universityBookType?: 'Study Guide' | 'Course Book';
  genre?: string;
  province?: string;
  // Uniform/Supply specific fields
  schoolName?: string;
  gender?: "Male" | "Female" | "Unisex";
  size?: string;
  color?: string;
  subject?: string;
  // Quantity fields
  initialQuantity?: number;
  availableQuantity?: number;
  soldQuantity?: number;
  metadata?: BookMetadata;
  publisher?: string;
  language?: string;
  seller: {
    id: string;
    name: string;
    full_name?: string;
    email: string;
    createdAt?: string;
    is_away?: boolean;
    pickupEnabled?: boolean;
  };
  [key: string]: any;
}

export interface BookFormData {
  title: string;
  author: string;
  description: string;
  price: number;
  category: string;
  condition: "New" | "Good" | "Better" | "Average" | "Below Average";
  imageUrl: string;
  frontCover?: string;
  backCover?: string;
  insidePages?: string;
  additionalImages?: string[];
  itemType: "textbook" | "reader" | "uniform" | "school_supply";
  parcelSize?: 'extra_small' | 'small' | 'medium' | 'large' | 'extra_large';
  grade?: string;
  universityYear?: string;
  university?: string;
  curriculum?: 'CAPS' | 'Cambridge' | 'IEB';
  isbn?: string;
  universityBookType?: 'Study Guide' | 'Course Book';
  genre?: string;
  province?: string;
  // Quantity to create listing with
  quantity?: number;
}
