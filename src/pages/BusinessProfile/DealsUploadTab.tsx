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
      {/* 1. BULK CATALOG UPLOAD */}
      <Card className="border border-gray-250 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Plus className="h-5 w-5 text-book-600" /> Bulk Catalog Uploader
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-1">
                Upload your stock in bulk via CSV or key them in using the manual grid.
              </p>
            </div>
            <div className="flex gap-1.5 bg-gray-50 border rounded-xl p-0.5 self-start">
              <Button
                variant={uploadMethod === "grid" ? "default" : "ghost"}
                size="sm"
                className={`text-xs font-bold rounded-lg ${uploadMethod === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                onClick={() => setUploadMethod("grid")}
              >
                Manual Grid
              </Button>
              <Button
                variant={uploadMethod === "csv" ? "default" : "ghost"}
                size="sm"
                className={`text-xs font-bold rounded-lg ${uploadMethod === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                onClick={() => setUploadMethod("csv")}
              >
                CSV Upload
              </Button>
            </div>
          </div>

          {uploadMethod === "grid" ? (
            /* MANUAL GRID UPLOADER */
            <div className="space-y-4">
              <div className="overflow-x-auto border border-gray-150 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-400 uppercase font-bold border-b">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">Author</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Condition</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {manualRows.map((row) => (
                      <tr key={row.id}>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Math Grade 10"
                            className="w-full border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-book-500"
                            value={row.title}
                            onChange={(e) => updateManualRow(row.id, "title", e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Author"
                            className="w-full border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-book-500"
                            value={row.author}
                            onChange={(e) => updateManualRow(row.id, "author", e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <select
                            className="border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-book-500 bg-white"
                            value={row.itemType}
                            onChange={(e) => updateManualRow(row.id, "itemType", e.target.value)}
                          >
                            <option value="textbook">Textbook</option>
                            <option value="reader">Reader</option>
                            <option value="uniform">Uniform</option>
                            <option value="school_supply">Supply</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            className="border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-book-500 bg-white"
                            value={row.condition}
                            onChange={(e) => updateManualRow(row.id, "condition", e.target.value)}
                          >
                            <option value="New">New</option>
                            <option value="Good">Good</option>
                            <option value="Better">Better</option>
                            <option value="Average">Average</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            className="w-20 border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-book-500"
                            value={row.price || ""}
                            onChange={(e) => updateManualRow(row.id, "price", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            className="w-16 border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-book-500"
                            value={row.quantity || 1}
                            onChange={(e) => updateManualRow(row.id, "quantity", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeManualRow(row.id)}
                            className="h-8 w-8 text-red-650 hover:bg-red-50 hover:text-red-700 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addManualRow}
                  className="rounded-xl border-gray-300 text-xs font-semibold bg-white"
                >
                  + Add Row
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkSubmit}
                  disabled={isBulkUploading}
                  className="bg-book-600 hover:bg-book-700 text-white font-bold rounded-xl text-xs"
                >
                  {isBulkUploading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                  Submit Bulk Upload ({manualRows.length} items)
                </Button>
              </div>
            </div>
          ) : (
            /* CSV UPLOADER */
            <div className="space-y-4">
              <div className="border border-dashed border-gray-300 p-6 rounded-2xl text-center bg-gray-50/50 relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-xs font-bold text-gray-800">Drag & drop your CSV file here, or click to browse</p>
                <p className="text-[10px] text-gray-400 mt-1">UTF-8 CSV format only. Max 5MB file.</p>
              </div>

              {csvFile && (
                <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-950">
                  <span>Selected: <strong>{csvFile.name}</strong> ({csvPreview.length} items parsed)</span>
                  <Button
                    size="sm"
                    onClick={handleBulkSubmit}
                    disabled={isBulkUploading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] h-8 px-4"
                  >
                    {isBulkUploading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                    Confirm & Upload
                  </Button>
                </div>
              )}

              {/* Requirement rules list */}
              <div className="border rounded-2xl overflow-hidden bg-white border-gray-250">
                <button
                  onClick={() => setCsvRequirementsExpanded(!csvRequirementsExpanded)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 text-xs font-bold text-gray-700"
                >
                  <span>CSV File Structure & Header Requirements</span>
                  {csvRequirementsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {csvRequirementsExpanded && (
                  <div className="p-4 border-t text-xs text-gray-600 space-y-2.5 leading-relaxed bg-white">
                    <p>Make sure your CSV contains the following exact column headers (case-insensitive):</p>
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl font-mono text-[10px] text-gray-800">
                      <div>title (Required)</div>
                      <div>price (Required)</div>
                      <div>author</div>
                      <div>itemtype (textbook, reader, uniform, school_supply)</div>
                      <div>condition (New, Good, Better, Average)</div>
                      <div>quantity (number of items)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. CATALOG INVENTORY & DEALS */}
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
