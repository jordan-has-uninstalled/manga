function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const themeBtn = document.getElementById("themeToggle");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }

  if (!themeBtn) return;

  function updateThemeButton() {
    themeBtn.textContent = document.body.classList.contains("dark")
      ? "light mode"
      : "dark mode";
  }

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );

    updateThemeButton();
  });

  updateThemeButton();
}

function initReader() {
  const reader = document.querySelector(".reader-single");
  if (!reader) return;

  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageIndicator = document.getElementById("pageIndicator");
  const fullscreenBtn = document.getElementById("fullscreenToggle");

  const base = reader.dataset.imageBase;
  const pageCount = parseInt(reader.dataset.pageCount || "0", 10);
  const ext = reader.dataset.imageExtension || "jpg";

  if (!base || pageCount <= 0) return;

  let currentPage = 1;
  const pageCache = new Map();
  const pageSources = [];

  const loader = document.createElement("div");
  loader.className = "reader-loader";
  loader.innerHTML = `
    <div class="reader-loader-text" id="readerLoaderText">loading page...</div>
    <div class="reader-loader-bar">
      <div class="reader-loader-fill" id="readerLoaderFill"></div>
    </div>
  `;

  const pageWrap = document.createElement("div");
  pageWrap.className = "reader-page active";

  const mainImg = document.createElement("img");
  mainImg.alt = "manga page";
  mainImg.draggable = false;

  pageWrap.appendChild(mainImg);

  reader.innerHTML = "";
  reader.appendChild(loader);
  reader.appendChild(pageWrap);

  const loaderText = loader.querySelector("#readerLoaderText");
  const loaderFill = loader.querySelector("#readerLoaderFill");

  for (let i = 1; i <= pageCount; i++) {
    const filename = `${String(i).padStart(3, "0")}.${ext}`;
    pageSources[i] = base + filename;
  }

  function isFullscreenReader() {
    return document.body.classList.contains("reader-fullscreen");
  }

  function showLoader(text = "loading page...", percent = null) {
    if (isFullscreenReader()) return;

    loader.style.display = "block";

    if (loaderText) {
      loaderText.textContent = text;
    }

    if (loaderFill) {
      loaderFill.style.width = percent !== null ? `${percent}%` : "0%";
    }
  }

  function hideLoader() {
    loader.style.display = "none";
  }

  function updateControls() {
    if (pageIndicator) {
      pageIndicator.textContent = `page ${currentPage} / ${pageCount}`;
    }

    if (prevBtn) {
      prevBtn.disabled = false;
    }

    if (nextBtn) {
      nextBtn.disabled = false;
    }
  }

  function getNextChapterLink() {
    return Array.from(document.querySelectorAll(".nav a")).find((link) =>
      link.textContent.toLowerCase().includes("next chapter")
    );
  }

  function getPreviousChapterLink() {
    return Array.from(document.querySelectorAll(".nav a")).find((link) =>
      link.textContent.toLowerCase().includes("previous chapter")
    );
  }

  function goToNextChapter() {
    const nextChapterLink = getNextChapterLink();
    if (!nextChapterLink) return;

    if (isFullscreenReader()) {
      sessionStorage.setItem("readerFullscreen", "true");
    } else {
      sessionStorage.removeItem("readerFullscreen");
    }

    window.location.href = nextChapterLink.href;
  }

  function goToPreviousChapter() {
    const previousChapterLink = getPreviousChapterLink();
    if (!previousChapterLink) return;

    if (isFullscreenReader()) {
      sessionStorage.setItem("readerFullscreen", "true");
    } else {
      sessionStorage.removeItem("readerFullscreen");
    }

    const url = new URL(previousChapterLink.href, window.location.href);
    url.searchParams.set("page", "last");
    window.location.href = url.toString();
  }

  function preloadNextChapter() {
    const nextChapterLink = getNextChapterLink();
    if (!nextChapterLink) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = nextChapterLink.href;
    document.head.appendChild(link);
  }

  function preloadImage(pageNumber) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      return Promise.resolve(null);
    }

    if (pageCache.has(pageNumber)) {
      return pageCache.get(pageNumber).promise;
    }

    const src = pageSources[pageNumber];
    const img = new Image();

    const promise = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`failed to load page ${pageNumber}`));
    });

    pageCache.set(pageNumber, { img, promise, src });
    img.src = src;

    return promise;
  }

  function preloadNearbyPages(centerPage) {
    const targets = [
      centerPage + 1,
      centerPage + 2,
      centerPage - 1,
      centerPage + 3,
    ];

    for (const pageNumber of targets) {
      if (pageNumber >= 1 && pageNumber <= pageCount) {
        preloadImage(pageNumber).catch(() => {});
      }
    }
  }

  async function showPage(pageNumber) {
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > pageCount) pageNumber = pageCount;

    currentPage = pageNumber;
    updateControls();

    if (!isFullscreenReader()) {
      showLoader(
        `loading page ${pageNumber}...`,
        Math.round((pageNumber / pageCount) * 100)
      );
    }

    try {
      const img = await preloadImage(pageNumber);

      if (!img) return;

      mainImg.src = img.src;
      mainImg.alt = `page ${pageNumber}`;

      if (!isFullscreenReader()) {
        hideLoader();
      }

      preloadNearbyPages(pageNumber);
    } catch (error) {
      if (!isFullscreenReader()) {
        if (loaderText) {
          loaderText.textContent = `could not load page ${pageNumber}`;
        }
        if (loaderFill) {
          loaderFill.style.width = "100%";
        }
      }
    }

    updateControls();
  }

  function goToPreviousPageOrChapter() {
    if (currentPage > 1) {
      showPage(currentPage - 1);
    } else {
      goToPreviousChapter();
    }
  }

  function goToNextPageOrChapter() {
    if (currentPage < pageCount) {
      showPage(currentPage + 1);
    } else {
      goToNextChapter();
    }
  }

  function updateFullscreenButton() {
    if (!fullscreenBtn) return;

    fullscreenBtn.textContent = isFullscreenReader()
      ? "exit fullscreen"
      : "fullscreen";
  }

  function enterFullscreenReader() {
    document.body.classList.add("reader-fullscreen");
    sessionStorage.setItem("readerFullscreen", "true");
    hideLoader();
    updateFullscreenButton();
  }

  function exitFullscreenReader() {
    document.body.classList.remove("reader-fullscreen");
    sessionStorage.removeItem("readerFullscreen");
    updateFullscreenButton();
  }

  function toggleFullscreenReader() {
    if (isFullscreenReader()) {
      exitFullscreenReader();
    } else {
      enterFullscreenReader();
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", goToPreviousPageOrChapter);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", goToNextPageOrChapter);
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreenReader);
  }

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    const typing =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      document.activeElement?.isContentEditable;

    if (typing) return;

    if (e.key === " ") {
      e.preventDefault();
    }

    if (e.key === "ArrowLeft") {
      goToPreviousPageOrChapter();
    } else if (e.key === "ArrowRight") {
      goToNextPageOrChapter();
    } else if (e.key === " ") {
      goToNextPageOrChapter();
    } else if (e.key === "Escape") {
      exitFullscreenReader();
    }
  });

  function getInitialPage() {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");

    if (pageParam === "last") {
      return pageCount;
    }

    const numericPage = parseInt(pageParam || "", 10);
    if (!Number.isNaN(numericPage) && numericPage >= 1 && numericPage <= pageCount) {
      return numericPage;
    }

    return 1;
  }

  updateControls();

  if (sessionStorage.getItem("readerFullscreen") === "true") {
    enterFullscreenReader();
  }

  showPage(getInitialPage());
  preloadNextChapter();
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initReader();
});