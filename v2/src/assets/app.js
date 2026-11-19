(function () {
  var root = (document.body.getAttribute("data-root") || "/").replace(/\/?$/, "/");

  function href(id) {
    return root + "article/" + id + "/";
  }

  var openButton = document.querySelector("[data-nav-open]");
  var closeButton = document.querySelector("[data-nav-close]");
  var panel = document.querySelector("[data-nav-panel]");
  var backdrop = document.querySelector("[data-nav-backdrop]");

  function setNav(open) {
    if (!panel || !backdrop) return;
    panel.hidden = !open;
    backdrop.hidden = !open;
  }

  if (openButton) openButton.addEventListener("click", function () { setNav(true); });
  if (closeButton) closeButton.addEventListener("click", function () { setNav(false); });
  if (backdrop) backdrop.addEventListener("click", function () { setNav(false); });
  if (panel) {
    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setNav(false); });
    });
  }

  document.querySelectorAll("[data-nav-drop]").forEach(function (drop) {
    var toggle = drop.querySelector("[data-nav-drop-toggle]");
    if (!toggle) return;
    function setDrop(open) {
      drop.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    toggle.addEventListener("click", function () {
      var open = !drop.classList.contains("is-open") || drop.classList.contains("is-shut");
      drop.classList.remove("is-shut");
      setDrop(open);
    });
    drop.addEventListener("mouseenter", function () { toggle.setAttribute("aria-expanded", "true"); });
    drop.addEventListener("mouseleave", function () {
      drop.classList.remove("is-shut");
      if (!drop.classList.contains("is-open")) toggle.setAttribute("aria-expanded", "false");
    });
    drop.addEventListener("focusout", function (event) {
      if (!drop.contains(event.relatedTarget)) { drop.classList.remove("is-shut"); setDrop(false); }
    });
    drop.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setDrop(false);
        drop.classList.add("is-shut");
        toggle.focus();
      }
    });
    document.addEventListener("click", function (event) { if (!drop.contains(event.target)) setDrop(false); });
  });

  var promptInput = document.querySelector("[data-prompts]");
  if (promptInput) {
    var prompts = JSON.parse(promptInput.getAttribute("data-prompts"));
    var promptIndex = 0;
    window.setInterval(function () {
      if (document.activeElement === promptInput || promptInput.value) return;
      promptIndex = (promptIndex + 1) % prompts.length;
      promptInput.placeholder = prompts[promptIndex];
    }, 3000);
  }

  document.querySelectorAll("[data-back]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (window.history.length > 1) window.history.back();
      else window.location.href = root;
    });
  });

  document.querySelectorAll("[data-random]").forEach(function (button) {
    button.addEventListener("click", function () {
      var ids = JSON.parse(button.getAttribute("data-random") || "[]");
      if (!ids.length) return;
      window.location.href = href(ids[Math.floor(Math.random() * ids.length)]);
    });
  });

  document.querySelectorAll("[data-share]").forEach(function (button) {
    button.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          button.title = "Link copied";
        });
      }
    });
  });

  var progress = document.querySelector("[data-progress]");
  if (progress) {
    var onScroll = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? Math.min((window.scrollY / max) * 100, 100) : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var bookmarkKey = "knowledge-bookmarks";
  function bookmarks() {
    try {
      return JSON.parse(window.localStorage.getItem(bookmarkKey) || "[]");
    } catch (error) {
      return [];
    }
  }
  document.querySelectorAll("[data-bookmark]").forEach(function (button) {
    var slug = button.getAttribute("data-slug");
    function paint() {
      var on = bookmarks().some(function (item) { return item.slug === slug; });
      button.classList.toggle("is-on", on);
      button.title = on ? "Remove bookmark" : "Bookmark";
    }
    button.addEventListener("click", function () {
      var list = bookmarks().filter(function (item) { return item.slug !== slug; });
      if (!button.classList.contains("is-on")) {
        list.push({
          slug: slug,
          title: button.getAttribute("data-title") || slug,
          savedAt: new Date().toISOString(),
        });
      }
      window.localStorage.setItem(bookmarkKey, JSON.stringify(list));
      paint();
    });
    paint();
  });

  var filterList = document.querySelector("[data-filter-list]");
  var filterInput = document.querySelector("[data-filter-input]");
  if (filterList && filterInput) {
    filterInput.addEventListener("input", function () {
      var query = filterInput.value.toLowerCase();
      filterList.querySelectorAll("[data-item]").forEach(function (item) {
        item.hidden = query.length > 0 && item.getAttribute("data-item").indexOf(query) === -1;
      });
    });
  }

  var dataNode = document.getElementById("search-data");
  if (!dataNode) return;
  var catalogNode = document.getElementById("catalog-data");
  var records = JSON.parse(dataNode.textContent || "[]");
  var categories = JSON.parse(catalogNode ? catalogNode.textContent : "[]");
  var categoryById = {};
  categories.forEach(function (category) { categoryById[category.id] = category; });

  var input = document.querySelector("[data-search-input]");
  var results = document.querySelector("[data-search-results]");
  var title = document.querySelector("[data-search-title]");
  var countLabel = document.querySelector("[data-search-count-label]");
  var params = new URLSearchParams(window.location.search);
  var query = (params.get("q") || "").trim();
  var selected = "";
  if (input) input.value = query;

  function matches(record, q) {
    if (!q) return true;
    return record.text.indexOf(q.toLowerCase()) !== -1;
  }

  function draw() {
    var q = input ? input.value.trim() : query;
    var hits = records.filter(function (record) {
      return matches(record, q) && (!selected || record.category === selected);
    });
    var pool = records.filter(function (record) { return matches(record, q); });
    if (title) title.textContent = q ? "Results for \"" + q + "\"" : "Search Knowledge";
    if (countLabel) {
      countLabel.textContent = hits.length + (hits.length === 1 ? " card" : " cards");
    }
    document.querySelectorAll("[data-search-count]").forEach(function (node) {
      var id = node.getAttribute("data-search-count");
      node.textContent = String(pool.filter(function (record) { return record.category === id; }).length);
    });
    document.querySelectorAll("[data-search-cat]").forEach(function (button) {
      button.classList.toggle("is-on", (button.getAttribute("data-search-cat") || "") === selected);
      var id = button.getAttribute("data-search-cat");
      if (id && pool.every(function (record) { return record.category !== id; })) button.hidden = true;
      else button.hidden = false;
    });
    if (!results) return;
    results.replaceChildren();
    if (!hits.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No cards found.";
      results.appendChild(empty);
      return;
    }
    hits.forEach(function (record) {
      var category = categoryById[record.category] || { name: record.category, color: "#60a5fa" };
      var link = document.createElement("a");
      link.className = "tile search-hit";
      link.href = href(record.id);
      var top = document.createElement("div");
      top.className = "tile-top";
      var pill = document.createElement("span");
      pill.className = "pill";
      pill.style.color = category.color;
      pill.style.background = category.color + "22";
      pill.textContent = category.name;
      var status = document.createElement("span");
      status.className = "status " + (record.status.indexOf("unsourced") !== -1 ? "status-unsourced" : "status-other");
      status.textContent = record.status;
      top.append(pill, status);
      var heading = document.createElement("h2");
      heading.textContent = record.title;
      var summary = document.createElement("p");
      summary.textContent = record.summary;
      var meta = document.createElement("div");
      meta.className = "tile-meta";
      meta.textContent = record.claim_type;
      link.append(top, heading, summary, meta);
      results.appendChild(link);
    });
  }

  document.querySelectorAll("[data-search-cat]").forEach(function (button) {
    button.addEventListener("click", function () {
      selected = button.getAttribute("data-search-cat") || "";
      draw();
    });
  });
  if (input) input.addEventListener("input", draw);
  draw();
})();
