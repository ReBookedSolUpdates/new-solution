import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RELAY_WEBHOOK_URL =
  "https://hook.relay.app/api/v1/playbook/cmo8ds8ui0moz0om02a82hi14/trigger/1jeAWmRwgGhkNo0I_dR0Hw";

const SITE_BASE_URL = "https://rebookedsolutions.co.za";

// Map our internal item types to landing page paths used in the live site
const ITEM_TYPE_LINK_MAP: Record<string, string> = {
  textbook: "textbook",
  book: "textbook",
  uniform: "school-uniform",
  school_supply: "supplies",
  supply: "supplies",
};

// Approximate parcel weights/sizes per category (used for description hints)
const PARCEL_DETAILS: Record<string, string> = {
  extra_small: "Extra Small parcel (<1kg)",
  small: "Small parcel (~1-2kg)",
  medium: "Medium parcel (~2-5kg)",
  large: "Large parcel (~5-10kg)",
  extra_large: "Extra Large parcel (>10kg)",
};

function truncate(value: string, max: number): string {
  if (!value) return "";
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function mapCondition(condition?: string): "new" | "used" {
  if (!condition) return "used";
  return condition.toLowerCase() === "new" ? "new" : "used";
}

function mapGender(gender?: string): string {
  if (!gender) return "";
  const g = gender.toLowerCase();
  if (g.startsWith("m")) return "male";
  if (g.startsWith("f")) return "female";
  return "unisex";
}

function mapAgeGroup(grade?: string, itemType?: string): string {
  // Default to adult for university-level books
  if (!grade) return itemType === "textbook" ? "adult" : "children";
  const g = String(grade).toLowerCase();
  if (g.includes("university") || g.includes("college")) return "adult";
  if (g.includes("grade r") || g.includes("pre")) return "toddler";
  // Numeric grade extraction
  const num = parseInt(g.replace(/\D/g, ""), 10);
  if (!isNaN(num)) {
    if (num <= 3) return "toddler";
    if (num <= 7) return "children";
    return "children";
  }
  return "children";
}

function buildLink(itemType: string, id: string): string {
  const path = ITEM_TYPE_LINK_MAP[itemType] || "textbook";
  return `${SITE_BASE_URL}/${path}/${id}`;
}

/**
 * Convert a Lovable listing payload into a Google Merchant Center feed row.
 * Required fields: id, title, description, availability, link, image_link,
 * price, identifier_exists, brand. Apparel-required: color, size, gender,
 * material, pattern, age_group. Plus condition.
 */
function buildMerchantPayload(listing: any) {
  const itemType: string = listing.item_type || listing.itemType || "textbook";
  const id: string = String(listing.id || listing.listing_id || crypto.randomUUID());
  const isApparel = itemType === "uniform";
  const isSupply = itemType === "school_supply" || itemType === "supply";

  // Title: max 150 chars
  const titleParts = [
    listing.title,
    isApparel && listing.school_name ? `- ${listing.school_name}` : "",
    isApparel && listing.size ? `Size ${listing.size}` : "",
  ].filter(Boolean);
  const title = truncate(titleParts.join(" ") || "Untitled Listing", 150);

  // Description: max 200 chars; enrich with parcel/material info
  const descParts: string[] = [];
  if (listing.description) descParts.push(listing.description);
  if (listing.parcel_size && PARCEL_DETAILS[listing.parcel_size]) {
    descParts.push(PARCEL_DETAILS[listing.parcel_size]);
  }
  if (isApparel && listing.color) descParts.push(`Color: ${listing.color}`);
  if (isSupply && listing.subject) descParts.push(`Subject: ${listing.subject}`);
  const description = truncate(descParts.join(" • ") || title, 200);

  // Image link (required)
  const imageLink =
    listing.front_cover ||
    listing.image_url ||
    listing.imageUrl ||
    (Array.isArray(listing.additional_images) && listing.additional_images[0]) ||
    "";

  // Additional images (comma-separated, max 10)
  const additionalImages: string[] = [];
  if (listing.back_cover) additionalImages.push(listing.back_cover);
  if (listing.inside_pages) additionalImages.push(listing.inside_pages);
  if (Array.isArray(listing.additional_images)) {
    for (const img of listing.additional_images) {
      if (img && img !== imageLink && additionalImages.length < 10) {
        additionalImages.push(img);
      }
    }
  }

  // Price formatted as "X.XX ZAR"
  const priceNum = Number(listing.price || 0);
  const price = `${priceNum.toFixed(2)} ZAR`;

  // Brand: school name for uniforms, "ReBooked" for everything else
  const brand =
    (isApparel && listing.school_name) ||
    listing.brand ||
    listing.publisher ||
    "ReBooked Solutions";

  // Quantity available
  const quantity = listing.available_quantity ?? listing.initial_quantity ?? 1;

  // Build base merchant row
  const merchantRow: Record<string, any> = {
    id,
    title,
    description,
    availability: quantity > 0 ? "in_stock" : "out_of_stock",
    link: buildLink(itemType, id),
    image_link: imageLink,
    additional_image_link: additionalImages.join(","),
    price,
    identifier_exists: listing.isbn ? "yes" : "no",
    gtin: listing.isbn || "",
    mpn: id,
    brand,
    condition: mapCondition(listing.condition),
    adult: "no",
    sell_on_google_quantity: quantity,
    product_highlight: [
      isApparel ? "School-approved uniform" : null,
      itemType === "textbook" ? "Pre-loved textbook" : null,
      isSupply ? "Quality school supply" : null,
      listing.condition ? `Condition: ${listing.condition}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
    product_detail: [
      itemType ? `category:item_type:${itemType}` : null,
      listing.grade ? `education:grade:${listing.grade}` : null,
      listing.university ? `education:university:${listing.university}` : null,
      listing.subject ? `education:subject:${listing.subject}` : null,
      listing.parcel_size ? `shipping:parcel_size:${listing.parcel_size}` : null,
      listing.province ? `location:province:${listing.province}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  };

  // Apparel-specific required fields
  if (isApparel) {
    merchantRow.color = listing.color || "Multi";
    merchantRow.size = listing.size || "One Size";
    merchantRow.size_type = "regular";
    merchantRow.size_system = "UK";
    merchantRow.gender = mapGender(listing.gender);
    merchantRow.material = listing.material || "Cotton blend";
    merchantRow.pattern = listing.pattern || "Solid";
    merchantRow.age_group = mapAgeGroup(listing.grade, itemType);
  } else {
    // Books / supplies still benefit from age_group
    merchantRow.age_group = mapAgeGroup(listing.grade, itemType);
  }

  return merchantRow;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const listing = payload.listing || payload;

    if (!listing || (!listing.title && !listing.id)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing listing data. Provide listing.title and listing.id (or other required fields).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantRow = buildMerchantPayload(listing);

    const webhookPayload = {
      eventType: "add_listing",
      timestamp: new Date().toISOString(),
      source: "rebooked-solutions",
      data: merchantRow,
      raw: listing,
    };

    console.log("Forwarding listing to Relay:", merchantRow.id, merchantRow.title);

    const response = await fetch(RELAY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Relay webhook failed:", response.status, responseText);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Relay webhook returned non-200",
          status: response.status,
          response: responseText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Listing forwarded to Relay",
        merchantRow,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("relay-add-listing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
