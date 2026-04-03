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

  let pages = [];
  let currentPage = 0;

  const loader = document.createElement("div");
  loader.className = "reader-loader";
  loader.innerHTML = `
    <div class="reader-loader-text" id="readerLoaderText">loading pages...</div>
    <div class="reader-loader-bar">
      <div class="reader-loader-fill" id="readerLoaderFill"></div>
    </div>
  `;
  reader.parentNode.insertBefore(loader, reader);

  const loaderText = document.getElementById("readerLoaderText");
  const loaderFill = document.getElementById("readerLoaderFill");

  function showLoader() {
    loader.style.display = "block";
  }

  function hideLoader() {
    loader.style.display = "none";
  }

  function updateLoader(current, total) {
    if (!total) return;
    const percent = Math.round((current / total) * 100);
    if (loaderText) {
      loaderText.textContent = `loading pages... ${current}/${total}`;
    }
    if (loaderFill) {
      loaderFill.style.width = `${percent}%`;
    }
  }

  function updateControls() {
    if (pageIndicator) {
      pageIndicator.textContent = `page ${currentPage + 1} / ${pages.length}`;
    }

    if (prevBtn) {
      prevBtn.disabled = currentPage === 0;
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage === pages.length - 1;
    }
  }

  function applyPageVisibility() {
    pages.forEach((page, index) => {
      const active = index === currentPage;
      page.style.display = active ? "block" : "none";
      page.classList.toggle("active", active);
    });
  }

  function showPage(index) {
    if (!pages.length) return;
    currentPage = Math.max(0, Math.min(index, pages.length - 1));
    applyPageVisibility();
    updateControls();
  }

  function getNextChapterLink() {
    return Array.from(document.querySelectorAll(".nav a")).find((link) =>
      link.textContent.toLowerCase().includes("next chapter")
    );
  }

  function goToNextChapter() {
    const nextChapterLink = getNextChapterLink();
    if (nextChapterLink) {
      window.location.href = nextChapterLink.href;
    }
  }

  function preloadNextChapter() {
    const nextChapterLink = getNextChapterLink();
    if (!nextChapterLink) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = nextChapterLink.href;
    document.head.appendChild(link);
  }

  function imageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async function findImageSrc(base, pageNumber) {
    const extensions = ["jpg", "JPG", "jpeg", "JPEG", "png", "PNG", "webp", "WEBP"];

    for (const ext of extensions) {
      const filename = `${String(pageNumber).padStart(3, "0")}.${ext}`;
      const src = base + filename;

      if (await imageExists(src)) {
        return src;
      }
    }

    return null;
  }

  function createPage(src, pageNumber) {
    const pageDiv = document.createElement("div");
    pageDiv.className = "reader-page";

    const img = document.createElement("img");
    img.src = src;
    img.alt = `page ${pageNumber}`;
    img.loading = pageNumber <= 2 ? "eager" : "lazy";
    img.decoding = "async";
    img.draggable = false;

    pageDiv.appendChild(img);
    reader.appendChild(pageDiv);
  }

  async function loadUsingPageCount(base, pageCount) {
    showLoader();

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const src = await findImageSrc(base, pageNumber);
      if (!src) continue;

      createPage(src, pageNumber);
      updateLoader(pageNumber, pageCount);
    }

    hideLoader();
  }

  async function loadByScanning(base) {
    showLoader();

    let pageNumber = 1;

    while (true) {
      const src = await findImageSrc(base, pageNumber);
      if (!src) break;

      createPage(src, pageNumber);
      updateLoader(pageNumber, pageNumber + 1);

      pageNumber++;
    }

    hideLoader();
  }

  async function loadAutoReader() {
    if (!reader.classList.contains("auto-reader")) {
      pages = Array.from(reader.querySelectorAll(".reader-page"));
      showPage(0);
      preloadNextChapter();
      return;
    }

    const base = reader.dataset.imageBase;
    const pageCount = parseInt(reader.dataset.pageCount || "0", 10);

    if (!base) return;

    if (pageCount > 0) {
      await loadUsingPageCount(base, pageCount);
    } else {
      await loadByScanning(base);
    }

    pages = Array.from(reader.querySelectorAll(".reader-page"));
    showPage(0);
    preloadNextChapter();
  }

  function updateFullscreenButton() {
    if (!fullscreenBtn) return;
    fullscreenBtn.textContent = document.body.classList.contains("reader-fullscreen")
      ? "exit fullscreen"
      : "fullscreen";
  }

  function exitFullscreenReader() {
    document.body.classList.remove("reader-fullscreen");
    applyPageVisibility();
    updateFullscreenButton();
  }

  function toggleFullscreenReader() {
    document.body.classList.toggle("reader-fullscreen");
    applyPageVisibility();
    updateFullscreenButton();
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => showPage(currentPage - 1));
  }

  if (nextBtn) {
    prevBtn?.blur();
    nextBtn.addEventListener("click", () => {
      if (currentPage < pages.length - 1) {
        showPage(currentPage + 1);
      } else {
        goToNextChapter();
      }
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
      showPage(currentPage - 1);
    } else if (e.key === "ArrowRight") {
      if (currentPage < pages.length - 1) {
        showPage(currentPage + 1);
      } else {
        goToNextChapter();
      }
    } else if (e.key === " ") {
      if (currentPage < pages.length - 1) {
        showPage(currentPage + 1);
      } else {
        goToNextChapter();
      }
    } else if (e.key === "Escape") {
      exitFullscreenReader();
    }
  });

  loadAutoReader();
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initReader();
});