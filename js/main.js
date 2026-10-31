(() => {
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  const rm = matchMedia("(prefers-reduced-motion:reduce)").matches;

  // MOBILE MENU
  let lenis;
  let busy = 0; // a page transition is in flight

  const stg = window.stg || {
    norm: (p) =>
      p
        .replace(/\/index\.html?$/i, "/")
        .replace(/\.html?$/i, "")
        .replace(/\/+$/, "") || "/",
    NEXT: "stg-next-page-v3",
    SEEN: "stg-intro-seen-v2",
  };

  const nav = $("#menu")[0],
    bg = $("#burger")[0],
    root = document.documentElement,
    hd = $(".nav")[0],
    PT = $(".pt")[0];

  const setMenu = (o) => {
    nav.classList.toggle("open", o);
    bg.setAttribute("aria-expanded", o);
    bg.setAttribute("aria-label", o ? "Close menu" : "Open menu");
    root.classList.toggle("menu-open", o);
    if (o) hd.classList.remove("hide");
    if (lenis && !busy) o ? lenis.stop() : lenis.start();
  };

  bg.addEventListener("click", () => setMenu(!nav.classList.contains("open")));

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      setMenu(false);
      bg.focus();
    }
  });

  matchMedia("(min-width:901px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  addEventListener("pageshow", () => setMenu(false));

  // BOARDING PASS PREVIEW
  const f = $("form.bp")[0];

  if (f) {
    const P = $(".pass")[0];

    f.addEventListener("input", (e) => {
      const n = e.target.name;

      if (n === "urgent") {
        P.classList.toggle("pri", e.target.checked);
        return;
      }

      const o = $(`[data-f=${n}]`)[0];
      if (!o) return;

      let v = e.target.value;

      if (n === "date" && v)
        v = new Date(v).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        });

      o.textContent =
        n === "from" || n === "to"
          ? v.slice(0, 3) || o.dataset.d
          : v || o.dataset.d;
    });

    f.onsubmit = (e) => {
      e.preventDefault();
      P.classList.add("done");
      $(".ok")[0].hidden = false;
    };
  }

  // REDUCED MOTION AND LIBRARY FALLBACK
  if (rm || !window.gsap || !window.ScrollTrigger || !window.Lenis) {
    PT && PT.remove();
    $("#stg-loader").forEach((el) => el.remove());
    root.classList.remove(
      "stg-arriving",
      "stg-intro-pending",
      "stg-intro-active",
    );
    root.classList.add("stg-ready");
    // Without GSAP/Lenis there is no smooth transition: plain navigation.
    return;
  }

  // Wait for the web fonts BEFORE building any animation: headings are split
  // into words and measured, and a late font swap would make them jump.
  // The cover (or loader) is on screen meanwhile, so the wait is invisible.
  const start = () => {
    gsap.registerPlugin(ScrollTrigger);
    // Mobile address-bar show/hide fires resize; don't re-layout pins for it.
    ScrollTrigger.config({ ignoreMobileResize: true });
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    // PAGE TRANSITIONS
    // Each destination has its own aviation-themed copy.

    const transitionPages = {
      home: {
        heading: "Cleared for Takeoff",
        caption: "DEPARTURES / HOME",
      },
      about: {
        heading: "Our Flight Path",
        caption: "FLIGHT LOG / ABOUT",
      },
      services: {
        heading: "Flight Operations",
        caption: "FLIGHT PLAN / SERVICES",
      },
      contact: {
        heading: "Final Approach",
        caption: "ARRIVALS / CONTACT",
      },
    };

    const getTransitionPage = (pathname = location.pathname) => {
      const slug = pathname
        .replace(/\/+$/, "")
        .split("/")
        .pop()
        .replace(/\.html?$/i, "")
        .toLowerCase();

      if (!slug || slug === "index" || slug === "home")
        return transitionPages.home;

      if (slug.includes("about") || slug.includes("story"))
        return transitionPages.about;

      if (slug.includes("service") || slug.includes("solution"))
        return transitionPages.services;

      if (slug.includes("contact") || slug.includes("touch"))
        return transitionPages.contact;

      return {
        heading: "Now Boarding",
        caption: "YOUR NEXT DESTINATION",
      };
    };

    const introKey = stg.SEEN;

    const isFirstHomeVisit =
      root.classList.contains("stg-intro-pending") && !!$("#stg-loader")[0];

    const isArriving = root.classList.contains("stg-arriving");

    const hidePanel = () => {
      if (!PT) return;
      PT.classList.remove("is-active");
      root.classList.remove("stg-arriving");
    };

    // PAGE TRANSITION
    // The cover is a real panel (.p) inside .pt. It is positioned with GSAP
    // BEFORE .pt is made visible, so there is never a frame in the wrong place.

    // Departure: build the destination's panel offscreen right, slide it in.
    const cover = (pathname) => {
      const { heading, caption } = getTransitionPage(pathname);

      PT.innerHTML = "<div class='p'><b></b><span></span></div>";
      const P = $(".p", PT)[0];
      const X = $(".p>*", PT);
      X[0].textContent = heading;
      X[1].textContent = caption;

      gsap.set(P, { xPercent: 100, force3D: true });
      gsap.set(X, { opacity: 0, y: 20 });
      PT.classList.add("is-active");

      return gsap
        .timeline({ defaults: { ease: "expo.inOut" } })
        .to(P, { xPercent: 0, duration: 0.8 }, 0)
        .to(
          X,
          { opacity: 1, y: 0, duration: 0.42, stagger: 0.055, ease: "power3.out" },
          0.4,
        );
    };

    // Arrival: the page already painted this exact panel from static HTML.
    // Keep it, wait for fonts so the text can't swap mid-wipe, then sweep left.
    const uncover = () => {
      const P = $(".p", PT)[0];
      const X = $(".p>*", PT);

      gsap.set(P, { xPercent: 0, force3D: true });
      gsap.set(X, { opacity: 1, y: 0 });

      // .pt stays displayed through .is-active, then the arriving guard drops.
      PT.classList.add("is-active");
      root.classList.remove("stg-arriving");

      const tl = gsap
        .timeline({ paused: true, defaults: { ease: "expo.inOut" } })
        .to(
          X,
          { opacity: 0, y: -18, duration: 0.28, stagger: 0.045, ease: "power2.in" },
          0.08,
        )
        .to(P, { xPercent: -100, duration: 1.0 }, 0.18)
        .eventCallback("onComplete", hidePanel);

      requestAnimationFrame(() => tl.play());

      return tl;
    };

    // FIRST-VISIT HOMEPAGE INTRO
    // Displays once per tab/browser session.

    const runHomeIntro = () => {
      const overlay = $("#stg-loader")[0];
      if (!overlay) return;

      root.classList.add("stg-intro-active");
      lenis.stop();

      const aircraft = $(".stg-loader__aircraft", overlay)[0];
      const fill = $(".stg-loader__fill", overlay)[0];
      const number = $("[data-stg-progress]", overlay)[0];
      const progress = { n: 0 };

      gsap.set(aircraft, {
        y: 60,
        opacity: 0,
        scale: 0.86,
        force3D: true,
      });

      gsap.set(fill, {
        scaleX: 0,
        transformOrigin: "left center",
      });

      gsap
        .timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem(introKey, "1");
            } catch (_) {}

            root.classList.remove("stg-intro-pending", "stg-intro-active");

            overlay.remove();
            lenis.start();
            ScrollTrigger.refresh();
          },
        })
        .to(
          aircraft,
          {
            y: -20,
            opacity: 1,
            scale: 1,
            duration: 1.8,
            ease: "power2.inOut",
          },
          0.15,
        )
        .to(
          progress,
          {
            n: 100,
            duration: 2.1,
            ease: "power2.inOut",
            onUpdate: () => {
              const v = Math.round(progress.n);
              number.textContent = String(v).padStart(2, "0");
              gsap.set(fill, { scaleX: v / 100 });
            },
          },
          0.12,
        )
        .to(
          aircraft,
          {
            y: -125,
            opacity: 0,
            duration: 0.65,
            ease: "power2.in",
          },
          1.75,
        )
        .call(
          () => {
            // Reveal the website behind the loader.
            root.classList.remove("stg-intro-pending");
          },
          null,
          2.2,
        )
        .to(
          overlay,
          {
            yPercent: -101,
            duration: 1.0,
            ease: "expo.inOut",
            force3D: true,
          },
          2.22,
        );
    };

    // CHOOSE WHETHER TO SHOW INTRO OR ARRIVAL
    if (isFirstHomeVisit) {
      hidePanel();
      runHomeIntro();
    } else if (isArriving) {
      uncover();
    } else {
      // Normal reloads do not need a fake transition.
      hidePanel();
    }

    // INTERNAL NAVIGATION
    const flat = stg.norm;

    $("a[href]").forEach((a) => {
      const h = a.getAttribute("href");

      if (
        !h ||
        h[0] === "#" ||
        /^(https?:|mailto:|tel:)/i.test(h) ||
        a.target ||
        a.hasAttribute("download")
      )
        return;

      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
          return;

        const u = new URL(h, location.href);
        if (u.origin !== location.origin) return;

        e.preventDefault();
        if (busy) return;

        if (flat(u.pathname) === flat(location.pathname)) {
          lenis.scrollTo(u.hash || 0);
          return;
        }

        busy = 1;
        lenis.stop();

        // Leave the flag BEFORE the cover finishes, so even an early unload
        // (fast click-through, browser prefetch) still lands on a cover.
        try {
          sessionStorage.setItem(
            stg.NEXT,
            JSON.stringify({ p: flat(u.pathname), t: Date.now() }),
          );
        } catch (_) {}

        cover(u.pathname).eventCallback("onComplete", () => {
          location.assign(u.href);
        });
      });
    });

    addEventListener("pageshow", (e) => {
      if (e.persisted) {
        busy = 0;
        gsap.killTweensOf(".pt .p, .pt .p > *");
        hidePanel();
        lenis.start();
      }
    });

    // HEADER
    // Slides away on scroll down and returns on scroll up.

    lenis.on("scroll", ({ direction: d, scroll: y }) => {
      hd.classList.toggle(
        "hide",
        d === 1 && y > 240 && !nav.classList.contains("open"),
      );
    });

    // NAVIGATION HOVER INDICATOR
    if (matchMedia("(min-width:901px)").matches) {
      const ind = document.createElement("span");
      ind.className = "ind";
      nav.prepend(ind);
      hd.classList.add("has-ind");

      const ls = $("a", nav).filter((a) => !a.classList.contains("cta"));

      const to = (a) =>
        gsap.to(ind, {
          x: a.offsetLeft,
          width: a.offsetWidth,
          opacity: 1,
          duration: 0.5,
          ease: "expo.out",
          overwrite: true,
        });

      const rest = () => {
        const on = ls.find((a) => a.classList.contains("on"));

        on
          ? to(on)
          : gsap.to(ind, {
              opacity: 0,
              duration: 0.3,
            });
      };

      ls.forEach((a) => a.addEventListener("mouseenter", () => to(a)));

      nav.addEventListener("mouseleave", rest);
      rest();
    }

    // HEADING WORD SPLITTING
    // Preserves accent spans.

    const split = (el, cls) => {
      const walk = (n) =>
        [...n.childNodes].forEach((c) => {
          if (c.nodeType === 3) {
            if (!c.textContent.trim()) return;

            const f = document.createDocumentFragment();

            c.textContent.split(/(\s+)/).forEach((t) => {
              if (!t) return;

              if (/^\s+$/.test(t) || /^[,.;:!?]+$/.test(t)) {
                f.append(t);
                return;
              }

              const w = document.createElement("span");
              w.className = cls;

              if (cls === "w") {
                w.innerHTML = `<span>${t}</span>`;
              } else {
                w.textContent = t;
              }

              f.append(w);
            });

            c.replaceWith(f);
          } else if (c.nodeType === 1) {
            walk(c);
          }
        });

      walk(el);
    };

    // ANIMATED HEADING WORDS

    const pop = (el, delay, st) => {
      split(el, "pw");

      const tl = gsap.timeline({
        delay,
        scrollTrigger: st,
      });

      $(".pw", el).forEach((w, i) => {
        const a = !!w.closest(".hb,.hr,em");
        const r = a ? 18 : 12;

        tl.from(
          w,
          {
            scale: a ? 0.1 : 0.2,
            opacity: 0,
            y: a ? 70 : 50,
            rotation: gsap.utils.random(-r, r),
            transformOrigin: "50% 85%",
            duration: a ? 1.1 : 0.9,
            ease: a ? "back.out(3.2)" : "back.out(2.4)",
          },
          i * 0.08,
        );
      });
    };

    $("[data-pop]").forEach((el) =>
      pop(el, el.matches("h1") ? 0.9 : 0, {
        trigger: el,
        start: "top 88%",
      }),
    );

    // ANIMATED NUMBER COUNTERS
    $("[data-count]").forEach((el) => {
      const t = +el.dataset.count;
      const o = { v: 0 };

      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () =>
          gsap.to(o, {
            v: t,
            duration: 2,
            ease: "power3.out",
            onUpdate: () => (el.firstChild.nodeValue = Math.round(o.v)),
          }),
      });
    });

    // HOME HERO PLANE WINDOW ANIMATION
    if ($(".hero")[0]) {
      pop($(".hero h1")[0], isFirstHomeVisit ? 3.25 : 0.95);

      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "+=130%",
            pin: true,
            scrub: 0.6,
            refreshPriority: 10,
          },
        })
        .to(
          ".hero-win",
          {
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            ease: "power2.inOut",
          },
          0,
        )
        .to(".hero-win img", { scale: 1.14 }, 0)
        .to(".l1", { xPercent: -80, opacity: 0 }, 0.1)
        .to(".l2", { xPercent: 80, opacity: 0 }, 0.1)
        .to(".hero-hint", { opacity: 0 }, 0)
        .from(".hero-cap", { opacity: 0, y: 40 }, 0.55);
    }

    // LOGO MARQUEE
    // Speed responds to scroll velocity.

    const mt = $(".mq-track")[0];

    if (mt) {
      const mq = gsap.to(mt, {
        xPercent: -50,
        duration: 30,
        ease: "none",
        repeat: -1,
      });

      ScrollTrigger.create({
        onUpdate: (s) => mq.timeScale(1 + Math.abs(s.getVelocity()) / 300),
      });

      gsap.ticker.add(() =>
        mq.timeScale(mq.timeScale() + (1 - mq.timeScale()) * 0.06),
      );
    }

    // COLLAGE PARALLAX
    $("[data-sp]").forEach((el) =>
      gsap.to(el, {
        y: -el.dataset.sp,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }),
    );

    // SERVICE ROW EXPANSION
    const rows = $(".row");

    rows.forEach((r) => {
      const on = () => {
        rows.forEach((x) => x.classList.remove("on"));
        r.classList.add("on");
      };

      r.onmouseenter = on;
      r.onclick = on;
    });

    // FLIGHT PATH SCROLL ANIMATION
    // Plane follows the curved SVG path.

    const fp = $("#fp path.dr")[0];

    if (fp)
      ScrollTrigger.matchMedia({
        "(min-width:901px)": () => {
          const L = fp.getTotalLength();
          const pl = $(".plane")[0];
          const st = $(".stop");
          const pt = (t) => fp.getPointAtLength(L * t);
          const o = { t: 0 };

          fp.style.strokeDasharray = L;
          fp.style.strokeDashoffset = L;

          st.forEach((s) => {
            const p = pt(+s.dataset.t);
            s.style.left = p.x / 12 + "%";
            s.style.top = p.y / 4 + "%";
          });

          gsap
            .timeline({
              scrollTrigger: {
                trigger: ".fp",
                pin: true,
                scrub: 0.7,
                end: "+=240%",
                refreshPriority: 9,
              },
            })
            .to(
              fp,
              {
                strokeDashoffset: 0,
                ease: "none",
                duration: 1,
              },
              0,
            )
            .to(
              o,
              {
                t: 1,
                ease: "none",
                duration: 1,
                onUpdate() {
                  const p = pt(o.t);
                  const q = pt(Math.min(1, o.t + 0.01));

                  pl.style.left = p.x / 12 + "%";
                  pl.style.top = p.y / 4 + "%";

                  pl.style.transform = `rotate(${
                    Math.atan2(q.y - p.y, (q.x - p.x) * 3) * 57.3
                  }deg)`;

                  st.forEach((s) =>
                    s.classList.toggle("on", o.t >= +s.dataset.t - 0.02),
                  );
                },
              },
              0,
            );
        },
      });

    // ABOUT PAGE HERO ANIMATION
    if ($(".ab-hero")[0]) {
      pop($(".ab-hero h1")[0], 0.95);

      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".ab-hero",
            start: "top top",
            end: "+=120%",
            pin: true,
            scrub: 0.6,
            refreshPriority: 10,
          },
        })
        .to(
          ".ab-hero .im",
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "power2.inOut",
          },
          0,
        )
        .to(".ab-hero img", { scale: 1.12 }, 0)
        .to(".ab-hero .ln:first-child", { xPercent: -30 }, 0)
        .to(".ab-hero .ln:last-child", { xPercent: 30 }, 0);
    }

    // ABOUT STORY CHAPTERS
    const ims = $(".st-img img");

    $(".chap").forEach((c, i) =>
      ScrollTrigger.create({
        trigger: c,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (s) => {
          if (s.isActive)
            ims.forEach(
              (m, j) =>
                j &&
                gsap.to(m, {
                  clipPath:
                    j <= i ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
                  duration: 1,
                  ease: "expo.out",
                }),
            );
        },
      }),
    );

    // PILL ANIMATIONS
    $(".pil div").forEach((d) =>
      gsap.from(d, {
        "--s": 0,
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: {
          trigger: d,
          start: "top 88%",
        },
      }),
    );

    // CARD REVEAL
    $(".cr").forEach((r) =>
      gsap.from(r, {
        opacity: 0,
        y: 30,
        duration: 0.9,
        ease: "expo.out",
        scrollTrigger: {
          trigger: r,
          start: "top 92%",
        },
      }),
    );

    // SERVICES: DEPARTURE BOARD SCRAMBLE
    const ch = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

    const scr = (el) => {
      const t = el.dataset.t || (el.dataset.t = el.textContent);

      let k = 0;

      const id = setInterval(() => {
        el.textContent = [...t]
          .map((c, i) =>
            c === " " || i < k / 2 ? c : ch[(Math.random() * ch.length) | 0],
          )
          .join("");

        if (++k > t.length * 2) {
          el.textContent = t;
          clearInterval(id);
        }
      }, 28);
    };

    $(".drow span,.drow em").forEach((e, i) =>
      setTimeout(() => scr(e), 1000 + i * 55),
    );

    // SERVICES IMAGE WIPES AND LIST REVEAL
    $(".sv").forEach((s) => {
      const w = $(".sv-img", s)[0];

      gsap.fromTo(
        w,
        {
          clipPath: "inset(100% 0 0 0)",
        },
        {
          clipPath: "inset(0% 0 0 0)",
          ease: "none",
          scrollTrigger: {
            trigger: s,
            start: "top 90%",
            end: "top 20%",
            scrub: true,
          },
        },
      );

      gsap.fromTo(
        $("img", w),
        {
          scale: 1.25,
        },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: s,
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        },
      );

      $("li", s).forEach((l) =>
        gsap.from(l, {
          x: 30,
          opacity: 0,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: {
            trigger: l,
            start: "top 92%",
          },
        }),
      );
    });

    // CONTACT: BOARDING PASS ENTRANCE
    if ($(".pass")[0])
      gsap.from(".pass", {
        y: 80,
        rotate: -3,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        delay: isArriving ? 1.2 : 1,
      });

    // Every start state is now set: let the guarded elements show.
    root.classList.add("stg-ready");

    addEventListener("load", () => ScrollTrigger.refresh());
  };

  let started = 0;
  const go = () => {
    if (started++) return;
    start();
  };
  Promise.race([
    (document.fonts && document.fonts.ready) || Promise.resolve(),
    new Promise((r) => setTimeout(r, 1500)),
  ]).then(go, go);
})();
