import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookDetailsRequest {
  frontCoverUrl: string;
  backCoverUrl: string;
  insidePagesUrl: string;
  hints?: {
    curriculum?: string;
    grade?: string;
  };
}

interface BookDetailsResponse {
  success: boolean;
  data?: {
    title: string;
    author: string;
    isbn?: string;
    description: string;
    condition: "New" | "Good" | "Better" | "Average" | "Below Average";
    grade?: string;
    curriculum?: "CAPS" | "Cambridge" | "IEB";
    category?: string;
    estimatedPrice?: number;
    quantity: number;
    confidence?: Record<string, number>;
  };
  error?: string;
  message?: string;
}

// Validate that URL is from Supabase Storage
function isValidSupabaseStorageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes("supabase.co") || 
           urlObj.hostname.includes("localhost") ||
           urlObj.hostname.includes("127.0.0.1");
  } catch {
    return false;
  }
}

// System prompt for book extraction
function getSystemPrompt(): string {
  return `You are an expert book analyst specialized in South African SECOND-HAND textbooks. You evaluate used educational materials for resale on the secondary market.

CRITICAL: These are USED books being resold. Prices must reflect the SECOND-HAND market, NOT new retail prices.

Your task:
1. Extract the book title from the cover (be precise, include edition if visible)
2. Extract the author name(s)
3. Look for ISBN number (on back cover or inside)
4. **CAREFULLY assess book condition based on ALL visible wear, damage, and use:**
   - New: Pristine, absolutely no wear, looks unread, spine uncracked
   - Good: Very light wear on cover edges, no markings inside, pages white, binding tight
   - Better: Some wear on cover/spine, pages may have slight yellowing, no significant markings
   - Average: Obvious wear, light pencil marks possible, page yellowing, cover scuffs
   - Below Average: Heavy wear, pen/highlighter marks, loose pages, torn cover, water damage
5. Identify grade level if visible
6. Detect curriculum type: CAPS, Cambridge, or IEB
7. Determine the subject/category

8. **DESCRIPTION MUST INCLUDE DETAILED CONDITION ASSESSMENT:**
   Write 3-5 sentences that MUST cover:
   - Sentence 1-2: What the book covers (topics, subject matter)
   - Sentence 3: DETAILED physical condition description (specific wear patterns, page quality, binding state, any markings/damage)
   - Sentence 4-5: Any notable features and who this book suits

9. **REALISTIC SECOND-HAND PRICING (in ZAR):**
   
   BASE PRICES FOR USED TEXTBOOKS:
   - Grade 1-3 workbooks: R30-R60
   - Grade 4-7 textbooks: R40-R80
   - Grade 8-9 textbooks: R50-R100
   - Grade 10-12 textbooks: R60-R150
   - IEB/Cambridge may be 10-20% higher
   
   CONDITION MULTIPLIERS (apply to base price):
   - New (unused): 80-100% of base (rare for used books)
   - Good: 60-80% of base
   - Better: 45-65% of base
   - Average: 30-50% of base
   - Below Average: 15-35% of base
   
   TYPICAL FINAL PRICES:
   - Most primary school books: R25-R60
   - Most high school books: R40-R120
   - Matric textbooks in Good condition: R80-R150
   - Workbooks with writing: R15-R35
   - Damaged books: R10-R30
   
   DO NOT exceed R200 unless it's a specialty/rare textbook in New condition.

CONDITION DESCRIPTION EXAMPLES:

Good condition: "This copy shows minimal signs of use with a tight binding and clean, unmarked pages. The cover has very light shelf wear on the corners but no creases or tears. Pages remain white with no yellowing or markings—an excellent second-hand find."

Average condition: "This copy has been well-used with noticeable wear on the spine and cover edges. Pages show some yellowing and there are light pencil notes in margins that can be erased. The binding remains intact but is slightly loose. A functional copy at a budget-friendly price."

Below Average condition: "This copy shows significant wear from extensive use. The cover has creases and scuff marks, several pages have highlighting and pen markings, and the binding is loose with some pages coming free. Best suited for buyers needing the content on a tight budget."

RESPOND ONLY WITH VALID JSON:
{
  "title": "string",
  "author": "string",
  "isbn": "string or null",
  "description": "string (3-5 sentences with DETAILED condition assessment)",
  "condition": "New|Good|Better|Average|Below Average",
  "grade": "string or null (e.g., 'Grade 10')",
  "curriculum": "CAPS|Cambridge|IEB or null",
  "category": "string (subject)",
  "estimatedPrice": number (REALISTIC second-hand price, usually R30-R150),
  "confidence": {
    "title": 0-100,
    "author": 0-100,
    "isbn": 0-100,
    "condition": 0-100,
    "grade": 0-100,
    "curriculum": 0-100,
    "price": 0-100
  }
}`;
}

// Build vision prompt for images
function buildVisionPrompt(hint?: { curriculum?: string; grade?: string }): string {
  let prompt = `Analyze these three book images to extract details for a SECOND-HAND book listing.

Image 1: Front cover - Extract title, author, edition, grade level
Image 2: Back cover - Look for ISBN, curriculum indicators, blurb
Image 3: Inside pages - CRITICALLY assess physical condition (wear, markings, page quality, binding)

IMPORTANT INSTRUCTIONS:
1. Examine ALL images carefully for signs of wear, damage, markings, and use
2. Price this as a USED book for resale - NOT at new retail prices
3. Your description MUST include specific observations about the book's physical condition
4. Typical used textbook prices are R30-R150, rarely exceeding R200`;

  if (hint?.curriculum) {
    prompt += `\n\nHint: User indicated curriculum is likely ${hint.curriculum}. Confirm or correct based on visual evidence.`;
  }
  if (hint?.grade) {
    prompt += `\n\nHint: User indicated grade level is likely ${hint.grade}. Confirm or correct based on visual evidence.`;
  }

  prompt += `\n\nRespond ONLY with valid JSON. Be REALISTIC about condition and pricing for the second-hand market.`;
  return prompt;
}

async function callOpenAIVision(
  imageUrls: [string, string, string],
  hints?: { curriculum?: string; grade?: string }
): Promise<any> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: getSystemPrompt(),
        },
        {
          role: "user",
          content: [
            { type: "text", text: buildVisionPrompt(hints) },
            { type: "image_url", image_url: { url: imageUrls[0], detail: "high" } },
            { type: "image_url", image_url: { url: imageUrls[1], detail: "high" } },
            { type: "image_url", image_url: { url: imageUrls[2], detail: "high" } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

function parseExtractedData(rawText: string): any {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(`Failed to parse extracted data: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

// Validate and cap prices to realistic second-hand ranges
function validatePrice(price: number, condition: string, grade?: string): number {
  // Define maximum prices based on condition
  const maxPrices: Record<string, number> = {
    "New": 200,
    "Good": 150,
    "Better": 120,
    "Average": 80,
    "Below Average": 50,
  };
  
  // Define minimum prices
  const minPrices: Record<string, number> = {
    "New": 60,
    "Good": 40,
    "Better": 30,
    "Average": 20,
    "Below Average": 10,
  };
  
  const maxPrice = maxPrices[condition] || 150;
  const minPrice = minPrices[condition] || 20;
  
  // If price seems too high, cap it
  if (price > maxPrice) {
    console.log(`Price ${price} exceeded max ${maxPrice} for ${condition} condition, capping`);
    return maxPrice;
  }
  
  // If price seems too low, set minimum
  if (price < minPrice) {
    return minPrice;
  }
  
  return Math.round(price);
}

serve(async (req) => {
  /* -------------------- CORS -------------------- */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are allowed",
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  /* -------------------- CONTENT-TYPE GUARD -------------------- */
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INVALID_CONTENT_TYPE",
        message: "Content-Type must be application/json",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  /* -------------------- SAFE JSON PARSE -------------------- */
  let bookRequest: BookDetailsRequest;
  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      throw new Error("Empty request body");
    }
    bookRequest = JSON.parse(rawBody);
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INVALID_JSON",
        message: "Request body must be valid JSON",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  /* -------------------- VALIDATION -------------------- */
  const { frontCoverUrl, backCoverUrl, insidePagesUrl, hints } = bookRequest;

  if (!frontCoverUrl || !backCoverUrl || !insidePagesUrl) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INVALID_PAYLOAD",
        message: "Missing required image URLs (frontCoverUrl, backCoverUrl, insidePagesUrl)",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate URLs are from Supabase Storage
  if (!isValidSupabaseStorageUrl(frontCoverUrl) || 
      !isValidSupabaseStorageUrl(backCoverUrl) || 
      !isValidSupabaseStorageUrl(insidePagesUrl)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INVALID_URLS",
        message: "All image URLs must be from Supabase Storage",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  /* -------------------- PROCESS WITH TIMEOUT -------------------- */
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI processing timeout (>45s)")), 45000)
    );

    const extractionPromise = (async () => {
      const rawContent = await callOpenAIVision(
        [frontCoverUrl, backCoverUrl, insidePagesUrl],
        hints
      );

      const extractedData = parseExtractedData(rawContent);

      if (!extractedData.title || !extractedData.author) {
        throw new Error("Could not extract title or author from images");
      }

      // Build rich condition-aware description
      let description = extractedData.description || "";
      const conditionKeywords = ["condition", "wear", "pages", "binding", "pristine", "markings", "yellowing", "damage", "creases", "scuffs"];
      const hasConditionInfo = conditionKeywords.some(keyword => 
        description.toLowerCase().includes(keyword)
      );
      
      if (!hasConditionInfo && extractedData.condition) {
        const conditionDescriptions: Record<string, string> = {
          "New": "This copy is in New condition—pages are crisp and unmarked, the binding is tight, and the cover shows no wear. An exceptional find for the second-hand market.",
          "Good": "This copy is in Good condition with minimal wear on the cover, clean unmarked pages, and a tight binding. A great second-hand purchase.",
          "Better": "This copy is in Better condition showing light wear on the cover and spine. Pages may have slight yellowing but no markings. Solid value for a used textbook.",
          "Average": "This copy is in Average condition with visible wear on the cover and spine. Some page yellowing and light pencil marks may be present. A budget-friendly option.",
          "Below Average": "This copy is in Below Average condition with significant wear, possible markings, and a loose binding. Ideal for buyers focused on content over appearance.",
        };
        description = `${description} ${conditionDescriptions[extractedData.condition] || ""}`;
      }

      // Validate and cap the price to realistic second-hand ranges
      const validatedPrice = validatePrice(
        extractedData.estimatedPrice || 50,
        extractedData.condition || "Average",
        extractedData.grade
      );

      const response: BookDetailsResponse = {
        success: true,
        data: {
          title: extractedData.title,
          author: extractedData.author,
          isbn: extractedData.isbn || undefined,
          description: description,
          condition: extractedData.condition || "Average",
          grade: extractedData.grade || undefined,
          curriculum: extractedData.curriculum || undefined,
          category: extractedData.category || undefined,
          estimatedPrice: validatedPrice,
          quantity: 1,
          confidence: extractedData.confidence,
        },
      };

      return response;
    })();

    const result = await Promise.race([extractionPromise, timeoutPromise]);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Extraction error:", errorMessage);
    
    let message = errorMessage;
    if (errorMessage.includes("timeout")) {
      message = "AI processing took too long. Please try again or enter details manually.";
    } else if (errorMessage.includes("Could not extract")) {
      message = "Could not read text from images. Please ensure images are clear and well-lit.";
    } else if (errorMessage.includes("OPENAI_API_KEY")) {
      message = "AI service is not properly configured.";
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "EXTRACTION_FAILED",
        message: message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
