
import { supabase } from "./config/supabase.js";

// =====================================
// 1. ELEMENTS HTML
// =====================================

const btnActualiser = document.getElementById("btnActualiser");

const rechercheSouhait = document.getElementById("rechercheSouhait");
const totalSouhaits = document.getElementById("totalSouhaits");

const messageChargement = document.getElementById("messageChargement");
const messageErreur = document.getElementById("messageErreur");
const messageVide = document.getElementById("messageVide");

const livre = document.getElementById("livre");
const pageMessage = document.getElementById("pageMessage");

const texteMessage = document.getElementById("texteMessage");
const nomInvite = document.getElementById("nomInvite");
const dateSouhait = document.getElementById("dateSouhait");
const numeroPage = document.getElementById("numeroPage");

const navigationLivre = document.getElementById("navigationLivre");
const pagePrecedente = document.getElementById("pagePrecedente");
const pageSuivante = document.getElementById("pageSuivante");
const compteurPages = document.getElementById("compteurPages");

// =====================================
// 2. VARIABLES
// =====================================

let souhaits = [];
let souhaitsFiltres = [];
let indexActuel = 0;
let animationEnCours = false;

// =====================================
// 3. VERIFICATION ADMINISTRATEUR
// =====================================

async function verifierAdministrateur() {

    const { data: { user }, error: erreurAuth } =
        await supabase.auth.getUser();

    if (erreurAuth || !user) {
        window.location.href = "connexion.html";
        return false;
    }

    const { data: administrateur, error } = await supabase
        .from("administrateur")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (error || !administrateur) {
        await supabase.auth.signOut();
        window.location.href = "connexion.html";
        return false;
    }

    if (
        administrateur.role !== "principal" &&
        administrateur.role !== "gestionnaire"
    ) {
        await supabase.auth.signOut();
        window.location.href = "connexion.html";
        return false;
    }

    return true;
}

// =====================================
// 4. FORMATER LA DATE
// =====================================

function formaterDate(date) {

    if (!date) {
        return "";
    }

    const dateSimple = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    let valeur;

    if (dateSimple) {

        valeur = new Date(
            Number(dateSimple[1]),
            Number(dateSimple[2]) - 1,
            Number(dateSimple[3])
        );

    } else {

        valeur = new Date(date);
    }

    if (Number.isNaN(valeur.getTime())) {
        return "";
    }

    return valeur.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// =====================================
// 5. AFFICHER UNE ERREUR
// =====================================

function afficherErreur(message) {

    messageErreur.textContent = message;
    messageErreur.hidden = false;

    messageChargement.hidden = true;
    livre.hidden = true;
    navigationLivre.hidden = true;
    messageVide.hidden = true;
}

// =====================================
// 6. CHARGER LES SOUHAITS
// =====================================

async function chargerSouhaits() {

    messageChargement.hidden = false;
    messageErreur.hidden = true;
    messageVide.hidden = true;

    livre.hidden = true;
    navigationLivre.hidden = true;

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
        .order("date_souhait", {
            ascending: false
        });

    if (error) {
        console.error("Erreur Supabase :", error);
        throw error;
    }

    souhaits = data || [];

    // Ne conserver que les messages non vides
    souhaits = souhaits.filter(
        souhait => souhait.message &&
        souhait.message.trim() !== ""
    );

    totalSouhaits.textContent =
        souhaits.length === 1
            ? "1 message"
            : `${souhaits.length} messages`;

    souhaitsFiltres = [...souhaits];
    indexActuel = 0;

    messageChargement.hidden = true;

    afficherPage();
}

// =====================================
// 7. AFFICHER UNE PAGE DU LIVRE
// =====================================

function afficherPage() {

    if (souhaitsFiltres.length === 0) {

        livre.hidden = true;
        navigationLivre.hidden = true;
        messageVide.hidden = false;

        messageVide.querySelector("h2").textContent =
            souhaits.length === 0
                ? "Les pages sont encore vierges"
                : "Aucun message retrouvé";

        messageVide.querySelector("p").textContent =
            souhaits.length === 0
                ? "Les messages de vos invités apparaîtront ici lorsqu'ils auront laissé un petit mot."
                : "Essayez une autre recherche pour retrouver un message.";

        return;
    }

    const souhait = souhaitsFiltres[indexActuel];

    const invite = souhait.invite || {};

    const nomComplet =
        `${invite.prenom || ""} ${invite.nom || ""}`.trim();

    texteMessage.textContent = souhait.message;

    nomInvite.textContent = nomComplet || "Un invité";

    dateSouhait.textContent =
        formaterDate(souhait.date_souhait);

    numeroPage.textContent =
        `${indexActuel + 1} / ${souhaitsFiltres.length}`;

    compteurPages.textContent =
        `${indexActuel + 1} / ${souhaitsFiltres.length}`;

    pagePrecedente.disabled = indexActuel === 0;

    pageSuivante.disabled =
        indexActuel === souhaitsFiltres.length - 1;

    livre.hidden = false;
    navigationLivre.hidden = false;
    messageVide.hidden = true;
}

// =====================================
// 8. TOURNER LES PAGES
// =====================================

function tournerPage(direction) {

    if (animationEnCours) {
        return;
    }

    const nouvelIndex = indexActuel + direction;

    if (
        nouvelIndex < 0 ||
        nouvelIndex >= souhaitsFiltres.length
    ) {
        return;
    }

    animationEnCours = true;

    pageMessage.classList.remove("tourner");

    // Relancer l'animation
    void pageMessage.offsetWidth;

    pageMessage.classList.add("tourner");

    setTimeout(() => {

        indexActuel = nouvelIndex;

        afficherPage();

        pageMessage.classList.remove("tourner");

        animationEnCours = false;

    }, 220);
}

// =====================================
// 9. RECHERCHE
// =====================================

function rechercherSouhait() {

    const recherche = rechercheSouhait.value
        .trim()
        .toLowerCase();

    souhaitsFiltres = souhaits.filter((souhait) => {

        const nom = souhait.invite?.nom || "";
        const prenom = souhait.invite?.prenom || "";
        const telephone = souhait.invite?.telephone || "";
        const message = souhait.message || "";

        const texte = `
            ${nom}
            ${prenom}
            ${telephone}
            ${message}
        `.toLowerCase();

        return texte.includes(recherche);
    });

    indexActuel = 0;

    afficherPage();
}

// =====================================
// 10. ACTUALISATION
// =====================================

async function actualiserSouhaits() {

    btnActualiser.disabled = true;
    btnActualiser.textContent = "Actualisation...";

    try {

        await chargerSouhaits();
        rechercheSouhait.value = "";

    } catch (error) {

        console.error("Erreur actualisation :", error);

        afficherErreur(
            "Impossible de récupérer les messages. Veuillez réessayer."
        );

    } finally {

        btnActualiser.disabled = false;
        btnActualiser.textContent = "↻ Actualiser";
    }
}

// =====================================
// 11. EVENEMENTS
// =====================================

rechercheSouhait.addEventListener(
    "input",
    rechercherSouhait
);

pagePrecedente.addEventListener(
    "click",
    () => tournerPage(-1)
);

pageSuivante.addEventListener(
    "click",
    () => tournerPage(1)
);

btnActualiser.addEventListener(
    "click",
    actualiserSouhaits
);

// Navigation avec les flèches du clavier
document.addEventListener("keydown", (event) => {

    if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
    ) {
        return;
    }

    if (event.key === "ArrowLeft") {
        tournerPage(-1);
    }

    if (event.key === "ArrowRight") {
        tournerPage(1);
    }
});

// =====================================
// 12. INITIALISATION
// =====================================

async function initialiserPage() {

    const autorise = await verifierAdministrateur();

    if (!autorise) {
        return;
    }

    try {

        await chargerSouhaits();

    } catch (error) {

        console.error("Erreur chargement :", error);

        afficherErreur(
            "Impossible de charger le livre d'or."
        );
    }
}

initialiserPage();
