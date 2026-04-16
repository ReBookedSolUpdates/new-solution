import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, MapPin, Shirt, Backpack, BookOpen, Heart } from "lucide-react";
import { getBooks } from "@/services/book/bookQueries";
import { Book } from "@/types/book";
import { logErrorSafely } from "@/utils/errorHandling";

const FeaturedBooks = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const shuffleArrayWithSeed = <T,>(array: T[], seed: number): T[] => {
      const shuffled = [...array];
      let currentIndex = shuffled.length;
      while (currentIndex !== 0) {
        const randomIndex = Math.floor(seededRandom(seed + currentIndex) * currentIndex);
        currentIndex--;
        [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
      }
      return shuffled;
    };

    const fetchFeaturedBooks = async () => {
      try {
        setIsLoading(true);
        const allBooks = await getBooks({});
        if (allBooks.length === 0) { setBooks([]); return; }

        const today = new Date();
        const dateString = today.getFullYear() + "-" +
          String(today.getMonth() + 1).padStart(2, '0') + "-" +
          String(today.getDate()).padStart(2, '0');
        const dailySeed = dateString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const shuffledBooks = shuffleArrayWithSeed(allBooks, dailySeed);

        const textbooks = shuffledBooks.filter((i) => i.itemType !== "uniform" && i.itemType !== "school_supply");
        const uniforms = shuffledBooks.filter((i) => i.itemType === "uniform");
        const supplies = shuffledBooks.filter((i) => i.itemType === "school_supply");

        const featuredMix: Book[] = [];
        const take = (bucket: Book[], count: number) => {
          bucket.slice(0, count).forEach((item) => {
            if (!featuredMix.find((e) => e.id === item.id)) featuredMix.push(item);
          });
        };
        take(textbooks, 4);
        take(uniforms, 2);
        take(supplies, 2);

        if (featuredMix.length < 8) {
          shuffledBooks.forEach((item) => {
            if (featuredMix.length >= 8) return;
            if (!featuredMix.find((e) => e.id === item.id)) featuredMix.push(item);
          });
        }
        setBooks(featuredMix.slice(0, 6));
      } catch (error) {
        logErrorSafely("Error fetching featured books:", error);
        setBooks([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeaturedBooks();
  }, []);

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-8">
            <div className="mb-3">
              <Badge className="bg-book-100 text-book-700 border border-book-300 hover:bg-book-200">
                Featured
              </Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Featured Listings</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Discover handpicked school items from our collection. Quality products at unbeatable prices.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 rounded-xl h-40 mb-3" />
                <div className="h-4 bg-gray-300 rounded mb-2" />
                <div className="h-3 bg-gray-300 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (books.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-10">
          <div className="max-w-2xl">
            <Badge className="bg-book-100 text-book-700 border border-book-300 hover:bg-book-200">
              Featured
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Featured Listings</h2>
            <p className="text-gray-500 max-w-md">
              Discover curated school items with clearer pricing, seller details, and quick book highlights.
            </p>
          </div>
          <Link to="/listings" className="inline-flex items-center justify-center rounded-full border border-book-300 bg-white px-5 py-3 text-sm font-semibold text-book-700 transition hover:bg-book-50">
            View All Listings
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          {books.map((book, index) => (
            <FeaturedBookCard
              key={book.id}
              book={book}
              className={
                index === 0 ? "lg:col-span-2 lg:row-span-2" :
                index === 1 ? "lg:row-span-2" :
                ""
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturedBookCard = ({ book, className = "" }: { book: Book; className?: string }) => {
  const typeBadge =
    book.itemType === "uniform"
      ? { label: "Uniform", icon: <Shirt className="h-3 w-3" /> }
      : book.itemType === "school_supply"
        ? { label: "School Supply", icon: <Backpack className="h-3 w-3" /> }
        : { label: "Textbook", icon: <BookOpen className="h-3 w-3" /> };

  const description = book.description ? `${book.description.slice(0, 110)}${book.description.length > 110 ? "..." : ""}` : "No description available.";
  const sellerLabel = book.author ? `by ${book.author}` : book.seller?.name || "ReBooked Seller";

  return (
    <Link
      to={`/books/${book.id}`}
      className={`group block bg-white rounded-3xl border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg ${className}`}
    >
      <div className="relative overflow-hidden h-56">
        <img
          src={book.imageUrl}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop&auto=format&q=80";
          }}
        />

        <div className="absolute top-3 left-3">
          <Badge className="flex items-center gap-1 bg-book-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full">
            {typeBadge.icon}
            <span>{typeBadge.label}</span>
          </Badge>
        </div>

        <div className="absolute top-3 right-3 rounded-full bg-white/85 px-3 py-1 text-sm font-semibold text-book-800 shadow-sm">
          R{book.price.toLocaleString()}
        </div>

      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-book-600 transition-colors mb-2">
          {book.title}
        </h3>
        <p className="text-sm text-gray-500 mb-3">{sellerLabel}</p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">{description}</p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {book.grade && (
              <Badge variant="outline" className="text-[10px] px-2 py-1">
                {book.grade}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-2 py-1">
              {book.condition}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-1">
              {book.category}
            </Badge>
          </div>

          {book.province && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              {book.province}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default FeaturedBooks;
