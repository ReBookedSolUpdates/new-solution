import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Percent,
  Layers,
  Edit,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  UploadCloud,
  Check,
  ChevronDown,
  ChevronUp,
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
  listings: any[];
  filteredListings: any[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (s: string) => void;
  handleEditBook: (id: string, type: string) => void;
  handleRemoveDeal: (id: string) => Promise<void>;
  uploadMethod: "grid" | "csv";
  setUploadMethod: (m: "grid" | "csv") => void;
  manualRows: BulkItemRow[];
  setManualRows: (rows: BulkItemRow[]) => void;
  csvFile: File | null;
  csvPreview: any[];
  isBulkUploading: boolean;
  handleBulkSubmit: () => Promise<void>;
  csvRequirementsExpanded: boolean;
  setCsvRequirementsExpanded: (b: boolean) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Deal modal props
  dealModalOpen: boolean;
  setDealModalOpen: (b: boolean) => void;
  dealTargetType: string;
  setDealTargetType: (s: string) => void;
  dealBookId: string | null;
  setDealBookId: (s: string | null) => void;
  dealDiscountType: "percentage" | "fixed";
  setDealDiscountType: (s: "percentage" | "fixed") => void;
  dealValue: number;
  setDealValue: (n: number) => void;
  handleApplyDeal: () => Promise<void>;
}

export const DealsUploadTab: React.FC<DealsUploadTabProps> = ({
  listings,
  filteredListings,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  handleEditBook,
  handleRemoveDeal,
  uploadMethod,
  setUploadMethod,
  manualRows,
  setManualRows,
  csvFile,
  csvPreview,
  isBulkUploading,
  handleBulkSubmit,
  csvRequirementsExpanded,
  setCsvRequirementsExpanded,
  handleFileChange,

  dealModalOpen,
  setDealModalOpen,
  dealTargetType,
  setDealTargetType,
  dealBookId,
  setDealBookId,
  dealDiscountType,
  setDealDiscountType,
  dealValue,
  setDealValue,
  handleApplyDeal,
}) => {
  
  const handleAddManualRow = () => {
    setManualRows([
      ...manualRows,
      {
        id: String(manualRows.length + 1),
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

  const handleUpdateManualRow = (id: string, field: keyof BulkItemRow, value: any) => {
    setManualRows(
      manualRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveManualRow = (id: string) => {
    if (manualRows.length === 1) return;
    setManualRows(manualRows.filter((row) => row.id !== id));
  };

  const openBulkDealModal = () => {
    setDealBookId(null);
    setDealTargetType("all");
    setDealValue(0);
    setDealModalOpen(true);
  };

  const openSingleBookDealModal = (bookId: string) => {
    setDealBookId(bookId);
    setDealTargetType("single");
    setDealValue(0);
    setDealModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Search and Deals Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings by title or author..."
            className="pl-10 rounded-xl border-gray-300 w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          <select
            className="border border-gray-300 rounded-xl text-xs px-3 h-10 font-semibold bg-white outline-none focus:ring-1 focus:ring-book-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Item Types</option>
            <option value="textbook">Textbook</option>
            <option value="reader">Reader</option>
            <option value="uniform">Uniform</option>
            <option value="school_supply">School Supply</option>
          </select>
          <Button
            onClick={openBulkDealModal}
            className="bg-book-600 hover:bg-book-700 text-white rounded-xl font-semibold shadow-sm text-sm"
          >
            <Percent className="h-4 w-4 mr-2" /> Apply Category Deal
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm border-gray-200">
        {filteredListings.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">No items found</h3>
            <p className="text-sm text-gray-500">Try modifying search term or create new listings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider text-xs border-b border-gray-250">
                <tr>
                  <th className="px-6 py-3">Listing Details</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Promo / Deal</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredListings.map((book) => {
                  const isPromo = !!book.original_price && book.original_price > book.price;
                  
                  return (
                    <tr key={book.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img
                          src={book.image_url || book.front_cover}
                          alt={book.title}
                          className="w-12 h-12 object-cover rounded-lg border shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 truncate max-w-xs sm:max-w-md">{book.title}</h4>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{book.author || "School wear/supply"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize">
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-semibold">
                          {book.item_type?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isPromo ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-red-600">R{book.price.toLocaleString()}</span>
                            <span className="text-xs line-through text-gray-400">R{book.original_price.toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900">R{book.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isPromo ? (
                          <Badge className="bg-red-100 text-red-800 border-0 flex items-center gap-1 w-max font-bold">
                            <Percent className="h-3 w-3" />
                            {`${Math.round((1 - book.price / book.original_price) * 100)}% OFF`}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">No active deal</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs">
                          <span className="font-bold text-gray-700">{book.available_quantity || 0} left</span>
                          <span className="text-gray-500 text-[10px]">{book.sold_quantity || 0} sold</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs rounded-xl"
                            onClick={() => handleEditBook(book.id, book.item_type)}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          {isPromo ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-650 hover:bg-red-50 hover:text-red-700 text-xs rounded-xl"
                              onClick={() => handleRemoveDeal(book.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs rounded-xl"
                              onClick={() => openSingleBookDealModal(book.id)}
                            >
                              <Percent className="h-3.5 w-3.5 mr-1" /> Add Deal
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Bulk Upload Hub Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-book-650" /> Bulk Listings Creator
              </h3>
              <p className="text-xs text-gray-500 mt-1">Select your preferred bulk creation method</p>
            </div>
            
            <div className="flex border rounded-xl p-0.5 bg-gray-50 shrink-0 max-w-max">
              <button
                onClick={() => setUploadMethod("grid")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${uploadMethod === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                Manual Grid
              </button>
              <button
                onClick={() => setUploadMethod("csv")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${uploadMethod === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                CSV Upload
              </button>
            </div>
          </div>

          {uploadMethod === "grid" ? (
            <div className="space-y-4">
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-xs divide-y border-collapse min-w-[800px]">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Title *</th>
                      <th className="py-2.5 px-3">Author</th>
                      <th className="py-2.5 px-3">Type *</th>
                      <th className="py-2.5 px-3">Grade (Textbooks)</th>
                      <th className="py-2.5 px-3">Condition *</th>
                      <th className="py-2.5 px-3">Price (ZAR) *</th>
                      <th className="py-2.5 px-3">Qty *</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {manualRows.map((row, idx) => (
                      <tr key={row.id}>
                        <td className="p-2">
                          <Input
                            value={row.title}
                            onChange={(e) => handleUpdateManualRow(row.id, "title", e.target.value)}
                            placeholder="Listing title"
                            className="h-8 text-xs rounded-lg border-gray-300 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.author}
                            onChange={(e) => handleUpdateManualRow(row.id, "author", e.target.value)}
                            placeholder="Author/brand"
                            className="h-8 text-xs rounded-lg border-gray-300 bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.itemType}
                            onChange={(e) => handleUpdateManualRow(row.id, "itemType", e.target.value)}
                            className="border border-gray-300 rounded-lg text-xs px-2 h-8 bg-white outline-none focus:ring-1 focus:ring-book-500 w-full"
                          >
                            <option value="textbook">Textbook</option>
                            <option value="reader">Reader</option>
                            <option value="uniform">Uniform</option>
                            <option value="school_supply">School Supply</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.grade}
                            onChange={(e) => handleUpdateManualRow(row.id, "grade", e.target.value)}
                            className="border border-gray-300 rounded-lg text-xs px-2 h-8 bg-white outline-none focus:ring-1 focus:ring-book-500 w-full"
                          >
                            <option value="">N/A</option>
                            {[...Array(12)].map((_, i) => (
                              <option key={i} value={`Grade ${i + 1}`}>Grade {i + 1}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.condition}
                            onChange={(e) => handleUpdateManualRow(row.id, "condition", e.target.value)}
                            className="border border-gray-300 rounded-lg text-xs px-2 h-8 bg-white outline-none focus:ring-1 focus:ring-book-500 w-full"
                          >
                            <option value="New">New</option>
                            <option value="Better">Like New</option>
                            <option value="Good">Good</option>
                            <option value="Average">Average</option>
                            <option value="Below Average">Poor</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={row.price || ""}
                            onChange={(e) => handleUpdateManualRow(row.id, "price", Number(e.target.value))}
                            placeholder="Price"
                            className="h-8 text-xs rounded-lg border-gray-300 bg-white w-20"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) => handleUpdateManualRow(row.id, "quantity", Number(e.target.value))}
                            placeholder="Qty"
                            className="h-8 text-xs rounded-lg border-gray-300 bg-white w-16"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            variant="ghost"
                            onClick={() => handleRemoveManualRow(row.id)}
                            className="text-red-500 hover:bg-red-50 rounded-lg h-8 px-2.5"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-2">
                <Button
                  onClick={handleAddManualRow}
                  variant="outline"
                  className="rounded-xl border-gray-300 text-xs font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Row
                </Button>
                
                <Button
                  onClick={handleBulkSubmit}
                  disabled={isBulkUploading}
                  className="bg-book-600 hover:bg-book-700 text-white rounded-xl font-semibold text-xs px-6"
                >
                  {isBulkUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                  Publish Grid Listings
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Collapsible Requirements list */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-700">CSV Template Requirements</p>
                  <button
                    onClick={() => setCsvRequirementsExpanded(!csvRequirementsExpanded)}
                    className="text-book-600 hover:text-book-700 text-xs font-semibold flex items-center gap-1"
                  >
                    {csvRequirementsExpanded ? (
                      <>Collapse Rules <ChevronUp className="h-3.5 w-3.5" /></>
                    ) : (
                      <>Expand Rules <ChevronDown className="h-3.5 w-3.5" /></>
                    )}
                  </button>
                </div>
                
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Your CSV spreadsheet can contain textbooks, readers, uniforms, or school supplies.
                </p>

                {csvRequirementsExpanded && (
                  <div className="space-y-2 border-t pt-3 border-gray-200 animate-slideDown">
                    <p className="text-[11px] font-semibold text-gray-600">Required CSV Columns:</p>
                    <ul className="list-disc pl-4 text-[10px] text-gray-500 space-y-1">
                      <li><strong>title</strong> (string) - Display title</li>
                      <li><strong>itemtype</strong> (textbook, reader, uniform, school_supply)</li>
                      <li><strong>condition</strong> (New, Better, Good, Average, Below Average)</li>
                      <li><strong>price</strong> (number) - Retail price</li>
                      <li><strong>quantity</strong> (number) - Available stock</li>
                    </ul>
                    <p className="text-[11px] font-semibold text-gray-600 mt-2">Optional Columns:</p>
                    <ul className="list-disc pl-4 text-[10px] text-gray-500 space-y-1">
                      <li><strong>author</strong> (string) - Author name or uniform brand</li>
                      <li><strong>category</strong> (string) - Education tier or age category</li>
                      <li><strong>grade</strong> (string) - Grade label (e.g. Grade 10)</li>
                      <li><strong>description</strong> (string) - Store display details</li>
                      <li><strong>imageurl1</strong> (string) - Direct public web image link</li>
                      <li><strong>imageurl2</strong>, <strong>imageurl3</strong> (string) - Secondary listing images</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/20 hover:bg-gray-50/50 transition">
                <UploadCloud className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <label className="block text-xs font-semibold text-gray-700 cursor-pointer">
                  <span>Click to select file</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".csv"
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-gray-400 mt-1">Only .csv spreadsheet files are accepted</p>
                {csvFile && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-book-50 text-book-700 px-3 py-1 rounded-full text-xs font-semibold border border-book-100">
                    <Check className="h-3.5 w-3.5" /> {csvFile.name}
                  </div>
                )}
              </div>

              {csvPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-gray-800">CSV Parse Preview ({csvPreview.length} items parsed)</h4>
                  </div>
                  <div className="overflow-x-auto border rounded-xl max-h-56">
                    <table className="w-full text-left text-xs divide-y border-collapse min-w-[700px]">
                      <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0 border-b">
                        <tr>
                          <th className="py-2 px-3">Title</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Price</th>
                          <th className="py-2 px-3">Stock</th>
                          <th className="py-2 px-3">Condition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {csvPreview.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3 font-semibold text-gray-800 truncate max-w-xs">{row.title}</td>
                            <td className="py-2 px-3 capitalize">{row.itemType}</td>
                            <td className="py-2 px-3 font-semibold">R{row.price}</td>
                            <td className="py-2 px-3">{row.quantity}</td>
                            <td className="py-2 px-3">{row.condition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleBulkSubmit}
                      disabled={isBulkUploading}
                      className="bg-book-600 hover:bg-book-700 text-white rounded-xl font-semibold text-xs px-6"
                    >
                      {isBulkUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                      Publish {csvPreview.length} CSV Listings
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals Configuration Modal */}
      <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-gray-900">
              {dealTargetType === "single" ? "Configure Store Deal" : "Configure Bulk Category Discount"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Apply a promo deal to your listings. This will show discounted badges to users.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {dealTargetType !== "single" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">Target Category Type</Label>
                <select
                  value={dealTargetType}
                  onChange={(e) => setDealTargetType(e.target.value)}
                  className="border border-gray-300 rounded-xl text-xs px-3 h-10 w-full bg-white outline-none focus:ring-1 focus:ring-book-500 font-semibold"
                >
                  <option value="all">All Inventory</option>
                  <option value="textbook">Textbooks only</option>
                  <option value="reader">Readers only</option>
                  <option value="uniform">Uniforms only</option>
                  <option value="school_supply">School Supplies only</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">Discount Type</Label>
                <select
                  value={dealDiscountType}
                  onChange={(e) => setDealDiscountType(e.target.value as any)}
                  className="border border-gray-300 rounded-xl text-xs px-3 h-10 w-full bg-white outline-none focus:ring-1 focus:ring-book-500 font-semibold"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (R)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">
                  {dealDiscountType === "percentage" ? "Percentage Off (%)" : "Value Off (ZAR)"}
                </Label>
                <Input
                  type="number"
                  value={dealValue || ""}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  placeholder={dealDiscountType === "percentage" ? "e.g. 15" : "e.g. 50"}
                  className="rounded-xl border-gray-300 h-10 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDealModalOpen(false)}
              className="rounded-xl border-gray-300 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyDeal}
              className="bg-book-600 hover:bg-book-700 text-white rounded-xl font-semibold text-xs"
            >
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
