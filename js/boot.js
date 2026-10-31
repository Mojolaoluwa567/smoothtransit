/* Smooth Transit Global — early boot guard.
   Loaded synchronously in <head> on EVERY page, before first paint.
   Decides whether this load is (a) arriving from one of our own page
   transitions, or (b) the first-ever home visit, and sets root classes so
   the CSS can paint the right cover immediately. */
(() => {
  const root = document.documentElement;
  root.classList.add("js");

  // "/about", "/about.html", "/about/" -> "/about";  "/", "/index.html" -> "/"
  const norm = (p) =>
    p
      .replace(/\/index\.html?$/i, "/")
      .replace(/\.html?$/i, "")
      .replace(/\/+$/, "") || "/";

  // Pinned/scrubbed sections can't be restored by the browser reliably
  // (it restores before pins exist, then the page jumps). Always start at top.
  try {
    history.scrollRestoration = "manual";
  } catch (_) {}

  const S = (window.stg = {
    norm,
    NEXT: "stg-next-page-v3",
    SEEN: "stg-intro-seen-v2",
  });

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("stg-ready");
    return;
  }

  try {
    let d = null;
    try {
      d = JSON.parse(sessionStorage.getItem(S.NEXT));
    } catch (_) {}
    sessionStorage.removeItem(S.NEXT);

    const here = norm(location.pathname);
    const isHome = here === "/";
    const arriving = !!d && d.p === here && Date.now() - d.t < 10000;

    if (arriving) {
      root.classList.add("stg-arriving");
      if (isHome) sessionStorage.setItem(S.SEEN, "1");
    } else if (isHome && !sessionStorage.getItem(S.SEEN)) {
      root.classList.add("stg-intro-pending");
    }
  } catch (_) {
    // Storage blocked: just render the page normally.
  }

  // Failsafe: if scripts never finish (offline CDN, etc.) never leave the
  // visitor staring at a cover or a hidden page.
  setTimeout(() => {
    root.classList.remove("stg-arriving", "stg-intro-pending");
    root.classList.add("stg-ready");
  }, 8000);
})();
