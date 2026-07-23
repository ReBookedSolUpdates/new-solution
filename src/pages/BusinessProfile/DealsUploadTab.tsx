import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Percent,
  Layers,
  Edit,
  Trash2,
  AlertCircle,
  UploadCloud,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Eye,
} from "lucide-react";

interface BulkItemRow {
  id: string;
  title: string;
  author: string;
  itemType: "textbook" | "reader" | "uniform" | "school_supply";
  condition: "New" | "Good" | "Better" | "Average" | "Below Average";
  category: string;
  price: number;
  quantity: number;
  grade?: string;
  description?: string;
}

interface DealsUploadTabProps {
  isTier1: boolean;
}

export const DealsUploadTab: React.FC<DealsUploadTabProps> = ({ isTier1 }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Inventory & filter states
  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Bulk upload states
  const [uploadMethod, setUploadMethod] = useState<"grid" | "csv">("grid");
  const [manualRows, setManualRows] = useState<BulkItemRow[]>([
    {
      id: "1",
      title: "",
      author: "",
      itemType: "textbook",
      condition: "Good",
      category: "High School",
      price: 0,
      quantity: 1,
      grade: "Grade 10",
      description: "",
    },
  ]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [csvRequirementsExpanded, setCsvRequirementsExpanded] = useState(false);

  // Deal modal states
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealTargetType, setDealTargetType] = useState("all");
  const [dealBookId, setDealBookId] = useState<string | null>(null);
  const [dealDiscountType, setDealDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [dealValue, setDealValue] = useState<number>(0);

  // Load seller listings
  const fetchListings = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*, listing_views(id)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map views length
      const mapped = (data || []).map((b: any) => ({
        ...b,
        views: b.listing_views?.length || 0,
      }));

      setListings(mapped);
    } catch (err: any) {
      toast.error("Failed to load listings: " + err.message);
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user]);

  // Edit list handler
  const handleEditBook = (bookId: string, itemType: string) => {
    const targetItem = listings.find((b) => b.id === bookId);
    const isOutOfStock = targetItem ? (targetItem.available_quantity || 0) === 0 : false;

    if (isOutOfStock && !isTier1) {
      toast.error("Restock & republish is a Tier 1 feature. Upgrade or create a new listing for this item.", {
        duration: 5000,
      });
      return;
    }

    if (itemType === "uniform") {
      navigate(`/edit-uniform/${bookId}`);
    } else if (itemType === "school_supply") {
      navigate(`/edit-supply/${bookId}`);
    } else {
      navigate(`/edit-book/${bookId}`);
    }
  };

  // Delete list handler
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      const { error } = await supabase.from("books").delete().eq("id", bookId);
      if (error) throw error;
      toast.success("Listing deleted successfully");
      fetchListings();
    } catch (err: any) {
      toast.error("Failed to delete listing: " + err.message);
    }
  };

  // Apply deal pricing changes to DB
  const handleApplyDeal = async (bookId: string, type: "percentage" | "fixed", value: number) => {
    try {
      const book = listings.find((b) => b.id === bookId);
      if (!book) return;

      const basePrice = book.original_price ? Number(book.original_price) : Number(book.price);
      let discountedPrice = basePrice;

      if (type === "percentage") {
        discountedPrice = basePrice * (1 - value / 100);
      } else {
        discountedPrice = Math.max(0, basePrice - value);
      }

      discountedPrice = Math.round(discountedPrice * 100) / 100;

      const { error } = await supabase
        .from("books")
        .update({
          price: discountedPrice,
          original_price: basePrice,
        })
        .eq("id", bookId);

      if (error) throw error;

      toast.success("Deal applied successfully!");
      fetchListings();
    } catch (error: any) {
      toast.error("Failed to apply deal: " + error.message);
    }
  };

  // Remove deal from listing
  const handleRemoveDeal = async (bookId: string) => {
    try {
      const book = listings.find((b) => b.id === bookId);
      if (!book || !book.original_price) return;

      const { error } = await supabase
        .from("books")
        .update({
          price: book.original_price,
          original_price: null,
        })
        .eq("id", bookId);

      if (error) throw error;

      toast.success("Deal removed successfully!");
      fetchListings();
    } catch (error: any) {
      toast.error("Failed to remove deal: " + error.message);
    }
  };

  // Bulk Manual Grid Rows Actions
  const addManualRow = () => {
    const nextId = (manualRows.length + 1).toString();
    setManualRows([
      ...manualRows,
      {
        id: nextId,
        title: "",
        author: "",
        itemType: "textbook",
        condition: "Good",
        category: "High School",
        price: 0,
        quantity: 1,
        grade: "Grade 10",
        description: "",
      },
    ]);
  };

  const removeManualRow = (id: string) => {
    if (manualRows.length === 1) return;
    setManualRows(manualRows.filter((row) => row.id !== id));
  };

  const updateManualRow = (id: string, field: keyof BulkItemRow, value: any) => {
    setManualRows(
      manualRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // CSV Drag and Drop Parser
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      
      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const row = [];
        let insideQuote = false;
        let entry = "";
        
        for (let char of lines[i]) {
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === "," && !insideQuote) {
            row.push(entry.trim());
            entry = "";
          } else {
            entry += char;
          }
        }
        row.push(entry.trim());

        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = row[index] || "";
        });

        const imageUrl1 = item.image_url_1 || item.image_url || item.image_1 || "";
        const additionalImages = [
          item.image_url_2 || item.image_2 || "",
          item.image_url_3 || item.image_3 || "",
          item.image_url_4 || item.image_4 || "",
          item.image_url_5 || item.image_5 || "",
          item.image_url_6 || item.image_6 || "",
        ].filter(Boolean);

        parsedData.push({
          title: item.title || "",
          author: item.author || "",
          itemType: (item.itemtype || "textbook").toLowerCase(),
          condition: item.condition || "Good",
          category: item.category || "High School",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          grade: item.grade || "",
          description: item.description || "",
          imageUrl1: imageUrl1,
          additionalImages: additionalImages,
        });
      }
      setCsvPreview(parsedData);
      toast.success(`Successfully parsed ${parsedData.length} items from CSV`);
    };
    reader.readAsText(file);
  };

  // Submit Bulk Uploads to Database
  const handleBulkSubmit = async () => {
    if (!user) return;
    setIsBulkUploading(true);

    try {
      let province = null;
      let pickupAddress = null;

      if (profile?.preferred_delivery_locker_data) {
        const lockerData = profile.preferred_delivery_locker_data as any;
        if (lockerData.id && lockerData.name) {
          province = lockerData.province || null;
        }
      }

      if (!province) {
        const { data: encryptedAddressData } = await supabase.functions.invoke("decrypt-address", {
          body: {
            fetch: {
              table: "profiles",
              target_id: user.id,
              address_type: "pickup",
            },
          },
        });

        if (encryptedAddressData?.success && encryptedAddressData?.data) {
          pickupAddress = encryptedAddressData.data;
          province = pickupAddress.province || null;
        }
      }

      const itemsToUpload = uploadMethod === "grid" ? manualRows : csvPreview;

      if (itemsToUpload.length === 0 || (uploadMethod === "grid" && !itemsToUpload[0].title)) {
        toast.error("Please add at least one valid listing before uploading");
        setIsBulkUploading(false);
        return;
      }

      const listingsData = itemsToUpload.map((item) => ({
        seller_id: user.id,
        title: item.title,
        author: item.author || null,
        item_type: item.itemType || "textbook",
        condition: item.condition || "Good",
        category: item.category || "Other",
        price: Number(item.price) || 0,
        initial_quantity: Number(item.quantity) || 1,
        available_quantity: Number(item.quantity) || 1,
        sold_quantity: 0,
        description: item.description || `Verified business listing for ${item.title}`,
        grade: item.grade || null,
        province: province,
        image_url: item.imageUrl1 || "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop&auto=format&q=80",
        additional_images: item.additionalImages || [],
        sold: false,
      }));

      const { data: createdListings, error: uploadError } = await supabase
        .from("books")
        .insert(listingsData)
        .select();

      if (uploadError) throw uploadError;

      // Encrypt pickup address for each book listing
      if (pickupAddress && createdListings) {
        for (const item of createdListings) {
          await supabase.functions.invoke("encrypt-address", {
            body: {
              object: pickupAddress,
              save: {
                table: "books",
                target_id: item.id,
                address_type: "pickup",
              },
            },
          }).catch(() => {});
        }
      }

      toast.success(`Successfully uploaded ${listingsData.length} listings in bulk!`);
      
      // Reset rows
      setManualRows([
        {
          id: "1",
          title: "",
          author: "",
          itemType: "textbook",
          condition: "Good",
          category: "High School",
          price: 0,
          quantity: 1,
          grade: "Grade 10",
          description: "",
        },
      ]);
      setCsvFile(null);
      setCsvPreview([]);
      fetchListings();
    } catch (error: any) {
      toast.error("Failed to complete bulk listing: " + error.message);
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Submit Deal Modal (Single / Category-wide bulk deals)
  const handleApplyDealModal = async () => {
    if (dealValue <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    try {
      if (dealBookId) {
        // Individual book update
        await handleApplyDeal(dealBookId, dealDiscountType, dealValue);
        setDealModalOpen(false);
        setDealBookId(null);
        setDealValue(0);
        return;
      }

      // Bulk update matching dealTargetType
      const targetBooks = listings.filter(
        (b) => dealTargetType === "all" || b.item_type === dealTargetType
      );

      if (targetBooks.length === 0) {
        toast.error(`No items found matching the category "${dealTargetType}"`);
        return;
      }

      let successCount = 0;
      for (const book of targetBooks) {
        const basePrice = book.original_price ? Number(book.original_price) : Number(book.price);
        let discountedPrice = basePrice;

        if (dealDiscountType === "percentage") {
          discountedPrice = basePrice * (1 - dealValue / 100);
        } else {
          discountedPrice = Math.max(0, basePrice - dealValue);
        }

        discountedPrice = Math.round(discountedPrice * 100) / 100;

        const { error } = await supabase
          .from("books")
          .update({
            price: discountedPrice,
            original_price: basePrice,
          })
          .eq("id", book.id);

        if (!error) successCount++;
      }

      toast.success(`Successfully applied deals to ${successCount} items!`);
      setDealModalOpen(false);
      setDealValue(0);
      fetchListings();
    } catch (err: any) {
      toast.error("Failed to apply category deal: " + err.message);
    }
  };

  // Filter listings based on input
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.item_type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. STOCK CREATION & LISTING ACTIONS */}
      <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Plus className="h-5 w-5 text-book-600" /> Create & Upload New Stock
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Add new items to your business catalog using our step-by-step listing creator.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => navigate("/create-listing")}
                className="bg-book-600 hover:bg-book-700 text-white font-semibold text-xs rounded-xl h-10 px-5 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Listing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>




      {/* CSV Bulk Upload & Column Structure Guidance Section */}
      <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-book-600" /> Bulk CSV Upload Inventory
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload your catalog in bulk using a standard CSV file.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCsvRequirementsExpanded(!csvRequirementsExpanded)}
              className="text-xs rounded-xl flex items-center gap-1 border-gray-300"
            >
              {csvRequirementsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {csvRequirementsExpanded ? "Hide CSV Format Specs" : "View Required CSV Format Specs"}
            </Button>
          </div>

          {/* Expandable CSV Column Structure Section */}
          {csvRequirementsExpanded && (
            <div className="p-4 bg-book-50/50 border border-book-200 rounded-xl space-y-3 text-xs">
              <h4 className="font-bold text-book-900 text-xs uppercase tracking-wider">Required CSV Columns & Header Names:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700 font-mono text-[11px]">
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">title</span> (Required) - Name of the item/book
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">price</span> (Required) - Item price in ZAR (e.g. 150.00)
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">author</span> (Optional) - Book author or brand
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">itemtype</span> (Optional) - textbook, reader, uniform, school_supply
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">condition</span> (Optional) - New, Good, Better, Average
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">quantity</span> (Optional) - Available stock count (e.g. 5)
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">grade</span> (Optional) - e.g. Grade 10, Grade 11
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-book-100">
                  <span className="font-bold text-book-700">image_url_1</span> (Optional) - Direct URL link to photo
                </div>
              </div>
              <div className="pt-2 border-t border-book-100">
                <span className="font-bold text-gray-800">Sample Row Header Format:</span>
                <pre className="bg-gray-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto text-[11px] mt-1">
title,author,itemtype,condition,price,quantity,grade,image_url_1
"Grade 10 Mathematics CAPS","J. Smith",textbook,Good,180.00,3,"Grade 10","https://example.com/cover.jpg"
                </pre>
              </div>
            </div>
          )}

          {/* File Input & Upload Trigger */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-book-50 file:text-book-700 hover:file:bg-book-100"
            />
            {csvPreview.length > 0 && (
              <Button
                onClick={handleBulkSubmit}
                disabled={isBulkUploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-4 ml-auto"
              >
                {isBulkUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Upload {csvPreview.length} CSV Items
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Percent className="h-5 w-5 text-red-500" /> Trade Deals & Catalog Inventory
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Manage discounts or individual listings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
              <Input
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-48 rounded-xl h-9 text-xs border-gray-300"
              />
              <select
                className="border rounded-xl px-2 py-1.5 text-xs outline-none bg-white border-gray-350 h-9 font-semibold text-gray-700"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="textbook">Textbooks</option>
                <option value="reader">Readers</option>
                <option value="uniform">Uniforms</option>
                <option value="school_supply">Supplies</option>
              </select>
              {isTier1 && (
                <Button
                  onClick={() => {
                    setDealBookId(null);
                    setDealTargetType("all");
                    setDealDiscountType("percentage");
                    setDealValue(0);
                    setDealModalOpen(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs h-9 px-4 shrink-0"
                >
                  Category Bulk Deal
                </Button>
              )}
            </div>
          </div>

          {loadingListings ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-10">
              <Layers className="h-12 w-12 text-gray-350 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No catalog items matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-150 rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-400 uppercase font-bold border-b">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock Qty</th>
                    <th className="p-3">Traffic</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredListings.map((book) => {
                    const hasActiveDeal = !!book.original_price && book.original_price > book.price;
                    return (
                      <tr key={book.id} className="hover:bg-gray-50/50">
                        <td className="p-3 flex items-center gap-3 min-w-[200px]">
                          <img
                            src={book.image_url || book.front_cover}
                            alt={book.title}
                            className="w-10 h-10 object-cover rounded-lg shrink-0 border"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 truncate w-40 sm:w-48">
                              {book.title}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate capitalize">
                              {book.item_type} • {book.category}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          {hasActiveDeal ? (
                            <div>
                              <span className="text-[10px] text-gray-400 line-through">
                                R{book.original_price}
                              </span>
                              <span className="font-bold text-red-650 ml-1">R{book.price}</span>
                            </div>
                          ) : (
                            <span className="font-bold text-gray-900">R{book.price}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold ${book.available_quantity === 0 ? "text-red-600 bg-red-50" : "text-gray-800 bg-gray-100"} px-2.5 py-0.5 rounded-full`}>
                            {book.available_quantity} available
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-gray-800 flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5 text-gray-450" /> {book.views}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasActiveDeal ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveDeal(book.id)}
                                className="text-red-650 hover:bg-red-50 text-[10px] font-bold px-2 rounded-lg h-7"
                              >
                                Remove Deal
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDealBookId(book.id);
                                  setDealTargetType(book.item_type || "all");
                                  setDealDiscountType("percentage");
                                  setDealValue(0);
                                  setDealModalOpen(true);
                                }}
                                className="text-book-650 hover:bg-book-50 text-[10px] font-bold px-2 rounded-lg h-7"
                              >
                                Apply Deal
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditBook(book.id, book.item_type)}
                              className="h-8 w-8 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBook(book.id)}
                              className="h-8 w-8 text-red-650 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. PROMO DISCOUNTS DIALOG MODAL */}
      <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-gray-150 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Percent className="h-5 w-5 text-book-600" /> Configure Trade Deal
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Apply pricing adjustments to selected categories or individual listings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs">
            {/* Target Select if bulk — Tier 1 only */}
            {!dealBookId && (
              isTier1 ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Target Item Category</Label>
                  <select
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-book-500 outline-none bg-white border-gray-250 font-medium"
                    value={dealTargetType}
                    onChange={(e) => setDealTargetType(e.target.value)}
                  >
                    <option value="all">All Inventory</option>
                    <option value="textbook">Textbook</option>
                    <option value="reader">Reader</option>
                    <option value="uniform">Uniform</option>
                    <option value="school_supply">School Supply</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">
                    <strong>Bulk deals</strong> are a Tier 1 feature. You can still apply a deal to this individual item.
                  </p>
                </div>
              )
            )}

            {/* Discount Type Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Discount Pricing Model</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDealDiscountType("percentage")}
                  className={`py-2 text-xs font-bold border rounded-xl text-center transition-all ${
                    dealDiscountType === "percentage"
                      ? "border-book-600 bg-book-50 text-book-700 font-bold"
                      : "border-gray-250 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Percentage Off (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDealDiscountType("fixed")}
                  className={`py-2 text-xs font-bold border rounded-xl text-center transition-all ${
                    dealDiscountType === "fixed"
                      ? "border-book-600 bg-book-50 text-book-700 font-bold"
                      : "border-gray-250 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Fixed Rand Off (R)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deal-val" className="text-xs font-semibold text-gray-700">
                Discount Value {dealDiscountType === "percentage" ? "(%)" : "(ZAR)"}
              </Label>
              <input
                id="deal-val"
                type="number"
                min="1"
                placeholder={dealDiscountType === "percentage" ? "e.g. 15" : "e.g. 50"}
                className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-1 focus:ring-book-500 outline-none border-gray-250 font-medium"
                value={dealValue || ""}
                onChange={(e) => setDealValue(Number(e.target.value))}
              />
              {dealValue > 0 && dealBookId && (() => {
                const targetBook = listings.find((b) => b.id === dealBookId);
                if (!targetBook) return null;
                const originalPrice = targetBook.original_price || targetBook.price;
                const preview = dealDiscountType === "percentage"
                  ? Math.max(0, originalPrice * (1 - dealValue / 100))
                  : Math.max(0, originalPrice - dealValue);
                return (
                  <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mt-1 font-semibold">
                    Preview: <span className="line-through text-gray-400">R{originalPrice}</span> → <strong>R{preview.toFixed(2)}</strong>
                  </p>
                );
              })()}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-600 rounded-xl"
              onClick={() => setDealModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl"
              onClick={handleApplyDealModal}
            >
              Apply Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealsUploadTab;
