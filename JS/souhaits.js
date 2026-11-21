import { supabase } from "./config/supabase.js";

/* -------------------------------------------------------
   CONFIGURATION
------------------------------------------------------- */

// À vérifier avec la structure exacte de ta table administrateur.
// Ces deux noms doivent correspondre aux colonnes de ta base.
const ADMIN_ID_COLUMN = "auth_user_id";
const ADMIN_ROLE_COLUMN = "role";

const ALLOWED_ROLES = ["principal", "gestionnaire"];
const ANIMATION_DURATION = 850;

/* -------------------------------------------------------
   ÉLÉMENTS HTML
------------------------------------------------------- */

const desktopBook = document.getElementById("desktopBook");
const mobileBook = document.getElementById("mobileBook");
const bookCover = document.getElementById("bookCover");

const desktopLeftPage = document.getElementById("desktopLeftPage");
const desktopRightPage = document.getElementById("desktopRightPage");
const mobilePage = document.getElementById("mobilePage");

const desktopFlipLayer = document.getElementById("desktopFlipLayer");
const mobileFlipLayer = document.getElementById("mobileFlipLayer");

const searchInput = document.getElementById("searchInput");
const clearSearchButton = document.getElementById("clearSearch");
const refreshButton = document.getElementById("refreshButton");

const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const retryButton = document.getElementById("retryButton");

const pageIndicator = document.getElementById("pageIndicator");
const messageCount = document.getElementById("messageCount");
const statusMessage = document.getElementById("statusMessage");

const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");

const thankYouTemplate = document.getElementById("thankYouTemplate");

/* =========================================
   OUVERTURE DE LA COUVERTURE
========================================= */

bookCover.addEventListener("click", () => {
  if (hasOpenedCover) return;

  hasOpenedCover = true;

  bookCover.classList.add("cover-opening");

  // Petit délai pour laisser la couverture s'effacer
  window.setTimeout(() => {
    renderBook();
  }, 750);
});

/* -------------------------------------------------------
   ÉTAT DE L'APPLICATION
------------------------------------------------------- */

let allMessages = [];
let filteredMessages = [];

let desktopSpreadIndex = 0;
let mobilePageIndex = 0;

let isAnimating = false;
let isLoading = false;

/* -------------------------------------------------------
   OUTILS
------------------------------------------------------- */

function isMobileLayout() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function getInviteName(invite) {
  if (!invite) return "Un invité";

  // Selon la relation Supabase, invite peut être un objet
  // ou un tableau contenant un seul objet.
  const person = Array.isArray(invite) ? invite[0] : invite;

  if (!person) return "Un invité";

  const firstName = person.prenom || "";
  const lastName = person.nom || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Un invité";
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = text;
  }

  return element;
}

function setStatus(message) {
  statusMessage.textContent = message || "";
}

function showError(show) {
  errorState.hidden = !show;
}

function showEmpty(show) {
  emptyState.hidden = !show;
}

let hasOpenedCover = false;

function showBooks(show) {
  // La couverture reste visible tant qu'elle n'a pas été ouverte.
  bookCover.hidden = !show || hasOpenedCover;

  desktopBook.hidden = !show || !hasOpenedCover;
  mobileBook.hidden = !show || !hasOpenedCover;

  document.querySelector(".book-navigation").hidden =
    !show || !hasOpenedCover;

  document.querySelector(".book-topline").hidden =
    !show || !hasOpenedCover;
}

/* -------------------------------------------------------
   CRÉATION D'UNE PAGE MESSAGE
------------------------------------------------------- */

function createMessagePage(message, pageNumber) {
  const content = createElement("div", "page-content");

  if (!message) {
    const blank = createElement("div", "blank-page", "♡");
    content.appendChild(blank);

    const number = createElement("span", "page-number", String(pageNumber));
    content.appendChild(number);

    return content;
  }

  const page = createElement("div", "message-page");

  const decoration = createElement("div", "page-top-decoration", "✧　♡　✧");
  decoration.setAttribute("aria-hidden", "true");

  const label = createElement("span", "message-label", "Un mot précieux");

  const text = createElement("p", "message-text");
  text.textContent = message.message || "";

  const separator = createElement("div", "message-separator");
  separator.setAttribute("aria-hidden", "true");

  const author = createElement(
    "p",
    "message-author",
    getInviteName(message.invite)
  );

  const dateText = formatDate(message.date_souhait);
  const date = createElement("span", "message-date", dateText);

  page.append(
    decoration,
    label,
    text,
    separator,
    author
  );

  if (dateText) {
    page.appendChild(date);
  }

  const number = createElement("span", "page-number", String(pageNumber));
  page.appendChild(number);

  content.appendChild(page);

  return content;
}

/* -------------------------------------------------------
   CRÉATION DE LA PAGE DE REMERCIEMENT
   Le contenu provient du HTML statique.
------------------------------------------------------- */

function createThankYouPage(pageNumber) {
  const content = createElement("div", "page-content");

  const templateContent = thankYouTemplate.content.cloneNode(true);
  content.appendChild(templateContent);

  const number = createElement("span", "page-number", String(pageNumber));
  content.appendChild(number);

  return content;
}

/* -------------------------------------------------------
   CONSTRUCTION DES PAGES
------------------------------------------------------- */

function getMessageSpreadCount() {
  return Math.ceil(filteredMessages.length / 2);
}

function getDesktopSpreadCount() {
  // Une double page supplémentaire pour le remerciement.
  return getMessageSpreadCount() + 1;
}

function getMobilePageCount() {
  // Une page par message, puis la page de remerciement.
  return filteredMessages.length + 1;
}

function renderDesktopBook() {
  const messageSpreadCount = getMessageSpreadCount();
  const isThankYouSpread = desktopSpreadIndex === messageSpreadCount;

  if (isThankYouSpread) {
    desktopLeftPage.querySelector(".page-content").replaceWith(
      createMessagePage(null, filteredMessages.length * 2 + 1)
    );

    desktopRightPage.querySelector(".page-content").replaceWith(
      createThankYouPage(filteredMessages.length + 1)
    );

    return;
  }

  const leftIndex = desktopSpreadIndex * 2;
  const rightIndex = leftIndex + 1;

  const leftMessage = filteredMessages[leftIndex] || null;
  const rightMessage = filteredMessages[rightIndex] || null;

  desktopLeftPage.querySelector(".page-content").replaceWith(
    createMessagePage(leftMessage, leftIndex + 1)
  );

  desktopRightPage.querySelector(".page-content").replaceWith(
    createMessagePage(rightMessage, rightIndex + 1)
  );
}

function renderMobileBook() {
  const isThankYouPage = mobilePageIndex === filteredMessages.length;

  const currentContent = mobilePage.querySelector(".page-content");

  const newContent = isThankYouPage
    ? createThankYouPage(filteredMessages.length + 1)
    : createMessagePage(
        filteredMessages[mobilePageIndex],
        mobilePageIndex + 1
      );

  currentContent.replaceWith(newContent);
}

function updateNavigation() {
  if (isMobileLayout()) {
    const totalPages = getMobilePageCount();

    previousButton.disabled = mobilePageIndex <= 0 || isAnimating;
    nextButton.disabled = mobilePageIndex >= totalPages - 1 || isAnimating;

    pageIndicator.textContent =
      `Page ${mobilePageIndex + 1} / ${totalPages}`;
  } else {
    const totalSpreads = getDesktopSpreadCount();

    previousButton.disabled = desktopSpreadIndex <= 0 || isAnimating;
    nextButton.disabled =
      desktopSpreadIndex >= totalSpreads - 1 || isAnimating;

    pageIndicator.textContent =
      `Double page ${desktopSpreadIndex + 1} / ${totalSpreads}`;
  }

  const count = filteredMessages.length;

  messageCount.textContent =
    `${count} ${count > 1 ? "messages" : "message"}`;
}

function renderBook() {
  if (isLoading || errorState.hidden === false) return;

  const hasMessages = filteredMessages.length > 0;

  showEmpty(!hasMessages);
  showBooks(hasMessages);

  if (!hasMessages) {
    pageIndicator.textContent = "—";
    previousButton.disabled = true;
    nextButton.disabled = true;
    messageCount.textContent = "0 message";
    return;
  }

  // Empêche de conserver un index qui serait devenu trop grand
  // après une recherche ou une actualisation.
  desktopSpreadIndex = Math.min(
    desktopSpreadIndex,
    getDesktopSpreadCount() - 1
  );

  mobilePageIndex = Math.min(
    mobilePageIndex,
    getMobilePageCount() - 1
  );

  renderDesktopBook();
  renderMobileBook();
  updateNavigation();
}

/* -------------------------------------------------------
   ANIMATION 3D DU FEUILLETAGE
------------------------------------------------------- */

function fillFlipFace(face, content) {
  face.replaceChildren(content);
}

function getCurrentDesktopLeftContent() {
  return desktopLeftPage.querySelector(".page-content").cloneNode(true);
}

function getCurrentDesktopRightContent() {
  return desktopRightPage.querySelector(".page-content").cloneNode(true);
}

function getNextDesktopLeftContent(nextSpreadIndex) {
  const messageSpreadCount = getMessageSpreadCount();

  if (nextSpreadIndex === messageSpreadCount) {
    return createMessagePage(null, filteredMessages.length * 2 + 1);
  }

  const index = nextSpreadIndex * 2;
  return createMessagePage(filteredMessages[index] || null, index + 1);
}

function getNextMobileContent(nextPageIndex) {
  if (nextPageIndex === filteredMessages.length) {
    return createThankYouPage(filteredMessages.length + 1);
  }

  return createMessagePage(
    filteredMessages[nextPageIndex],
    nextPageIndex + 1
  );
}

function getPreviousDesktopRightContent(previousSpreadIndex) {
  const messageSpreadCount = getMessageSpreadCount();

  if (previousSpreadIndex === messageSpreadCount) {
    return createThankYouPage(filteredMessages.length + 1);
  }

  const index = previousSpreadIndex * 2 + 1;

  return createMessagePage(
    filteredMessages[index] || null,
    index + 1
  );
}

function getPreviousMobileContent(previousPageIndex) {
  if (previousPageIndex === filteredMessages.length) {
    return createThankYouPage(filteredMessages.length + 1);
  }

  return createMessagePage(
    filteredMessages[previousPageIndex],
    previousPageIndex + 1
  );
}

function animateFlip(direction) {
  if (isAnimating || filteredMessages.length === 0) return;

  const mobile = isMobileLayout();
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const nextIndex = mobile
    ? mobilePageIndex + (direction === "next" ? 1 : -1)
    : desktopSpreadIndex + (direction === "next" ? 1 : -1);

  const maxIndex = mobile
    ? getMobilePageCount() - 1
    : getDesktopSpreadCount() - 1;

  if (nextIndex < 0 || nextIndex > maxIndex) return;

  isAnimating = true;
  updateNavigation();

  if (reducedMotion) {
    if (mobile) {
      mobilePageIndex = nextIndex;
    } else {
      desktopSpreadIndex = nextIndex;
    }

    isAnimating = false;
    renderBook();
    return;
  }

  const layer = mobile ? mobileFlipLayer : desktopFlipLayer;
  const front = layer.querySelector(".flip-front");
  const back = layer.querySelector(".flip-back");

  layer.className = "flip-layer is-animating";
  layer.classList.add(
    direction === "next" ? "turn-next" : "turn-previous"
  );

  if (mobile) {
    const currentContent = mobilePage
      .querySelector(".page-content")
      .cloneNode(true);

    const incomingContent = direction === "next"
      ? getNextMobileContent(nextIndex)
      : getPreviousMobileContent(nextIndex);

    fillFlipFace(front, currentContent);
    fillFlipFace(back, incomingContent);
  } else if (direction === "next") {
    fillFlipFace(front, getCurrentDesktopRightContent());
    fillFlipFace(back, getNextDesktopLeftContent(nextIndex));
  } else {
    fillFlipFace(front, getCurrentDesktopLeftContent());
    fillFlipFace(back, getPreviousDesktopRightContent(nextIndex));
  }

  // Le navigateur doit d'abord afficher la position initiale.
  layer.style.transition = "none";
  layer.style.transform = "rotateY(0deg)";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      layer.style.transition =
        `transform ${ANIMATION_DURATION}ms cubic-bezier(.45,.02,.22,1)`;

      layer.style.transform = direction === "next"
        ? "rotateY(-180deg)"
        : "rotateY(180deg)";
    });
  });

  let completed = false;

  function finishAnimation() {
    if (completed) return;
    completed = true;

    layer.removeEventListener("transitionend", onTransitionEnd);

    if (mobile) {
      mobilePageIndex = nextIndex;
    } else {
      desktopSpreadIndex = nextIndex;
    }

    layer.className = "flip-layer";
    layer.style.transition = "";
    layer.style.transform = "";

    isAnimating = false;
    renderBook();
  }

  function onTransitionEnd(event) {
    if (event.target === layer && event.propertyName === "transform") {
      finishAnimation();
    }
  }

  layer.addEventListener("transitionend", onTransitionEnd);

  // Sécurité si transitionend n'est pas déclenché par le navigateur.
  window.setTimeout(finishAnimation, ANIMATION_DURATION + 150);
}

/* -------------------------------------------------------
   NAVIGATION
------------------------------------------------------- */

previousButton.addEventListener("click", () => {
  animateFlip("previous");
});

nextButton.addEventListener("click", () => {
  animateFlip("next");
});

/* -------------------------------------------------------
   RECHERCHE
------------------------------------------------------- */

function applySearch() {
  const query = searchInput.value.trim().toLocaleLowerCase("fr");

  clearSearchButton.hidden = query.length === 0;

  if (!query) {
    filteredMessages = [...allMessages];
  } else {
    filteredMessages = allMessages.filter((message) => {
      const invite = Array.isArray(message.invite)
        ? message.invite[0]
        : message.invite;

      const searchableText = [
        invite?.nom,
        invite?.prenom,
        invite?.telephone,
        message.message
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");

      return searchableText.includes(query);
    });
  }

  desktopSpreadIndex = 0;
  mobilePageIndex = 0;

  renderBook();

  if (query) {
    setStatus(
      `${filteredMessages.length} résultat(s) pour « ${searchInput.value.trim()} »`
    );
  } else {
    setStatus("");
  }
}

searchInput.addEventListener("input", applySearch);

clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  applySearch();
  searchInput.focus();
});

/* -------------------------------------------------------
   CHARGEMENT DES MESSAGES SUPABASE
------------------------------------------------------- */

async function loadMessages() {
  if (isLoading) return;

  isLoading = true;
  showError(false);
  showEmpty(false);
  showBooks(false);
  setStatus("Chargement de vos souvenirs…");

  refreshButton.disabled = true;
  retryButton.disabled = true;

  try {
    const { data, error } = await supabase
      .from("souhait")
      .select(`
        id_souhait,
        message,
        date_souhait,
        invite (
          nom,
          prenom,
          telephone
        )
      `)
      .order("date_souhait", { ascending: false });

    if (error) throw error;

    allMessages = (data || []).filter((item) => {
      return typeof item.message === "string" && item.message.trim() !== "";
    });

    filteredMessages = [...allMessages];

    desktopSpreadIndex = 0;
    mobilePageIndex = 0;

    searchInput.value = "";
    clearSearchButton.hidden = true;

    isLoading = false;

    renderBook();

    setStatus(
      allMessages.length
        ? "Tous vos petits mots sont prêts à être feuilletés."
        : "Le livre attend encore ses premiers petits mots."
    );
  } catch (error) {
    console.error("Erreur lors du chargement des souhaits :", error);

    isLoading = false;
    showBooks(false);
    showEmpty(false);
    showError(true);

    setStatus("Une erreur est survenue.");
    pageIndicator.textContent = "—";
  } finally {
    refreshButton.disabled = false;
    retryButton.disabled = false;
  }
}

/* -------------------------------------------------------
   AUTHENTIFICATION ET AUTORISATIONS
------------------------------------------------------- */

async function checkAdministratorAccess() {
  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      window.location.replace("./connexion.html");
      return false;
    }

    const { data: administrator, error: adminError } = await supabase
      .from("administrateur")
      .select("*")
      .eq(ADMIN_ID_COLUMN, user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Erreur de vérification administrateur :", adminError);
      await supabase.auth.signOut();
      window.location.replace("./connexion.html");
      return false;
    }

    const role = administrator?.[ADMIN_ROLE_COLUMN];

    if (!administrator || !ALLOWED_ROLES.includes(role)) {
      await supabase.auth.signOut();
      window.location.replace("./connexion.html");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erreur d'authentification :", error);
    window.location.replace("./connexion.html");
    return false;
  }
}

/* -------------------------------------------------------
   CLAVIER
------------------------------------------------------- */

document.addEventListener("keydown", (event) => {
  const target = event.target;

  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;

  if (isTyping || isAnimating) return;

  if (event.key === "ArrowRight") {
    event.preventDefault();
    animateFlip("next");
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    animateFlip("previous");
  }
});

/* -------------------------------------------------------
   REDIMENSIONNEMENT
------------------------------------------------------- */

let previousLayoutWasMobile = isMobileLayout();

window.addEventListener("resize", () => {
  const currentLayoutIsMobile = isMobileLayout();

  if (currentLayoutIsMobile !== previousLayoutWasMobile) {
    previousLayoutWasMobile = currentLayoutIsMobile;
    renderBook();
  }
});

/* -------------------------------------------------------
   ACTUALISATION ET RÉESSAI
------------------------------------------------------- */

refreshButton.addEventListener("click", loadMessages);
retryButton.addEventListener("click", loadMessages);

/* -------------------------------------------------------
   DÉMARRAGE
------------------------------------------------------- */

async function initializeBook() {
  const authorized = await checkAdministratorAccess();

  if (!authorized) return;

  await loadMessages();
}

initializeBook();