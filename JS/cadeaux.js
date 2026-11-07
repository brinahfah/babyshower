
import { supabase } from "./config/supabase.js";

// ==========================================
// 1. RECUPERATION DES ELEMENTS HTML
// ==========================================

const confirmation = document.getElementById("confirmation");
const messageConfirmation = document.getElementById("messageConfirmation");

const modeEmploi = document.getElementById("modeEmploi");
const btnCommencer = document.getElementById("btnCommencer");

const sectionCadeaux = document.getElementById("sectionCadeaux");
const listeCadeaux = document.getElementById("listeCadeaux");

const sectionInscription = document.getElementById("sectionInscription");
const cadeauSelectionne = document.getElementById("cadeauSelectionne");

const formInvite = document.getElementById("formInvite");

const champNom = document.getElementById("nom");
const champPrenom = document.getElementById("prenom");
const champMessage = document.getElementById("message");
const acceptConditions = document.getElementById("acceptConditions");
const champTelephone = document.getElementById("telephone");

// ==========================================
// 2. VARIABLES
// ==========================================

let cadeaux = [];
let reservations = [];
let cadeauChoisi = null;

// ==========================================
// 3. DETERMINER SI UN CADEAU EST ILLIMITE
// ==========================================

function estIllimite(nom) {

    const nomNormalise = nom.toLowerCase();

    return (
        nomNormalise.includes("enveloppe") ||
        nomNormalise.includes("couche") ||
        nomNormalise.includes("lingette")
    );
}

// ==========================================
// 4. OUVRIR LA LISTE DES CADEAUX
// ==========================================

btnCommencer.addEventListener("click", async function () {

    modeEmploi.hidden = true;
    sectionCadeaux.hidden = false;

    await chargerCadeaux();

});

// ==========================================
// 5. RECUPERER LES DONNEES DE SUPABASE
// ==========================================

async function chargerCadeaux() {

    try {

        listeCadeaux.textContent = "Chargement des cadeaux...";

        // Récupération des cadeaux
        const { data: donneesCadeaux, error: erreurCadeaux } =
            await supabase
                .from("cadeau")
                .select("*")
                .order("id_cadeau", { ascending: true });

        if (erreurCadeaux) {
            throw erreurCadeaux;
        }

        cadeaux = donneesCadeaux || [];

        console.log("NOMBRE DE CADEAUX :", cadeaux.length);
        console.log("CADEAUX RECUPERES :", cadeaux);

        // Récupération des réservations
        const { data: donneesReservations, error: erreurReservations } =
            await supabase
                .from("reservation")
                .select("id_cadeau");

        if (erreurReservations) {
            throw erreurReservations;
        }

        reservations = donneesReservations || [];

        console.log("NOMBRE DE RESERVATIONS :", reservations.length);

        afficherCadeaux();

    } catch (error) {

        console.error("Erreur lors du chargement :", error);

        listeCadeaux.textContent =
            "Une erreur est survenue lors du chargement des cadeaux.";

    }

}

// ==========================================
// 6. CALCULER LE NOMBRE DE RESERVATIONS
// ==========================================

function compterReservations(idCadeau) {

    return reservations.filter(
        reservation =>
            String(reservation.id_cadeau) === String(idCadeau)
    ).length;

}

// ==========================================
// 6 BIS. ATTRIBUER UN STICKER AUX CADEAUX
// ==========================================

// ==========================================
// STICKERS REPRESENTATIFS DES CADEAUX
// ==========================================


function obtenirVisuel(cadeau) {
    const nom = cadeau.toLowerCase();

    // Cadeaux qui conservent leurs emojis
    if (
        nom.includes("biberon") ||
        nom.includes("tétine") ||
        nom.includes("chauffe-biberon")
    ) {
        return { type: "emoji", valeur: "🍼" };
    }

    if (
        nom.includes("toilette") ||
        nom.includes("biolane") ||
        nom.includes("mustela")
    ) {
        return { type: "emoji", valeur: "🧴" };
    }

    if (nom.includes("cadeau au choix")) {
        return { type: "emoji", valeur: "🎁" };
    }

    if (
        nom.includes("peluche") ||
        nom.includes("coussin")
    ) {
        return { type: "emoji", valeur: "🧸" };
    }

    if (nom.includes("enveloppe")) {
        return { type: "emoji", valeur: "💌" };
    }

    // Images PNG pour les autres cadeaux
    let image = "cadeaux/default.png";

    if (nom.includes("siège auto")) {
        image = "images/siege_auto.jpeg";
    } 
    else if (nom.includes("sac de maternité")) {
        image = "images/sac_maternite.jpeg";
    }
    else if (
        nom.includes("bavoir") ||
        nom.includes("bonnet") ||
        nom.includes("chaussette")
    ) {
        image = "images/Baby shoes clipart.jpeg";
    }
    else if (
        nom.includes("drap") ||
        nom.includes("serviette") ||
        nom.includes("couverture")
    ) {
        image = "images/draps.jpeg";
    }
    else if (nom.includes("poussette")) {
        image = "images/poussette.jpeg";
    }
    else if (nom.includes("vêtement")) {
        image = "images/vetement.jpeg";
    }
    else if (nom.includes("lait")) {
        image = "images/lait.jpeg";
    }
    else if (nom.includes("lingette")) {
        image = "images/lingette.jpeg";
    }
    else if (nom.includes("couche")) {
        image = "images/couche.jpeg";
    }
    else if (nom.includes("tapis de veille")) {
        image = "images/tapis_veille.jpeg";
    }
    else if (nom.includes("jouet")) {
        image = "images/jouet.jpeg";
    }

    return { type: "image", valeur: image };
}


// ==========================================
// 7. AFFICHER LES CADEAUX
// ==========================================

function afficherCadeaux() {

    listeCadeaux.innerHTML = "";

    if (cadeaux.length === 0) {

        listeCadeaux.textContent =
            "Aucun cadeau n'est actuellement disponible.";

        return;
    }

    cadeaux.forEach(cadeau => {

        const nombreReservations =
            compterReservations(cadeau.id_cadeau);

        const illimite = estIllimite(cadeau.nom);

        const limite = 5;

        const placesRestantes = limite - nombreReservations;

        const indisponible = !illimite && placesRestantes <= 0;

        // Création de la carte
        const carte = document.createElement("article");

        carte.classList.add("cadeau-card");

        if (indisponible) {
            carte.classList.add("indisponible");
        }

        
        // Visuel du cadeau
        const sticker = document.createElement("div");

        sticker.classList.add("cadeau-sticker");

        const visuel = obtenirVisuel(cadeau.nom);

        if (visuel.type === "emoji") {

            sticker.textContent = visuel.valeur;

        } else {

            const image = document.createElement("img");

            image.src = visuel.valeur;
            image.alt = cadeau.nom;

            image.classList.add("cadeau-image");

            // Image de secours si le PNG est introuvable
            image.onerror = function () {
                this.src = "cadeaux/default.png";
            };

            sticker.appendChild(image);

        }

        sticker.setAttribute("aria-hidden", "true");



        // Nom du cadeau
        const titre = document.createElement("h3");

        titre.textContent = cadeau.nom;
        

        // Disponibilité
        const disponibilite = document.createElement("p");

        disponibilite.classList.add("disponibilite");

        if (illimite) {

            disponibilite.textContent = "Disponible sans limite";

        } else if (indisponible) {

            disponibilite.textContent = "Complet";

        } else {

            disponibilite.textContent =
                `${placesRestantes} place(s) restante(s) sur 5`;

        }

        // Bouton de sélection
        const bouton = document.createElement("button");

        bouton.type = "button";

        if (indisponible) {

            bouton.textContent = "Indisponible";
            bouton.disabled = true;

        } else {

            bouton.textContent = "Choisir ce cadeau";

            bouton.addEventListener("click", function () {

                selectionnerCadeau(cadeau);

            });

        }

        carte.appendChild(sticker);
        carte.appendChild(titre);
        carte.appendChild(disponibilite);
        carte.appendChild(bouton);

        listeCadeaux.appendChild(carte);

    });

}

// ==========================================
// 8. SELECTIONNER UN CADEAU
// ==========================================

function selectionnerCadeau(cadeau) {

    cadeauChoisi = cadeau;

    cadeauSelectionne.textContent =
        "Vous avez choisi : " + cadeau.nom;

    sectionInscription.hidden = false;

    sectionInscription.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    console.log("Cadeau sélectionné :", cadeau);

}

// TEST DU ROLE SUPABASE

const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

console.log("SESSION SUPABASE :", sessionData.session);
console.log("ERREUR SESSION :", sessionError);

if (sessionData.session) {
    console.log("UTILISATEUR CONNECTE");
} else {
    console.log("UTILISATEUR ANONYME");
}





// ==========================================
// 12. Fonction reserver cadeau
// ==========================================

async function reserverCadeau(nom, prenom, telephone, idCadeau, message) {

    const { data, error } = await supabase.rpc("reserver_cadeau", {
        p_nom: nom,
        p_prenom: prenom,
        p_telephone: telephone,
        p_id_cadeau: idCadeau,
        p_message: message || null
    });

    if (error) {
        throw error;
    }

    return data;
}


// ==========================================
// 13. SOUMISSION DU FORMULAIRE INVITE
// ==========================================

formInvite.addEventListener("submit", async function (event) {

    event.preventDefault();

    const nom = champNom.value.trim();
    const prenom = champPrenom.value.trim();

    const telephone = champTelephone.value
        .trim()
        .replace(/[^\d+]/g, "");

    const message = champMessage.value.trim();

    if (!cadeauChoisi) {
        alert("Veuillez d'abord choisir un cadeau.");
        return;
    }

    if (!acceptConditions.checked) {
        alert("Veuillez accepter les conditions d'utilisation.");
        return;
    }

    const bouton = formInvite.querySelector('button[type="submit"]');

    bouton.disabled = true;
    bouton.textContent = "Enregistrement en cours...";

    try {

        const resultat = await reserverCadeau(
            nom,
            prenom,
            telephone,
            cadeauChoisi.id_cadeau,
            message
        );

        alert(
            "Votre inscription a été enregistrée avec succès !\n" +
            "Cadeau : " + resultat[0].nom_cadeau
        );

        formInvite.reset();

        cadeauChoisi = null;

        sectionInscription.hidden = true;

        await chargerCadeaux();

    } catch (error) {

        console.error("ERREUR ENREGISTREMENT :", error);

        alert(
            "Impossible d'enregistrer votre inscription :\n" +
            error.message
        );

    } finally {

        bouton.disabled = false;
        bouton.textContent = "Confirmer mon inscription";

    }

});