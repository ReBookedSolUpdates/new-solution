import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  User,
  ArrowRight,
  X,
  CheckCircle,
  BookOpen,
  Hash,
  GraduationCap,
  Globe,
  Layers,
  Tag,
  FileText,
} from "lucide-react";
import { CheckoutBook, CheckoutAddress } from "@/types/checkout";
import { supabase } from "@/integrations/supabase/client";

interface Step1OrderSummaryProps {
  book: CheckoutBook;
  sellerAddress: CheckoutAddress | null;
  onNext: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const DetailRow: React.FC<{ label: string; value: string | number | null | undefined; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 font-medium min-w-0 shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-xs sm:text-sm text-gray-800 font-semibold text-right break-words max-w-[65%]">
        {value}
      </span>
    </div>
  );
};

const formatDetailValue = (value: any) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

const humanizeFieldKey = (key: string) => {
  const map: Record<string, string> = {
    itemType: "Item Type",
    item_type: "Item Type",
    schoolName: "School Name",
    school_name: "School Name",
    universityYear: "Year",
    university: "University",
    publisher: "Publisher",
    language: "Language",
    curriculum: "Curriculum",
    parcelSize: "Parcel Size",
    quantity: "Quantity",
    availableQuantity: "Available Quantity",
    available_quantity: "Available Quantity",
    initialQuantity: "Initial Quantity",
    soldQuantity: "Sold Quantity",
    grade: "Grade / Year",
    color: "Color",
    gender: "Gender",
    subject: "Subject",
    category: "Category",
    description: "Description",
  };
  return map[key] || key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const Step1OrderSummary: React.FC<Step1OrderSummaryProps> = ({
  book,
  sellerAddress,
  onNext,
  onCancel,
  loading = false,
}) => {
  const [cartData, setCartData] = useState<any>(null);
  const [sellerFullName, setSellerFullName] = useState<string | null>(null);
  const [sellerCartFullNames, setSellerCartFullNames] = useState<{ [key: string]: string }>({});

  const loadCartData = () => {
    try {
      const cartDataStr = localStorage.getItem('checkoutCart');
      if (cartDataStr) {
        const parsedData = JSON.parse(cartDataStr);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (parsedData.timestamp && parsedData.timestamp > oneHourAgo) {
          setCartData(parsedData);
          return;
        }
      }
    } catch { /* ignore */ }
    setCartData(null);
  };

  useEffect(() => {
    loadCartData();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'checkoutCart' || !e.key) loadCartData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!book.seller_id) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', book.seller_id)
      .single()
      .then(({ data }: { data: any }) => { if (data?.full_name) setSellerFullName(data.full_name); });
  }, [book.seller_id]);

  useEffect(() => {
    if (!cartData?.sellerId) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', cartData.sellerId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.full_name) {
          setSellerCartFullNames(prev => ({ ...prev, [cartData.sellerId]: data.full_name }));
        }
      });
  }, [cartData?.sellerId]);

  const isCartCheckout = cartData?.items && cartData.items.length >= 1;

  const rawDetails = (book as any)?.rawDetails || {};
  const knownDetailKeys = new Set([
    'id', 'title', 'author', 'price', 'condition', 'isbn', 'image_url', 'description', 'category',
    'front_cover', 'additional_images', 'seller_id', 'seller_name', 'seller', 'rawDetails',
    'language', 'publisher', 'curriculum', 'province', 'grade', 'universityYear', 'university',
    'schoolName', 'school_name', 'gender', 'size', 'color', 'subject', 'parcelSize', 'quantity',
    'availableQuantity', 'available_quantity', 'initialQuantity', 'soldQuantity', 'itemType', 'item_type',
  ]);

  const extraDetailEntries = Object.entries(rawDetails)
    .filter(([key, value]) => {
      if (knownDetailKeys.has(key)) return false;
      if (value === null || value === undefined || value === "") return false;
      return true;
    })
    .map(([key, value]) => ({
      key,
      label: humanizeFieldKey(key),
      value: formatDetailValue(value),
    }))
    .filter((detail) => detail.value !== null);

  // Build a badge label for condition
  const conditionColor = (cond: string | undefined) => {
    switch ((cond || '').toLowerCase()) {
      case 'like new': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Order Summary</h1>
        <p className="text-sm sm:text-base text-gray-600">
          {isCartCheckout
            ? `Review your ${cartData.items.length} items from ${cartData.sellerName}`
            : "Review all item details before proceeding"}
        </p>
      </div>

      {/* ── Item Details Card ── */}
      <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl text-gray-900">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            {isCartCheckout ? `Items in Your Order (${cartData.items.length})` : 'Item Details'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {isCartCheckout && cartData ? (
            <div className="space-y-4">
              {cartData.items.map((item: any, index: number) => (
                <div key={item.id || index} className="flex gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="w-16 h-24 flex-shrink-0">
                    <img
                      src={item.imageUrl || item.image_url || "/placeholder.svg"}
                      alt={item.title || "Item cover"}
                      className="w-full h-full object-cover rounded-md border border-gray-200"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">{item.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {item.author && <span className="text-xs text-gray-600">by {item.author}</span>}
                        {item.isbn && <span className="text-xs text-gray-500">ISBN: {item.isbn}</span>}
                        {item.school_name && <span className="text-xs text-gray-500">School: {item.school_name}</span>}
                        {item.size && <span className="text-xs text-gray-500">Size: {item.size}</span>}
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {item.condition && (
                          <Badge className={`text-[10px] px-1.5 h-4 ${conditionColor(item.condition)}`}>{item.condition}</Badge>
                        )}
                        {(item.item_type || item.itemType) && (
                          <Badge className="text-[10px] px-1.5 h-4 bg-gray-100 text-gray-600 border-gray-200">
                            {item.item_type || item.itemType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-green-600 mt-2">
                      R{Number(item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">Total ({cartData.items.length} items):</span>
                  <span className="text-xl sm:text-2xl font-bold text-green-600">
                    R{Number(cartData.totalPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Image + Title Row */}
              <div className="flex gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-24 h-32 flex-shrink-0">
                  <img
                    src={book.image_url || (book as any).imageUrl || "/placeholder.svg"}
                    alt={book.title || "Item cover"}
                    className="w-full h-full object-cover rounded-md border border-gray-200 bg-gray-100"
                    onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-bold text-base sm:text-xl text-gray-900 mb-1">{book.title}</h3>
                    {book.author && (
                      <p className="text-sm text-gray-600 mb-3">by <span className="font-medium text-gray-800">{book.author}</span></p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {book.condition && (
                        <Badge className={`text-xs ${conditionColor(book.condition)}`}>{book.condition}</Badge>
                      )}
                      {book.category && (
                        <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">{book.category}</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 mt-3">
                    R{Number(book.price).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Full Detail Grid */}
              <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 divide-y divide-gray-50">
                {/* Book-specific */}
                <DetailRow label="ISBN" value={book.isbn} icon={<Hash className="w-3.5 h-3.5" />} />
                <DetailRow label="Publisher" value={(book as any).publisher} icon={<BookOpen className="w-3.5 h-3.5" />} />
                <DetailRow label="Language" value={(book as any).language} icon={<Globe className="w-3.5 h-3.5" />} />
                <DetailRow label="Curriculum" value={(book as any).curriculum} icon={<Layers className="w-3.5 h-3.5" />} />
                <DetailRow
                  label="Grade / Year"
                  value={(book as any).grade || (book as any).universityYear}
                  icon={<GraduationCap className="w-3.5 h-3.5" />}
                />
                {/* Uniform-specific */}
                <DetailRow label="School Name" value={(book as any).school_name} icon={<BookOpen className="w-3.5 h-3.5" />} />
                <DetailRow label="Gender" value={(book as any).gender} icon={<Tag className="w-3.5 h-3.5" />} />
                <DetailRow label="Size" value={(book as any).size} icon={<Tag className="w-3.5 h-3.5" />} />
                <DetailRow label="Color" value={(book as any).color} icon={<Tag className="w-3.5 h-3.5" />} />
                {/* Supply-specific */}
                <DetailRow label="Subject" value={(book as any).subject} icon={<BookOpen className="w-3.5 h-3.5" />} />
                <DetailRow label="Quantity Available" value={(book as any).quantity || (book as any).available_quantity} icon={<Hash className="w-3.5 h-3.5" />} />
                {/* Shared */}
                <DetailRow label="Item Type" value={(book as any).itemType || (book as any).item_type} icon={<Tag className="w-3.5 h-3.5" />} />
                <DetailRow label="Province" value={(book as any).province} icon={<Globe className="w-3.5 h-3.5" />} />
              </div>

              {/* Description */}
              {book.description && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900">Description</h4>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{book.description}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Seller Information Card ── */}
      <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl text-gray-900">
            <div className="p-2 bg-green-50 rounded-lg">
              <User className="w-5 h-5 text-green-600" />
            </div>
            Seller Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 sm:p-5 border border-green-100">
            <p className="font-semibold text-gray-900 text-base sm:text-lg mb-1">
              {isCartCheckout
                ? (sellerCartFullNames[cartData.sellerId] || cartData.sellerName)
                : (sellerFullName || book.seller_name)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Seller ID: <span className="font-mono text-gray-600">{isCartCheckout ? cartData.sellerId : book.seller_id}</span>
            </p>
            {isCartCheckout && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium mt-3 pt-3 border-t border-green-100">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                All {cartData.items.length} items from this seller
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Action Buttons ── */}
      <div className="flex gap-3 pt-6 border-t mt-8">
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={loading}
          className="flex-1 px-6 py-3 sm:py-4 text-base font-medium border-2"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>

        <Button
          onClick={onNext}
          disabled={loading}
          className="flex-1 px-8 py-3 sm:py-4 text-base font-semibold bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
          size="lg"
        >
          {loading ? "Loading..." : (
            <>
              Proceed
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Step1OrderSummary;
