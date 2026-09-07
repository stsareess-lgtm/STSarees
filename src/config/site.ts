import type { NavItemWithOptionalChildren } from "@/types";

export type SiteConfig = typeof siteConfig;

/** Business card — Sakthi Textile */
const ADDRESS_LINES = [
  "337/55 Palakara Thottam Street",
  "Mottur, Elampillai PO",
  "Salem Dt, 637502",
] as const;

const PHONE = "+91 77080 69049";
const PHONE_HREF = "tel:+917708069049";
const EMAIL = "sakthitextilest@gmail.com";
const GSTIN = "33CUTPS8607N1ZM";

const CONTACTS = [
  {
    name: "Sakthi Textile",
    phone: PHONE,
    phoneHref: PHONE_HREF,
  },
] as const;

const SOCIAL = {
  instagram: "https://www.instagram.com/sakthitextiles",
  youtube: "https://www.youtube.com/@sakthitextiles",
  facebook: "https://www.facebook.com/sakthitextiles",
  whatsapp: "https://wa.me/917708069049",
} as const;

export const siteConfig = {
  /** Title-case shop board line (navbar/footer wordmark) */
  shopBoardName: "Sakthi Textile",
  name: "Sakthi Textile®",
  shortName: "Sakthi Textile",
  tagline: "THE QUALITY YOU CAN FEEL",
  /** Town shown on shop board / navbar */
  location: "ELAMPILLAI",
  description: "Authentic silk and cotton sarees — wholesale and retail",
  searchPlaceholder: "Search silk & cotton sarees, collections…",
  url: "https://www.sakthitextile.com",
  addressLines: ADDRESS_LINES,
  /** Single-line address for compact UI */
  address: ADDRESS_LINES.join(", "),
  phone: PHONE,
  /** `tel:` href (digits only, with country code) */
  phoneHref: PHONE_HREF,
  /** Contact persons used by shop-contact settings defaults */
  contacts: CONTACTS,
  email: EMAIL,
  gstin: GSTIN,
  currency: "INR",
  currencySymbol: "₹",
  social: SOCIAL,
  /** Top offer ribbon — rotates on the storefront */
  announcements: [
    {
      text: "Premium silk & cotton sarees — wholesale & retail at Sakthi Textile",
      href: "/shop",
      cta: "Shop now",
    },
    {
      text: "Visit our store in Salem · Call for orders & enquiries",
      href: "tel:+917708069049",
      cta: "Call us",
    },
    {
      text: "Explore Kanjivaram, wedding & festive collections",
      href: "/collections",
      cta: "View all",
    },
  ],
  mainNav: [
    {
      title: "Collections",
      href: "/collections",
      description: "Browse saree collections.",
      items: [],
    },
    {
      title: "Featured",
      href: "/featured",
      description: "Handpicked sarees.",
      items: [],
    },
    {
      title: "Orders",
      href: "/orders",
      description: "Your orders.",
      items: [],
    },
  ] satisfies NavItemWithOptionalChildren[],

  /** Storefront footer columns */
  footerNav: [
    {
      title: "Shop",
      items: [
        { title: "All sarees", href: "/shop", items: [] },
        { title: "Featured sarees", href: "/featured", items: [] },
        { title: "All categories", href: "/collections", items: [] },
        { title: "Wishlist", href: "/wish-list", items: [] },
        { title: "Cart", href: "/cart", items: [] },
      ],
    },
    {
      title: "Collections",
      items: [
        {
          title: "Kanjivaram Wedding",
          href: "/collections/kanjivaram-wedding-sarees",
          items: [],
        },
        {
          title: "Cotton Sarees",
          href: "/collections/cotton-sarees",
          items: [],
        },
        {
          title: "Soft Silk Sarees",
          href: "/collections/soft-silk-sarees",
          items: [],
        },
        {
          title: "Wedding Collections",
          href: "/collections/wedding-collections",
          items: [],
        },
        {
          title: "Traditional Silk",
          href: "/collections/traditional-silk-sarees",
          items: [],
        },
        { title: "View all categories", href: "/collections", items: [] },
      ],
    },
    {
      title: "Customer Service",
      items: [
        {
          title: "Shipping & Returns",
          href: "/shipping-returns",
          items: [],
        },
        { title: "Store Policy", href: "/store-policy", items: [] },
        { title: "Payment Methods", href: "/payment-methods", items: [] },
        { title: "FAQ", href: "/faq", items: [] },
        { title: "My orders", href: "/orders", items: [] },
      ],
    },
    {
      title: "About Sakthi Textile",
      items: [
        { title: "Our Story", href: "/about", items: [] },
        { title: "Our Collections", href: "/collections", items: [] },
        { title: "Visit our store", href: "/contact#store", items: [] },
        { title: "Contact", href: "/contact", items: [] },
      ],
    },
  ] satisfies NavItemWithOptionalChildren[],
};
