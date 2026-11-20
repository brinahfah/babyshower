
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
const champTelephone = document.getElementById("telephone");
const champMessage = document.getElementById("message");

const acceptConditions = document.getElementById("acceptConditions");

const boutonVerifier = document.getElementById("boutonVerifier");
const boutonModifier = document.getElementById("boutonModifier");

const sectionRecapitulatif = document.getElementById("sectionRecapitulatif");

const recapNom = document.getElementById("recapNom");
const recapPrenom = document.getElementById("recapPrenom");
const recapTelephone = document.getElementById("recapTelephone");
const recapCadeau = document.getElementById("recapCadeau");
const recapMessage = document.getElementById("recapMessage");

// ==========================================
// 2. VARIABLES
// ==========================================

let cadeaux = [];
let reservations = [];

// Plusieurs cadeaux peuvent être sélectionnés.
let cadeauxChoisis = [];

let abonnementReservations = null;
let recapitulatifValide = false;

// ==========================================
// 3. NORMALISER LES NOMS
// ==========================================

function normaliserNom(nom) {

    return nom
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}

// ==========================================
// 4. DETERMINER LES CADEAUX ILLIMITES
// ==========================================

function estIllimite(nom) {

    const nomNormalise = normaliserNom(nom);

    return (
        nomNormalise.includes("enveloppe") ||
        nomNormalise.includes("couche") ||
        nomNormalise.includes("lingette") ||
        nomNormalise.includes("vetement")
    );

}

// ==========================================
// 5. DETERMINER LA LIMITE DE RESERVATION
// ==========================================

function obtenirLimite(cadeau) {

    const nom = normaliserNom(cadeau.nom);

    // Cadeaux illimités.
    if (estIllimite(cadeau.nom)) {
        return Infinity;
    }

    // Cadeaux limités à une seule réservation.
    if (
        nom.includes("poussette") ||
        nom.includes("siege auto") ||
        nom.includes("sac de maternite") ||
        (nom.includes("tapis") && nom.includes("eveil"))
    ) {
        return 1;
    }

    // Tous les autres cadeaux sont limités à 5.
    return 5;

}

// ==========================================
// 6. REGEX DE VALIDATION
// ==========================================

const REGEX_NOM =
    /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

const REGEX_TELEPHONE =
    /^\+241[67]\d{7}$/;

const REGEX_SOUHAIT =
    /^[\p{L}\p{M}\p{N}\p{Zs}\p{P}\p{S}\u200D\uFE0F]*$/u;

// ==========================================
// 7. SECURISER LES CHAMPS DE SAISIE
// ==========================================

champNom.addEventListener("input", function () {

    this.value = this.value.replace(/[^\p{L}\p{M} '\u2019-]/gu, "");

});

champPrenom.addEventListener("input", function () {

    this.value = this.value.replace(/[^\p{L}\p{M} '\u2019-]/gu, "");

});

champTelephone.addEventListener("input", function () {

    let valeur = this.value;

    valeur = valeur.replace(/[^\d+ ]/g, "");

    const aUnIndicatif = valeur.startsWith("+");

    valeur = valeur.replace(/\+/g, "");

    const chiffres = valeur.replace(/\D/g, "").slice(0, 11);

    let resultat = "";

    if (aUnIndicatif) {
        resultat = "+";
    }

    for (let i = 0; i < chiffres.length; i++) {

        if (aUnIndicatif && i === 3) {

            resultat += " ";

        } else if (aUnIndicatif && i > 3 && (i - 3) % 2 === 0) {

            resultat += " ";

        }

        resultat += chiffres[i];

    }

    this.value = resultat;

});

// ==========================================
// 8. FONCTIONS DE VALIDATION
// ==========================================

function validerNomPrenom(valeur) {

    return REGEX_NOM.test(valeur.trim());

}

function validerTelephone(valeur) {

    const telephoneNormalise = valeur.replace(/\s/g, "");

    return REGEX_TELEPHONE.test(telephoneNormalise);

}

function validerSouhait(valeur) {

    const message = valeur.trim();

    if (message.length > 300) {
        return false;
    }

    if (!REGEX_SOUHAIT.test(message)) {
        return false;
    }

    if (/[<>/\\]/.test(message)) {
        return false;
    }

    return true;

}

// ==========================================
// 9. INVALIDER LE RECAPITULATIF SI MODIFICATION
// ==========================================

[
    champNom,
    champPrenom,
    champTelephone,
    champMessage
].forEach(champ => {

    champ.addEventListener("input", function () {

        recapitulatifValide = false;

        sectionRecapitulatif.hidden = true;

        boutonVerifier.hidden = false;

    });

});

acceptConditions.addEventListener("change", function () {

    recapitulatifValide = false;

    sectionRecapitulatif.hidden = true;

    boutonVerifier.hidden = false;

});

// ==========================================
// 10. OUVRIR LA LISTE DES CADEAUX
// ==========================================

btnCommencer.addEventListener("click", async function () {

    modeEmploi.hidden = true;

    sectionCadeaux.hidden = false;

    await chargerCadeaux();

});

// ==========================================
// 11. RECUPERER LES DONNEES DE SUPABASE
// ==========================================

async function chargerCadeaux() {

    try {

        listeCadeaux.textContent = "Chargement des cadeaux...";

        const {
            data: donneesCadeaux,
            error: erreurCadeaux
        } = await supabase
            .from("cadeau")
            .select("*")
            .order("id_cadeau", { ascending: true });

        if (erreurCadeaux) {
            throw erreurCadeaux;
        }

        cadeaux = donneesCadeaux || [];

        const {
            data: donneesReservations,
            error: erreurReservations
        } = await supabase
            .from("reservation")
            .select("id_cadeau");

        if (erreurReservations) {
            throw erreurReservations;
        }

        reservations = donneesReservations || [];

        afficherCadeaux();

    } catch (error) {

        console.error("Erreur lors du chargement :", error);

        listeCadeaux.textContent =
            "Une erreur est survenue lors du chargement des cadeaux.";

    }

}

// ==========================================
// 12. ACTUALISATION AUTOMATIQUE
// ==========================================

function ecouterReservations() {

    if (abonnementReservations) {
        return;
    }

    abonnementReservations = supabase
        .channel("actualisation-reservations")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "reservation"
            },
            async function (payload) {

                console.log("Changement de réservation :", payload);

                await chargerCadeaux();

            }
        )
        .subscribe(status => {

            console.log("Etat de l'abonnement :", status);

        });

}

// ==========================================
// 13. COMPTER LES RESERVATIONS
// ==========================================

function compterReservations(idCadeau) {

    return reservations.filter(
        reservation =>
            String(reservation.id_cadeau) === String(idCadeau)
    ).length;

}

// ==========================================
// 14. CALCULER LES PLACES RESTANTES
// ==========================================

function calculerPlacesRestantes(cadeau) {

    const limite = obtenirLimite(cadeau);

    if (limite === Infinity) {
        return Infinity;
    }

    return limite - compterReservations(cadeau.id_cadeau);

}

// ==========================================
// 15. VERIFIER SI UN CADEAU EST COMPLET
// ==========================================

function estIndisponible(cadeau) {

    if (estIllimite(cadeau.nom)) {
        return false;
    }

    return calculerPlacesRestantes(cadeau) <= 0;

}

// ==========================================
// 16. VISUELS DES CADEAUX
// ==========================================

function obtenirVisuel(nomCadeau) {

    const nom = normaliserNom(nomCadeau);

    if (
        nom.includes("biberon") ||
        nom.includes("tetine") ||
        nom.includes("chauffe-biberon")
    ) {
        return {
            type: "emoji",
            valeur: "🍼"
        };
    }

    if (
        nom.includes("toilette") ||
        nom.includes("biolane") ||
        nom.includes("mustela") ||
        nom.includes("lait de corps") ||
        nom.includes("gel nettoyant") ||
        nom.includes("eau de toilette") ||
        nom.includes("huile de massage") ||
        nom.includes("creme de change") ||
        nom.includes("poudre")
    ) {
        return {
            type: "emoji",
            valeur: "🧴"
        };
    }

    if (nom.includes("cadeau au choix")) {
        return {
            type: "emoji",
            valeur: "🎁"
        };
    }

    if (
        nom.includes("peluche") ||
        nom.includes("coussin")
    ) {
        return {
            type: "emoji",
            valeur: "🧸"
        };
    }

    if (nom.includes("enveloppe")) {
        return {
            type: "emoji",
            valeur: "💌"
        };
    }

    let image = "cadeaux/default.png";

    if (nom.includes("siege auto")) {
        image = "images/siege_auto.jpeg";
    }

    else if (nom.includes("sac de maternite")) {
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

    else if (nom.includes("vetement")) {
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

    else if (nom.includes("tapis")) {
        image = "images/tapis_veille.jpeg";
    }

    else if (nom.includes("jouet")) {
        image = "images/jouet.jpeg";
    }

    return {
        type: "image",
        valeur: image
    };

}

// ==========================================
// 17. METTRE A JOUR LES CADEAUX SELECTIONNES
// ==========================================

function mettreAJourSelection() {

    if (cadeauxChoisis.length === 0) {

        cadeauSelectionne.textContent =
            "Aucun cadeau sélectionné.";

        sectionInscription.hidden = true;

        recapitulatifValide = false;

        sectionRecapitulatif.hidden = true;

        return;

    }

    const noms = cadeauxChoisis.map(cadeau => cadeau.nom);

    cadeauSelectionne.textContent =
        "Vos cadeaux sélectionnés : " + noms.join(", ");

    sectionInscription.hidden = false;

    recapitulatifValide = false;

    sectionRecapitulatif.hidden = true;

    boutonVerifier.hidden = false;

}

// ==========================================
// 18. SELECTIONNER OU RETIRER UN CADEAU
// ==========================================

function selectionnerCadeau(cadeau) {

    const index = cadeauxChoisis.findIndex(
        element =>
            String(element.id_cadeau) === String(cadeau.id_cadeau)
    );

    // Si le cadeau est déjà sélectionné, on le retire.

    if (index !== -1) {

        cadeauxChoisis.splice(index, 1);

        mettreAJourSelection();

        afficherCadeaux();

        return;

    }

    // Vérifier la disponibilité.

    if (estIndisponible(cadeau)) {

        alert(
            "Ce cadeau n'est malheureusement plus disponible."
        );

        chargerCadeaux();

        return;

    }

    // Ajouter le cadeau à la sélection.

    cadeauxChoisis.push(cadeau);

    mettreAJourSelection();

    afficherCadeaux();

    console.log("Cadeaux sélectionnés :", cadeauxChoisis);

}

// ==========================================
// 19. AFFICHER LES CADEAUX
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

        const limite = obtenirLimite(cadeau);

        const illimite = limite === Infinity;

        const placesRestantes = illimite
            ? Infinity
            : limite - nombreReservations;

        const indisponible =
            !illimite && placesRestantes <= 0;

        const estSelectionne = cadeauxChoisis.some(
            element =>
                String(element.id_cadeau) === String(cadeau.id_cadeau)
        );

        // Carte.

        const carte = document.createElement("article");

        carte.classList.add("cadeau-card");

        if (indisponible) {
            carte.classList.add("indisponible");
        }

        if (estSelectionne) {
            carte.classList.add("selectionne");
        }

        // Sticker.

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

            image.onerror = function () {

                this.onerror = null;

                this.src = "cadeaux/default.png";

            };

            sticker.appendChild(image);

        }

        sticker.setAttribute("aria-hidden", "true");

        // Nom.

        const titre = document.createElement("h3");

        titre.textContent = cadeau.nom;

        // Disponibilité.

        const disponibilite = document.createElement("p");

        disponibilite.classList.add("disponibilite");

        if (illimite) {

            disponibilite.textContent = "Disponible sans limite";

        } else if (indisponible) {

            disponibilite.textContent =
                `0 place restante sur ${limite}`;

        } else {

            disponibilite.textContent =
                `${placesRestantes} place(s) restante(s) sur ${limite}`;

        }

        // Bouton.

        const bouton = document.createElement("button");

        bouton.type = "button";

        if (indisponible && !estSelectionne) {

            bouton.textContent = "Cadeau complet";

            bouton.classList.add("bouton-indisponible");

            bouton.addEventListener("click", function () {

                alert(
                    "Ce cadeau a déjà atteint sa limite de réservation.\n\n" +
                    "Il n'est plus disponible. Merci de choisir un autre cadeau."
                );

            });

        } else {

            bouton.textContent = estSelectionne
                ? "Retirer ce cadeau"
                : "Choisir ce cadeau";

            bouton.addEventListener("click", function () {

                if (!estSelectionne && estIndisponible(cadeau)) {

                    chargerCadeaux();

                    alert(
                        "Ce cadeau n'est plus disponible. " +
                        "Merci de choisir un autre cadeau."
                    );

                    return;

                }

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
// 20. VERIFICATION DE LA SESSION SUPABASE
// ==========================================

const {
    data: sessionData,
    error: sessionError
} = await supabase.auth.getSession();

console.log("SESSION SUPABASE :", sessionData.session);

console.log("ERREUR SESSION :", sessionError);

if (sessionData.session) {

    console.log("UTILISATEUR CONNECTE");

} else {

    console.log("UTILISATEUR ANONYME");

}

// ==========================================
// 21. FONCTION RESERVER PLUSIEURS CADEAUX
// ==========================================

async function reserverCadeau(
    nom,
    prenom,
    telephone,
    idsCadeaux,
    message
) {

    const telephoneNormalise = telephone.replace(/\s/g, "");

    const { data, error } = await supabase.rpc(
        "reserver_cadeau",
        {
            p_nom: nom,
            p_prenom: prenom,
            p_telephone: telephoneNormalise,
            p_ids_cadeaux: idsCadeaux,
            p_message: message || null
        }
    );

    if (error) {
        throw error;
    }

    return data;

}

// ==========================================
// 22. VERIFIER LES INFORMATIONS
// ==========================================

function verifierInformations() {

    const nom = champNom.value.trim();
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    const message = champMessage.value.trim();

    document.getElementById("erreurNom").textContent = "";
    document.getElementById("erreurPrenom").textContent = "";
    document.getElementById("erreurTelephone").textContent = "";
    document.getElementById("erreurMessage").textContent = "";

    // Nom.

    if (!validerNomPrenom(nom)) {

        document.getElementById("erreurNom").textContent =
            "Veuillez saisir un nom valide, sans chiffres.";

        champNom.focus();

        return false;

    }

    // Prénom.

    if (!validerNomPrenom(prenom)) {

        document.getElementById("erreurPrenom").textContent =
            "Veuillez saisir un prénom valide, sans chiffres.";

        champPrenom.focus();

        return false;

    }

    // Téléphone.

    if (!validerTelephone(telephone)) {

        document.getElementById("erreurTelephone").textContent =
            "Format attendu : +241 77 23 45 67 (8 chiffres après +241).";

        champTelephone.focus();

        return false;

    }

    // Message.

    if (!validerSouhait(message)) {

        document.getElementById("erreurMessage").textContent =
            "Votre message est invalide ou dépasse 300 caractères.";

        champMessage.focus();

        return false;

    }

    // Vérifier la sélection multiple.

    if (cadeauxChoisis.length === 0) {

        alert("Veuillez choisir au moins un cadeau.");

        return false;

    }

    // Conditions.

    if (!acceptConditions.checked) {

        alert("Veuillez accepter les conditions avant de continuer.");

        acceptConditions.focus();

        return false;

    }

    // Vérifier la disponibilité de tous les cadeaux.

    const cadeauxIndisponibles = cadeauxChoisis.filter(
        cadeau => estIndisponible(cadeau)
    );

    if (cadeauxIndisponibles.length > 0) {

        alert(
            "Certains cadeaux que vous avez sélectionnés ne sont plus disponibles.\n\n" +
            cadeauxIndisponibles.map(cadeau => cadeau.nom).join(", ")
        );

        chargerCadeaux();

        return false;

    }

    // Remplir le récapitulatif.

    recapNom.textContent = nom;

    recapPrenom.textContent = prenom;

    recapTelephone.textContent = telephone;

    recapCadeau.textContent = cadeauxChoisis
        .map(cadeau => cadeau.nom)
        .join(", ");

    recapMessage.textContent =
        message || "Aucun souhait renseigné.";

    // Afficher le récapitulatif.

    sectionRecapitulatif.hidden = false;

    boutonVerifier.hidden = true;

    recapitulatifValide = true;

    sectionRecapitulatif.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    return true;

}

// ==========================================
// 23. EVENEMENT DU BOUTON VERIFIER
// ==========================================

boutonVerifier.addEventListener("click", function () {

    verifierInformations();

});

// ==========================================
// 24. RETOUR AU FORMULAIRE
// ==========================================

boutonModifier.addEventListener("click", function () {

    sectionRecapitulatif.hidden = true;

    boutonVerifier.hidden = false;

    recapitulatifValide = false;

    champNom.focus();

});

// ==========================================
// 25. SOUMISSION DU FORMULAIRE
// ==========================================

formInvite.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (!recapitulatifValide) {

        alert(
            "Veuillez d'abord vérifier vos informations avant de confirmer."
        );

        verifierInformations();

        return;

    }

    const nom = champNom.value.trim();
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    const message = champMessage.value.trim();

    if (
        !validerNomPrenom(nom) ||
        !validerNomPrenom(prenom) ||
        !validerTelephone(telephone) ||
        !validerSouhait(message) ||
        cadeauxChoisis.length === 0 ||
        !acceptConditions.checked
    ) {

        recapitulatifValide = false;

        verifierInformations();

        return;

    }

    // Récupérer les identifiants de tous les cadeaux.

    const idsCadeaux = cadeauxChoisis.map(
        cadeau => cadeau.id_cadeau
    );

    const nomsCadeaux = cadeauxChoisis.map(
        cadeau => cadeau.nom
    );

    const bouton = formInvite.querySelector(
        'button[type="submit"]'
    );

    bouton.disabled = true;

    bouton.textContent = "Enregistrement en cours...";

    try {

        // Enregistrer tous les cadeaux en une seule inscription.

        const resultat = await reserverCadeau(
            nom,
            prenom,
            telephone,
            idsCadeaux,
            message
        );

        console.log("RESERVATIONS ENREGISTREES :", resultat);

        // Afficher la confirmation.

        messageConfirmation.textContent = nomsCadeaux.join(", ");

        confirmation.hidden = false;

        sectionInscription.hidden = true;

        sectionCadeaux.hidden = true;

        // Réinitialiser le formulaire.

        formInvite.reset();

        cadeauxChoisis = [];

        recapitulatifValide = false;

        sectionRecapitulatif.hidden = true;

        boutonVerifier.hidden = false;

        // Actualiser les disponibilités.

        await chargerCadeaux();

        confirmation.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

    catch (error) {

        console.error("ERREUR ENREGISTREMENT :", error);

        await chargerCadeaux();

        alert(
            "Impossible d'enregistrer votre inscription :\n" +
            error.message
        );

    }

    finally {

        bouton.disabled = false;

        bouton.textContent = "Confirmer mon inscription";

    }

});

// ==========================================
// 26. DEMARRER L'ECOUTE DES RESERVATIONS
// ==========================================

ecouterReservations();
