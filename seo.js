const page = document.body?.dataset;
const canonicalPath = page?.seoPath || window.location.pathname;

function absoluteUrl(path) {
  return new URL(path, window.location.origin).href;
}

function setMeta(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.setAttribute("content", value);
}

function addStructuredData(data) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.append(script);
}

function buildBreadcrumbs(canonical) {
  const crumbs = [
    { name: "Learn Pickleball", item: absoluteUrl("/") },
  ];

  if (canonicalPath !== "/") {
    crumbs.push({ name: "Learn", item: absoluteUrl("/learn-pickleball/") });
  }

  if (page.seoTitle && canonicalPath !== "/learn-pickleball/") {
    crumbs.push({ name: page.seoTitle, item: canonical });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

function initialiseSeo() {
  if (!page?.seoTitle || !page?.seoDescription) return;

  const canonical = absoluteUrl(canonicalPath);
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.href = canonical;

  setMeta('meta[property="og:url"]', canonical);
  setMeta('meta[property="og:image"]', page.seoImage ? absoluteUrl(page.seoImage) : "");
  setMeta('meta[name="twitter:image"]', page.seoImage ? absoluteUrl(page.seoImage) : "");

  addStructuredData(buildBreadcrumbs(canonical));

  if (page.seoType === "article") {
    addStructuredData({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.seoTitle,
      description: page.seoDescription,
      mainEntityOfPage: canonical,
      dateModified: page.seoReviewed || "2026-08-19",
      publisher: {
        "@type": "Organization",
        name: "Learn Pickleball",
      },
    });
  }
}

initialiseSeo();
