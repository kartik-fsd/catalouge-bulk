import CatalogGenrator from "@/components/CatalogGenerator";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hired Nest - Product Catalog Generator",
  description:
    "Upload product images in bulk and generate detailed product descriptions and catalogs automatically.",
  keywords: [
    "Hired Nest",
    "bulk upload",
    "product catalog",
    "image processing",
    "AI descriptions",
  ],
  authors: [{ name: "Hired Nest" }],
  openGraph: {
    title: "Hired Nest - Product Catalog Generator",
    description:
      "Generate detailed product descriptions from images automatically",
    type: "website",
  },
};

export default function Page() {
  return <CatalogGenrator />;
}
