import {
  CDN_PRESETS,
  cdnImageUrl,
  extractMediaObjectKey,
  getImageDeliveryMode,
} from "./cdn-image";

describe("cdn-image", () => {
  const prevMode = process.env.NEXT_PUBLIC_IMAGE_DELIVERY_MODE;
  const prevCdn = process.env.NEXT_PUBLIC_CDN_URL;

  afterEach(() => {
    if (prevMode === undefined)
      delete process.env.NEXT_PUBLIC_IMAGE_DELIVERY_MODE;
    else process.env.NEXT_PUBLIC_IMAGE_DELIVERY_MODE = prevMode;
    if (prevCdn === undefined) delete process.env.NEXT_PUBLIC_CDN_URL;
    else process.env.NEXT_PUBLIC_CDN_URL = prevCdn;
  });

  it("defaults to cloudflare mode once CF CDN is validated", () => {
    delete process.env.NEXT_PUBLIC_IMAGE_DELIVERY_MODE;
    expect(getImageDeliveryMode()).toBe("cloudflare");
  });

  it("extracts keys from r2.dev and raw paths", () => {
    process.env.NEXT_PUBLIC_CDN_URL =
      "https://pub-351c586a832c41d6816471c888ca13c4.r2.dev";
    expect(
      extractMediaObjectKey(
        "https://pub-351c586a832c41d6816471c888ca13c4.r2.dev/sakthi/upload-a.webp",
      ),
    ).toBe("sakthi/upload-a.webp");
    expect(extractMediaObjectKey("uploads/upload-x.webp")).toBe(
      "uploads/upload-x.webp",
    );
    expect(extractMediaObjectKey("/images/logo.png")).toBeNull();
  });

  it("legacy mode returns absolute URL unchanged", () => {
    process.env.NEXT_PUBLIC_IMAGE_DELIVERY_MODE = "legacy";
    const src = "https://cdn.example/sakthi/a.webp";
    expect(cdnImageUrl(src, CDN_PRESETS.card)).toBe(src);
    expect(getImageDeliveryMode()).toBe("legacy");
  });

  it("cloudflare mode builds /cdn resize URL for sakthi keys", () => {
    process.env.NEXT_PUBLIC_IMAGE_DELIVERY_MODE = "cloudflare";
    process.env.NEXT_PUBLIC_MEDIA_CDN_ORIGIN =
      "https://sakthi-textile-media-proxy.stsareess.workers.dev";
    const url = cdnImageUrl("sakthi/upload-a.webp", CDN_PRESETS.card);
    expect(url).toContain("/cdn/w=400,q=75,f=webp/sakthi/upload-a.webp");
  });
});
