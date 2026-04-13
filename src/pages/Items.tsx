import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import BookFilters from "@/components/book-listing/BookFilters";
import BookGrid from "@/components/book-listing/BookGrid";
import { getBooks } from "@/services/book/bookQueries";
import { Book } from "@/types/book";
import { toast } from "sonner";
import { useCommit } from "@/hooks/useCommit";
import { useAuth } from "@/contexts/AuthContext";
import debugLogger from "@/utils/debugLogger";
import {
  parseTextbookSegments,
  buildTextbookUrl,
  generateFilterTitle,
  generateFilterDescription,
  generateFilterContent,
  type ParsedTextbookUrl,
} from "@/utils/textbookUrlUtils";
import { getCategoriesByBookType } from "@/constants/bookTypeCategories";

const ALL_CATEGORIES = Array.from(
  new Set([
    ...getCategoriesByBookType("school"),
    ...getCategoriesByBookType("university"),
    ...getCategoriesByBookType("reader"),
  ]),
).sort();

const ListingsPage = () => {
  const { "*": splat } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const segments = useMemo(
    () => (splat ? splat.split("/").filter(Boolean) : []),
    [splat],
  );

  const parsed: ParsedListingUrl = useMemo(
    () => parseListingSegments(segments, ALL_CATEGORIES),
    [segments],
  );

  useEffect(() => {
    if (parsed.listingId) {
      navigate(`/listings/item/${parsed.listingId}`, { replace: true });
    }
  }, [parsed.listingId, navigate]);

  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [totalBooks, setTotalBooks] = useState(0);
  const booksPerPage = 12;
  const pageTopRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1", 10),
  );

  const { commitBook } = useCommit();
  const { user } = useAuth();

  // Local filter states — initialized from URL segments
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(parsed.category || "");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(parsed.grade || "");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(parsed.genre || "");
  const [selectedUniversityYear, setSelectedUniversityYear] = useState(parsed.universityYear || "");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedProvince, setSelectedProvince] = useState(parsed.province || "");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [bookType, setBookType] = useState<"all" | "school" | "university" | "reader" | "uniform" | "school_supply">("all");

  // Track whether initial sync from URL is done to avoid double-navigating
  const initialSyncDone = useRef(false);

  // Sync URL segments -> local state when URL changes
  useEffect(() => {
    if ((parsed.category || "") !== selectedCategory) setSelectedCategory(parsed.category || "");
    if ((parsed.grade || "") !== selectedGrade) setSelectedGrade(parsed.grade || "");
    if ((parsed.province || "") !== selectedProvince) setSelectedProvince(parsed.province || "");
    if ((parsed.universityYear || "") !== selectedUniversityYear) setSelectedUniversityYear(parsed.universityYear || "");
    if ((parsed.genre || "") !== selectedGenre) setSelectedGenre(parsed.genre || "");
    initialSyncDone.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.category, parsed.grade, parsed.province, parsed.universityYear, parsed.genre]);

  // SEO metadata
  const seoTitle = generateFilterTitle(parsed);
  const seoDescription = generateFilterDescription(parsed, totalBooks);
  const seoContent = generateFilterContent(parsed, totalBooks);
  const canonicalUrl = `https://www.rebookedsolutions.co.za${buildListingUrlPath({
    category: parsed.category || undefined,
    grade: parsed.grade || undefined,
    province: parsed.province || undefined,
    universityYear: parsed.universityYear || undefined,
    genre: parsed.genre || undefined,
  })}`;

  const hasActiveFilters = !!(parsed.category || parsed.grade || parsed.province || parsed.universityYear || parsed.genre);

  // JSON-LD
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seoTitle.replace(" | ReBooked Solutions", ""),
    description: seoDescription,
    url: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "ReBooked Solutions",
      url: "https://www.rebookedsolutions.co.za",
    },
    ...(totalBooks > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: totalBooks,
            itemListElement: books.slice(0, 10).map((book, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: book.title,
                description: book.description?.substring(0, 200),
                image: book.imageUrl,
                offers: {
                  "@type": "Offer",
                  price: book.price,
                  priceCurrency: "ZAR",
                  availability: book.sold
                    ? "https://schema.org/SoldOut"
                    : "https://schema.org/InStock",
                  itemCondition:
                    book.condition === "New"
                      ? "https://schema.org/NewCondition"
                      : "https://schema.org/UsedCondition",
                },
                author: { "@type": "Person", name: book.author },
              },
            })),
          },
        }
      : {}),
  };

  const filterBooksByType = (booksToFilter: Book[], type: typeof bookType): Book[] => {
    if (type === "all") return booksToFilter;
    return booksToFilter.filter((book) => {
      if (type === "school") return book.grade?.trim();
      if (type === "university") return book.universityYear?.trim();
      if (type === "reader") return book.genre?.trim();
      if (type === "uniform") return book.itemType === "uniform";
      if (type === "school_supply") return book.itemType === "school_supply";
      return true;
    });
  };

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, any> = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedCondition) filters.condition = selectedCondition;
      if (selectedGrade) filters.grade = selectedGrade;
      if (selectedGenre) filters.genre = selectedGenre;
      if (selectedCurriculum) filters.curriculum = selectedCurriculum;
      if (selectedUniversityYear) filters.universityYear = selectedUniversityYear;
      if (selectedUniversity) filters.university = selectedUniversity;
      if (selectedProvince) filters.province = selectedProvince;
      if (priceRange[0] > 0) filters.minPrice = priceRange[0];
      if (priceRange[1] < 2000) filters.maxPrice = priceRange[1];

      let booksArray = await getBooks(filters);
      booksArray = Array.isArray(booksArray) ? booksArray : [];

      if (bookType !== "all") {
        booksArray = filterBooksByType(booksArray, bookType);
      }

      setTotalBooks(booksArray.length);

      const startIndex = (currentPage - 1) * booksPerPage;
      setBooks(booksArray.slice(startIndex, startIndex + booksPerPage));
    } catch (error) {
      debugLogger.error("Listings", "Failed to load listings", error);
      toast.error("Failed to load listings. Please try again later.");
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery, selectedCategory, selectedCondition, selectedGrade,
    selectedGenre, selectedCurriculum, selectedUniversityYear,
    selectedUniversity, selectedProvince, priceRange, currentPage, bookType,
  ]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  // Auto-apply: when URL-relevant filters change, update the URL path automatically
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Skip on first render (initial load from URL)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!initialSyncDone.current) return;

    const newPath = buildListingUrlPath({
      category: selectedCategory || undefined,
      grade: selectedGrade || undefined,
      province: selectedProvince || undefined,
      universityYear: selectedUniversityYear || undefined,
      genre: selectedGenre || undefined,
    });

    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    params.set("page", "1");
    setCurrentPage(1);

    const queryString = params.toString();
    navigate(`${newPath}${queryString ? `?${queryString}` : ""}`, { replace: true });
  }, [selectedCategory, selectedGrade, selectedProvince, selectedUniversityYear, selectedGenre]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newPath = buildListingUrlPath({
      category: selectedCategory || undefined,
      grade: selectedGrade || undefined,
      province: selectedProvince || undefined,
      universityYear: selectedUniversityYear || undefined,
      genre: selectedGenre || undefined,
    });
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    params.set("page", "1");
    setCurrentPage(1);
    const queryString = params.toString();
    navigate(`${newPath}${queryString ? `?${queryString}` : ""}`, { replace: true });
  };

  // Keep updateFilters for BookFilters prop compatibility but it's now a no-op
  // since filters auto-apply
  const updateFilters = useCallback(() => {
    // No-op: filters auto-apply via useEffect
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedCondition("");
    setSelectedGrade("");
    setSelectedGenre("");
    setSelectedUniversityYear("");
    setSelectedCurriculum("");
    setSelectedUniversity("");
    setSelectedProvince("");
    setPriceRange([0, 2000]);
    setBookType("all");
    setCurrentPage(1);
    navigate("/listings", { replace: true });
  }, [navigate]);

  const handleCommitBook = async (bookId: string) => {
    try {
      await commitBook(bookId);
      loadBooks();
    } catch {
      toast.error("Failed to commit sale. Please try again.");
    }
  };

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      setSearchParams(params);
      requestAnimationFrame(() => {
        pageTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      });
    },
    [searchParams, setSearchParams],
  );

  if (parsed.listingId) return null;

  return (
    <Layout>
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={`listings, ${parsed.category || "items"}, ${parsed.grade || "school"}, ${parsed.universityYear || "university"}, ${parsed.genre || "readers"}, ${parsed.province || "south africa"}, uniforms, school supplies, buy listings, sell listings, ReBooked Solutions`}
        url={canonicalUrl}
        canonical={canonicalUrl}
      />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <div ref={pageTopRef} className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* SEO Content — hidden visually, visible to crawlers */}
        {hasActiveFilters && (
          <div className="sr-only" aria-hidden="false">
            <h1>
              {[parsed.grade, parsed.universityYear, parsed.category, parsed.genre]
                .filter(Boolean)
                .join(" ")}{" "}
              Listings
              {parsed.province ? ` in ${parsed.province}` : ""}
            </h1>
            <p>{seoContent}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 px-2 sm:px-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-0">
            Browse Listings
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          <BookFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedCondition={selectedCondition}
            setSelectedCondition={setSelectedCondition}
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedCurriculum={selectedCurriculum}
            setSelectedCurriculum={setSelectedCurriculum}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            selectedUniversityYear={selectedUniversityYear}
            setSelectedUniversityYear={setSelectedUniversityYear}
            selectedUniversity={selectedUniversity}
            setSelectedUniversity={setSelectedUniversity}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            bookType={bookType}
            setBookType={setBookType}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onSearch={handleSearch}
            onUpdateFilters={updateFilters}
            onClearFilters={clearFilters}
          />

          <BookGrid
            books={books}
            isLoading={isLoading}
            onClearFilters={clearFilters}
            currentUserId={user?.id}
            onCommitBook={handleCommitBook}
            currentPage={currentPage}
            totalBooks={totalBooks}
            booksPerPage={booksPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </Layout>
  );
};

export default ListingsPage;
s;
