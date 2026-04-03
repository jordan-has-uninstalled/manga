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
  const chapterTitle = document.getElementById("chapterTitle");

  const series = reader.dataset.series || "FILTH-MAN";

  const chapters = {
    1: { title: "chapter 1", folder: "ch1", ext: "jpeg" },
    2: { title: "chapter 2", folder: "ch2", ext: "jpeg" },
    3: { title: "chapter 3", folder: "ch3", ext: "jpeg" },
    4: { title: "chapter 4", folder: "ch4", ext: "jpeg" },
    5: { title: "chapter 5", folder: "ch5", ext: "jpeg" },
    6: { title: "chapter 6", folder: "ch6", ext: "jpeg" }
  };

  let currentChapter = 1;
  let currentPage = 1;
  let currentPageCount = 0;
  let currentChapterData = null;
  let isTransitioningChapter = false;

  const chapterImageCache = new Map();
  const chapterCountCache = new Map();

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

  function isFullscreenReader() {
    return document.body.classList.contains("reader-fullscreen");
  }

  function showLoader(text = "loading...", percent = null) {
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
      pageIndicator.textContent =
        currentPageCount > 0
          ? `chapter ${currentChapter} • page ${currentPage} / ${currentPageCount}`
          : `chapter ${currentChapter}`;
    }

    if (prevBtn) {
      prevBtn.disabled = isTransitioningChapter;
    }

    if (nextBtn) {
      nextBtn.disabled = isTransitioningChapter;
    }

    if (fullscreenBtn) {
      fullscreenBtn.disabled = isTransitioningChapter;
    }
  }

  function hasPreviousChapter(chapterNumber = currentChapter) {
    return Boolean(chapters[chapterNumber - 1]);
  }

  function hasNextChapter(chapterNumber = currentChapter) {
    return Boolean(chapters[chapterNumber + 1]);
  }

  function getChapterNumberFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const chapterParam = parseInt(params.get("chapter") || "1", 10);

    if (chapters[chapterParam]) {
      return chapterParam;
    }

    return 1;
  }

  function getPageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");

    if (pageParam === "last") {
      return "last";
    }

    const numericPage = parseInt(pageParam || "", 10);
    if (!Number.isNaN(numericPage) && numericPage >= 1) {
      return numericPage;
    }

    return 1;
  }

  function buildChapterUrl(chapterNumber, page = null) {
    const url = new URL(window.location.href);
    url.searchParams.set("chapter", String(chapterNumber));

    if (page === null) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(page));
    }

    return url.toString();
  }

  function updateUrl(chapterNumber, page = null, replace = false) {
    const url = buildChapterUrl(chapterNumber, page);

    if (replace) {
      history.replaceState({}, "", url);
    } else {
      history.pushState({}, "", url);
    }
  }

  function getChapterCacheKey(chapterNumber) {
    return `chapter-${chapterNumber}`;
  }

  function getImageSrc(chapterNumber, pageNumber) {
    const chapter = chapters[chapterNumber];
    return `../../images/manga/${series}/${chapter.folder}/${String(pageNumber).padStart(3, "0")}.${chapter.ext}`;
  }

  function getChapterImageCache(chapterNumber) {
    const key = getChapterCacheKey(chapterNumber);

    if (!chapterImageCache.has(key)) {
      chapterImageCache.set(key, new Map());
    }

    return chapterImageCache.get(key);
  }

  function preloadImage(chapterNumber, pageNumber) {
    if (!chapters[chapterNumber] || pageNumber < 1) {
      return Promise.resolve(null);
    }

    const imageCache = getChapterImageCache(chapterNumber);

    if (imageCache.has(pageNumber)) {
      return imageCache.get(pageNumber).promise;
    }

    const src = getImageSrc(chapterNumber, pageNumber);
    const img = new Image();

    const promise = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`failed to load ${src}`));
    });

    imageCache.set(pageNumber, { img, promise, src });
    img.src = src;

    return promise;
  }

  async function detectPageCount(chapterNumber) {
    if (chapterCountCache.has(chapterNumber)) {
      return chapterCountCache.get(chapterNumber);
    }

    let pageNumber = 1;
    let foundAny = false;

    while (true) {
      try {
        await preloadImage(chapterNumber, pageNumber);
        foundAny = true;
        pageNumber += 1;
      } catch (error) {
        break;
      }
    }

    const count = foundAny ? pageNumber - 1 : 0;
    chapterCountCache.set(chapterNumber, count);
    return count;
  }

  function preloadNearbyPages(chapterNumber, centerPage) {
    const targets = [
      centerPage + 1,
      centerPage + 2,
      centerPage - 1,
      centerPage + 3
    ];

    for (const pageNumber of targets) {
      if (pageNumber >= 1 && pageNumber <= currentPageCount) {
        preloadImage(chapterNumber, pageNumber).catch(() => {});
      }
    }
  }

  function preloadAdjacentChapterFirstPages() {
    if (hasPreviousChapter()) {
      preloadImage(currentChapter - 1, 1).catch(() => {});
    }

    if (hasNextChapter()) {
      preloadImage(currentChapter + 1, 1).catch(() => {});
    }
  }

  async function showPage(pageNumber, updateHistory = true) {
    if (!currentChapterData || currentPageCount <= 0) return;

    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > currentPageCount) pageNumber = currentPageCount;

    currentPage = pageNumber;
    updateControls();

    if (!isFullscreenReader()) {
      showLoader(
        `loading page ${pageNumber}...`,
        Math.round((pageNumber / currentPageCount) * 100)
      );
    }

    try {
      const img = await preloadImage(currentChapter, pageNumber);

      if (!img) return;

      mainImg.src = img.src;
      mainImg.alt = `${currentChapterData.title} page ${pageNumber}`;

      if (!isFullscreenReader()) {
        hideLoader();
      }

      if (updateHistory) {
        updateUrl(currentChapter, pageNumber, true);
      }

      preloadNearbyPages(currentChapter, pageNumber);
      preloadAdjacentChapterFirstPages();
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

  async function loadChapter(chapterNumber, startPage = 1, pushHistory = true) {
    if (!chapters[chapterNumber] || isTransitioningChapter) return;

    isTransitioningChapter = true;
    updateControls();

    if (!isFullscreenReader()) {
      showLoader(`loading chapter ${chapterNumber}...`, 15);
    }

    currentChapter = chapterNumber;
    currentChapterData = chapters[chapterNumber];

    if (chapterTitle) {
      chapterTitle.textContent = currentChapterData.title;
    }

    document.title = `${series} - ${currentChapterData.title}`;

    const detectedPageCount = await detectPageCount(chapterNumber);
    currentPageCount = detectedPageCount;

    if (currentPageCount === 0) {
      if (!isFullscreenReader() && loaderText) {
        loaderText.textContent = `could not load ${currentChapterData.title}`;
      }
      isTransitioningChapter = false;
      updateControls();
      return;
    }

    let targetPage = startPage;

    if (targetPage === "last") {
      targetPage = currentPageCount;
    }

    if (typeof targetPage !== "number" || Number.isNaN(targetPage)) {
      targetPage = 1;
    }

    if (targetPage < 1) targetPage = 1;
    if (targetPage > currentPageCount) targetPage = currentPageCount;

    if (pushHistory) {
      updateUrl(chapterNumber, targetPage, false);
    } else {
      updateUrl(chapterNumber, targetPage, true);
    }

    isTransitioningChapter = false;
    updateControls();
    await showPage(targetPage, false);
  }

  async function goToNextChapter() {
    if (!hasNextChapter()) return;
    await loadChapter(currentChapter + 1, 1, true);
  }

  async function goToPreviousChapter() {
    if (!hasPreviousChapter()) return;
    await loadChapter(currentChapter - 1, "last", true);
  }

  async function goToPreviousPageOrChapter() {
    if (isTransitioningChapter) return;

    if (currentPage > 1) {
      await showPage(currentPage - 1, true);
    } else {
      await goToPreviousChapter();
    }
  }

  async function goToNextPageOrChapter() {
    if (isTransitioningChapter) return;

    if (currentPage < currentPageCount) {
      await showPage(currentPage + 1, true);
    } else {
      await goToNextChapter();
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
    prevBtn.addEventListener("click", () => {
      goToPreviousPageOrChapter();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      goToNextPageOrChapter();
    });
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

  window.addEventListener("popstate", async () => {
    const chapterFromUrl = getChapterNumberFromUrl();
    const pageFromUrl = getPageFromUrl();

    if (chapterFromUrl !== currentChapter) {
      await loadChapter(chapterFromUrl, pageFromUrl, false);
      return;
    }

    if (pageFromUrl === "last") {
      await showPage(currentPageCount, false);
      return;
    }

    if (typeof pageFromUrl === "number") {
      await showPage(pageFromUrl, false);
    }
  });

  updateControls();

  if (sessionStorage.getItem("readerFullscreen") === "true") {
    enterFullscreenReader();
  }

  loadChapter(getChapterNumberFromUrl(), getPageFromUrl(), false);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initReader();
});