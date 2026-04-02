const saved = localStorage.getItem("theme");
if (saved === "dark") {
  document.body.classList.add("dark");
}

const themeBtn = document.getElementById("themeToggle");

if (themeBtn) {
  themeBtn.textContent = document.body.classList.contains("dark")
    ? "light mode"
    : "dark mode";

  themeBtn.onclick = () => {
    document.body.classList.toggle("dark");

    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );

    themeBtn.textContent = document.body.classList.contains("dark")
      ? "light mode"
      : "dark mode";
  };
}

const reader = document.querySelector(".reader-single");

if (reader) {
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageIndicator = document.getElementById("pageIndicator");
  const fullscreenBtn = document.getElementById("fullscreenToggle");

  let pages = [];
  let currentPage = 0;

  function applyPageVisibility(index) {
    pages.forEach((page, i) => {
      const active = i === index;
      page.style.display = active ? "block" : "none";
      page.classList.toggle("active", active);
    });
  }

  function showPage(index) {
    if (!pages.length) return;

    if (index < 0) index = 0;
    if (index >= pages.length) index = pages.length - 1;

    currentPage = index;
    applyPageVisibility(currentPage);

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

  function getNextChapterLink() {
    const navLinks = document.querySelectorAll(".nav a");
    let nextChapterLink = null;

    navLinks.forEach((link) => {
      if (link.textContent.toLowerCase().includes("next chapter")) {
        nextChapterLink = link;
      }
    });

    return nextChapterLink;
  }

  function goToNextChapter() {
    const nextChapterLink = getNextChapterLink();
    if (nextChapterLink) {
      window.location.href = nextChapterLink.href;
    }
  }

  function imageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async function loadAutoReader() {
    if (!reader.classList.contains("auto-reader")) {
      pages = Array.from(reader.querySelectorAll(".reader-page"));
      showPage(0);
      return;
    }

    const base = reader.dataset.imageBase;
    const ext = reader.dataset.imageExtension || "jpg";

    let pageNumber = 1;

    while (true) {
      const filename = String(pageNumber).padStart(3, "0") + "." + ext;
      const src = base + filename;

      const exists = await imageExists(src);
      if (!exists) break;

      const pageDiv = document.createElement("div");
      pageDiv.className = "reader-page";

      const img = document.createElement("img");
      img.src = src;
      img.alt = `page ${pageNumber}`;

      pageDiv.appendChild(img);
      reader.appendChild(pageDiv);

      pageNumber++;
    }

    pages = Array.from(reader.querySelectorAll(".reader-page"));
    showPage(0);
  }

  function enterFullscreenReader() {
    document.body.classList.add("reader-fullscreen");
    applyPageVisibility(currentPage);
    if (fullscreenBtn) fullscreenBtn.textContent = "exit fullscreen";
  }

  function exitFullscreenReader() {
    document.body.classList.remove("reader-fullscreen");
    applyPageVisibility(currentPage);
    if (fullscreenBtn) fullscreenBtn.textContent = "fullscreen";
  }

  function toggleFullscreenReader() {
    if (document.body.classList.contains("reader-fullscreen")) {
      exitFullscreenReader();
    } else {
      enterFullscreenReader();
    }
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreenReader);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => showPage(currentPage - 1));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => showPage(currentPage + 1));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
    }

    if (e.key === "ArrowLeft") {
      showPage(currentPage - 1);
    } else if (e.key === "ArrowRight") {
      showPage(currentPage + 1);
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