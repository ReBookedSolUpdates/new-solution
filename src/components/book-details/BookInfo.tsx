import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book } from '@/types/book';
import BuyersProtectionDialog from '@/components/BuyersProtectionDialog';
import { Package } from 'lucide-react';

interface BookInfoProps {
  book: Book;
}

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <dt className="text-[12px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{String(value)}</dd>
    </div>
  );
};

const BookInfo = ({ book }: BookInfoProps) => {
  const isUniform = book.itemType === 'uniform';
  const isSchoolSupply = book.itemType === 'school_supply';
  const isBook = !isUniform && !isSchoolSupply;

  const cardTitle = isBook ? 'Book Details' : isUniform ? 'Uniform Details' : 'Supply Details';

  // Parcel size label mapping from PARCEL_SIZES constant
  const parcelSizeLabel = (sizeKey?: string) => {
    if (!sizeKey) return null;
    const map: Record<string, string> = {
      extra_small: 'Extra Small (Up to 2 KG)',
      small: 'Small (Up to 5 KG)',
      medium: 'Medium (Up to 10 KG)',
      large: 'Large (Up to 15 KG)',
      extra_large: 'Extra Large (Up to 20 KG)',
    };
    return map[sizeKey] || sizeKey.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{book.title}</h1>
        {isBook && book.author && (
          <p className="text-lg md:text-xl text-gray-600 mb-4">by {book.author}</p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {isBook && book.category && <Badge variant="secondary">{book.category}</Badge>}
          {book.condition && <Badge variant="outline">{book.condition}</Badge>}
          {isUniform && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Uniform</Badge>}
          {isSchoolSupply && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">School Supply</Badge>}
          {book.sold && <Badge variant="destructive">Sold</Badge>}
        </div>

        {/* Buyer Protection banner */}
        <div className="mb-4">
          <BuyersProtectionDialog
            triggerType="banner"
            triggerLabel="Buyer Protection"
            triggerClassName=""
            triggerProps={{
              onClick: (e) => { e.stopPropagation(); },
            }}
          />
        </div>
      </div>

      {/* Item Details Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-book-600" />
            {cardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {book.description && (
            <div className="mb-4 pb-4 border-b">
              <dt className="text-[12px] uppercase tracking-wide text-muted-foreground">Description</dt>
              <dd className="mt-2 text-sm text-foreground leading-relaxed">{book.description}</dd>
            </div>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price */}
            <InfoRow label="Price" value={`R${book.price.toFixed(2)}`} />

            {/* Common fields */}
            <InfoRow label="Category" value={book.category} />
            <InfoRow label="Condition" value={book.condition} />
            <InfoRow label="Province" value={book.province} />
            
            {typeof book.availableQuantity === 'number' && (
              <InfoRow label="Available" value={book.availableQuantity} />
            )}

            {/* Book-specific fields */}
            {isBook && (
              <>
                <InfoRow label="Grade" value={book.grade} />
                <InfoRow label="University Year" value={book.universityYear} />
                <InfoRow label="Curriculum" value={book.curriculum} />
                <InfoRow label="Genre" value={book.genre} />
                <InfoRow label="ISBN" value={book.isbn} />
              </>
            )}

            {/* Uniform-specific fields */}
            {isUniform && (
              <>
                <InfoRow label="School Name" value={book.schoolName} />
                <InfoRow label="Grade" value={book.grade} />
                <InfoRow label="Size" value={book.size} />
                <InfoRow label="Color" value={book.color} />
                <InfoRow label="Gender" value={book.gender} />
              </>
            )}

            {/* School Supply-specific fields */}
            {isSchoolSupply && (
              <>
                <InfoRow label="School Name" value={book.schoolName} />
                <InfoRow label="Grade" value={book.grade} />
                <InfoRow label="Subject" value={book.subject} />
              </>
            )}

            {/* Parcel size for everything */}
            {book.parcelSize && (
              <InfoRow label="Parcel Size" value={parcelSizeLabel(book.parcelSize)} />
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookInfo;
