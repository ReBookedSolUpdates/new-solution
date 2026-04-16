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

  useEffect(() => {
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
        setBooks(featuredMix.slice(0, 8));
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Featured Listings</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
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
        {/* Header — left aligned with right CTA */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-book-600 fill-current" />
              <Badge className="bg-book-100 text-book-700 border border-book-300 hover:bg-book-200">
                ✦ Featured
              </Badge>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">Featured Listings</h2>
            <p className="text-gray-500 max-w-md">
              Discover handpicked school items from our collection. Quality products at unbeatable prices.
            </p>
          </div>
          <Button asChild variant="outline" className="border-2 border-book-300 text-book-700 hover:bg-book-50 shrink-0">
            <Link to="/textbooks">View All Listings <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>

        {/* Grid: first 2 featured (span 2 cols), rest normal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {books.map((book, index) => (
            <FeaturedBookCard key={book.id} book={book} featured={index < 2} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturedBookCard = ({ book, featured }: { book: Book; featured: boolean }) => {
  const typeBadge =
    book.itemType === "uniform"
      ? { label: "Uniform", icon: <Shirt className="h-3 w-3" /> }
      : book.itemType === "school_supply"
        ? { label: "School Supply", icon: <Backpack className="h-3 w-3" /> }
        : { label: "Textbook", icon: <BookOpen className="h-3 w-3" /> };

  return (
    <Link
      to={`/books/${book.id}`}
      className={`group block bg-white rounded-xl border border-gray-200 overflow-hidden
        transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg
        ${featured ? "lg:col-span-2" : ""}`}
    >
      <div className={`relative overflow-hidden ${featured ? "h-52" : "h-40"}`}>
        <img
          src={book.imageUrl}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop&auto=format&q=80";
          }}
        />
        {/* Price pill */}
        <div className="absolute top-3 right-3 bg-white px-2.5 py-1 rounded-full text-sm font-bold text-book-800 shadow-sm">
          R{book.price.toLocaleString()}
        </div>
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <Badge className="flex items-center gap-1 bg-book-600 text-white text-[10px] font-bold uppercase tracking-wide hover:bg-book-700">
            {typeBadge.icon} {typeBadge.label}
          </Badge>
        </div>
        {/* Featured label */}
        {featured && (
          <Badge className="absolute bottom-3 left-3 bg-book-600 text-white text-[10px] font-bold uppercase hover:bg-book-700">
            Featured
          </Badge>
        )}
        {/* Wishlist heart */}
        <div className="absolute top-3 right-14 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart className="h-3.5 w-3.5 text-gray-400" />
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-book-600 transition-colors mb-1">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          {book.itemType === "uniform" ? (book.schoolName || "School uniform") : book.itemType === "school_supply" ? (book.subject || "School supply") : `by ${book.author}`}
        </p>

        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {book.itemType === "uniform" ? book.condition : book.itemType === "school_supply" ? (book.condition || "Supply") : book.category}
            </Badge>
            {book.grade && <Badge variant="secondary" className="text-[10px]">{book.grade}</Badge>}
          </div>
          {book.province && (
            <span className="flex items-center text-[10px] text-gray-400">
              <MapPin className="h-3 w-3 mr-0.5" /> {book.province}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default FeaturedBooks;
