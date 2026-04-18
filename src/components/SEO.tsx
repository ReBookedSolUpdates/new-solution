import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  canonical?: string;
}

const SEO = ({
  title,
  description,
  keywords,
  image = "/og-image.png",
  url,
  type = "website",
  canonical,
}: SEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta description
    updateMetaTag("description", description);

    // Update keywords if provided
    if (keywords) {
      updateMetaTag("keywords", keywords);
    }

    // Update Open Graph tags
    updateMetaProperty("og:title", title);
    updateMetaProperty("og:description", description);
    updateMetaProperty("og:image", image);
    updateMetaProperty("og:type", type);
    updateMetaProperty("og:site_name", "Rebooked Solutions");

    if (url) {
      updateMetaProperty("og:url", url);
    }

    // Update Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", image);

    // Update Canonical link
    if (canonical || url) {
      updateLinkTag("canonical", canonical || url || "");
    }

    // Add hreflang tags
    updateLinkTag("alternate", "https://rebookedsolutions.co.za", { hreflang: "en-ZA" });
    updateLinkTag("alternate", "https://rebookedsolutions.co.za", { hreflang: "x-default" });

    return () => {
      // Reset title to default when component unmounts
      document.title = "ReBooked Solutions - Buy and Sell Textbooks Securely";
    };
  }, [title, description, keywords, image, url, type, canonical]);

  const updateMetaTag = (name: string, content: string) => {
    let element = document.querySelector(`meta[name="${name}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("name", name);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  };

  const updateMetaProperty = (property: string, content: string) => {
    let element = document.querySelector(`meta[property="${property}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("property", property);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  };

  const updateLinkTag = (rel: string, href: string, attributes: Record<string, string> = {}) => {
    let selector = `link[rel="${rel}"]`;
    if (attributes.hreflang) {
      selector += `[hreflang="${attributes.hreflang}"]`;
    }

    let element = document.querySelector(selector);
    if (!element) {
      element = document.createElement("link");
      element.setAttribute("rel", rel);
      Object.entries(attributes).forEach(([key, value]) => {
        element?.setAttribute(key, value);
      });
      document.head.appendChild(element);
    }
    element.setAttribute("href", href);
  };

  return null;
};

export default SEO;
