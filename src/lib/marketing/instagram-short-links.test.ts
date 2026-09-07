import {
  buildInstagramShortLinkTarget,
  INSTAGRAM_SHORT_LINKS,
  normalizeInstagramShortCode,
} from "./instagram-short-links";

describe("instagram short links", () => {
  it("normalizes safe codes", () => {
    expect(normalizeInstagramShortCode(" Silk ")).toBe("silk");
    expect(normalizeInstagramShortCode("../x")).toBeNull();
    expect(normalizeInstagramShortCode("")).toBeNull();
  });

  it("maps known codes with UTM tags", () => {
    const url = buildInstagramShortLinkTarget(
      "silk",
      "https://www.sakthitextile.com",
    );
    expect(url.pathname).toBe(INSTAGRAM_SHORT_LINKS.silk);
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("utm_medium")).toBe("dm");
    expect(url.searchParams.get("utm_campaign")).toBe("silk");
  });

  it("falls back unknown codes to /collections/<code>", () => {
    const url = buildInstagramShortLinkTarget(
      "new-drop",
      "https://www.sakthitextile.com",
    );
    expect(url.pathname).toBe("/collections/new-drop");
    expect(url.searchParams.get("utm_campaign")).toBe("new-drop");
  });

  it("falls back invalid codes to /shop", () => {
    const url = buildInstagramShortLinkTarget(
      "!!",
      "https://www.sakthitextile.com",
    );
    expect(url.pathname).toBe("/shop");
    expect(url.searchParams.get("utm_campaign")).toBe("unknown");
  });
});
