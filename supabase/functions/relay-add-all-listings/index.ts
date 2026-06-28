import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing Supabase configuration",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all listings from all three tables where available_quantity > 0
    const [booksRes, uniformsRes, suppliesRes] = await Promise.all([
      supabase
        .from("books")
        .select("*")
        .gt("available_quantity", 0)
        .eq("sold", false),
      supabase
        .from("uniforms")
        .select("*")
        .gt("available_quantity", 0)
        .eq("sold", false),
      supabase
        .from("school_supplies")
        .select("*")
        .gt("available_quantity", 0)
        .eq("sold", false),
    ]);

    const listings: any[] = [];
    const errors: any[] = [];

    if (booksRes.data) {
      listings.push(...booksRes.data.map((book) => ({ ...book, item_type: "textbook" })));
    }
    if (booksRes.error) {
      errors.push({ table: "books", error: booksRes.error });
    }

    if (uniformsRes.data) {
      listings.push(...uniformsRes.data.map((uniform) => ({ ...uniform, item_type: "uniform" })));
    }
    if (uniformsRes.error) {
      errors.push({ table: "uniforms", error: uniformsRes.error });
    }

    if (suppliesRes.data) {
      listings.push(...suppliesRes.data.map((supply) => ({ ...supply, item_type: "school_supply" })));
    }
    if (suppliesRes.error) {
      errors.push({ table: "school_supplies", error: suppliesRes.error });
    }

    if (errors.length > 0) {
      console.error("Errors fetching listings:", errors);
    }

    console.log(`Processing ${listings.length} listings for relay`);

    // Process each listing
    const results = {
      total: listings.length,
      sent: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const listing of listings) {
      try {
        const merchantRow = buildMerchantPayload(listing);

        const webhookPayload = {
          eventType: "add_listing",
          timestamp: new Date().toISOString(),
          source: "rebooked-solutions",
          data: merchantRow,
          raw: listing,
        };

        const response = await fetch(RELAY_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        if (response.ok) {
          results.sent++;
          results.details.push({
            listingId: merchantRow.id,
            title: merchantRow.title,
            status: "success",
          });
        } else {
          results.failed++;
          const responseText = await response.text();
          results.details.push({
            listingId: merchantRow.id,
            title: merchantRow.title,
            status: "failed",
            reason: `HTTP ${response.status}`,
          });
          console.error(`Failed to send listing ${merchantRow.id}:`, response.status, responseText);
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          listingId: listing.id,
          title: listing.title,
          status: "error",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`Error processing listing ${listing.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.total} listings`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("relay-add-all-listings error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
