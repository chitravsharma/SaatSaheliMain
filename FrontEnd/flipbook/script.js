const pages = [
  "pages/IMG-20250515-WA0006.jpg",
  "pages/IMG-20250515-WA0007.jpg",
  "pages/IMG-20250515-WA0008.jpg",
  "pages/IMG-20250515-WA0009.jpg",
  "pages/IMG-20250515-WA0010.jpg"
];

let currentPage = 0;
const pageDiv = document.getElementById("page");

function showPage() {
  pageDiv.style.backgroundImage = `url(${pages[currentPage]})`;
}

function nextPage() {
  if (currentPage < pages.length - 1) {
    currentPage++;
    showPage();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    showPage();
  }
}

window.onload = showPage;
