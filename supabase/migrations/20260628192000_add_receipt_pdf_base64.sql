-- Add receipt_pdf_base64 column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_pdf_base64 TEXT;
