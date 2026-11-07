
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
let cadeauChoisi = null;

let abonnementReservations = null;

let recapitulatifValide = false;

const LIMITE_RESERVATION = 5;

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
// 4. REGEX DE VALIDATION
// ==========================================

// Lettres uniquement : accents autorisés.
// Espaces, apostrophes et traits d'union autorisés.
// Les chiffres sont interdits.

const REGEX_NOM =
    /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

// Téléphone gabonais : +241 suivi de 8 chiffres.
// Les préfixes mobiles 6 et 7 sont acceptés.

const REGEX_TELEPHONE =
    /^\+241[67]\d{7}$/;

// Message de souhait : lettres, chiffres, ponctuation,
// espaces et emojis autorisés.

const REGEX_SOUHAIT =
    /^[\p{L}\p{M}\p{N}\p{Zs}\p{P}\p{S}\u200D\uFE0F]*$/u;

// ==========================================
// 5. SECURISER LES CHAMPS DE SAISIE
// ==========================================

// Empêcher les chiffres dans le nom.

champNom.addEventListener("input", function () {

    this.value = this.value.replace(/[^\p{L}\p{M} '\u2019-]/gu, "");

});

// Empêcher les chiffres dans le prénom.

champPrenom.addEventListener("input", function () {

    this.value = this.value.replace(/[^\p{L}\p{M} '\u2019-]/gu, "");

});

// Autoriser uniquement les chiffres, le + initial
// et les espaces dans le téléphone.

champTelephone.addEventListener("input", function () {

    let valeur = this.value.replace(/[^\d+ ]/g, "");

    // Le signe + doit être uniquement au début.

    valeur = valeur.replace(/\+/g, "");

    if (this.value.trim().startsWith("+")) {
        valeur = "+" + valeur;
    }

    // Maximum : +241 suivi de 8 chiffres.

    const commenceAvecIndicatif = valeur.startsWith("+241");

    if (commenceAvecIndicatif) {

        const indicatif = "+241";

        const chiffres = valeur
            .substring(4)
            .replace(/\D/g, "")
            .slice(0, 8);

        valeur = indicatif + chiffres;

    } else {

        const chiffres = valeur
            .replace(/\D/g, "")
            .slice(0, 11);

        valeur = chiffres;

    }

    this.value = valeur;

});

// ==========================================
// 6. FONCTIONS DE VALIDATION
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

    // Refuser les caractères pouvant construire
    // des balises ou des chemins.

    if (/[<>/\\]/.test(message)) {
        return false;
    }

    return true;

}

// ==========================================
// 7. INVALIDER LE RECAPITULATIF SI MODIFICATION
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
// 8. DETERMINER LES CADEAUX ILLIMITES
// ==========================================

function estIllimite(nom) {

    const nomNormalise = normaliserNom(nom);

    return (
        nomNormalise.includes("enveloppe") ||
        nomNormalise.includes("couche") ||
        nomNormalise.includes("lingette")
    );

}

// ==========================================
// 9. OUVRIR LA LISTE DES CADEAUX
// ==========================================

btnCommencer.addEventListener("click", async function () {

    modeEmploi.hidden = true;

    sectionCadeaux.hidden = false;

    await chargerCadeaux();

});

// ==========================================
// 10. RECUPERER LES DONNEES DE SUPABASE
// ==========================================

async function chargerCadeaux() {

    try {

        listeCadeaux.textContent = "Chargement des cadeaux...";

        // Récupérer les cadeaux.

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

        // Récupérer les réservations.

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
// 11. ACTUALISATION AUTOMATIQUE
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
// 12. COMPTER LES RESERVATIONS
// ==========================================

function compterReservations(idCadeau) {

    return reservations.filter(
        reservation =>
            String(reservation.id_cadeau) === String(idCadeau)
    ).length;

}

// ==========================================
// 13. CALCULER LES PLACES RESTANTES
// ==========================================

function calculerPlacesRestantes(cadeau) {

    const nombreReservations =
        compterReservations(cadeau.id_cadeau);

    return LIMITE_RESERVATION - nombreReservations;

}

// ==========================================
// 14. VERIFIER SI UN CADEAU EST COMPLET
// ==========================================

function estIndisponible(cadeau) {

    if (estIllimite(cadeau.nom)) {
        return false;
    }

    return calculerPlacesRestantes(cadeau) <= 0;

}

// ==========================================
// 15. VISUELS DES CADEAUX
// ==========================================

function obtenirVisuel(nomCadeau) {

    const nom = normaliserNom(nomCadeau);

    // Emojis.

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
        nom.includes("mustela")
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

    // Images PNG/JPEG.

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

    else if (nom.includes("tapis de veille")) {
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
// 16. AFFICHER LES CADEAUX
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

        const placesRestantes =
            LIMITE_RESERVATION - nombreReservations;

        const indisponible =
            !illimite && placesRestantes <= 0;

        // Carte.

        const carte = document.createElement("article");

        carte.classList.add("cadeau-card");

        if (indisponible) {
            carte.classList.add("indisponible");
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

        }

        else if (indisponible) {

            disponibilite.textContent = "0 place restante sur 5";

        }

        else {

            disponibilite.textContent =
                `${placesRestantes} place(s) restante(s) sur 5`;

        }

        // Bouton.

        const bouton = document.createElement("button");

        bouton.type = "button";

        if (indisponible) {

            bouton.textContent = "Cadeau complet";

            bouton.classList.add("bouton-indisponible");

            bouton.addEventListener("click", function () {

                alert(
                    "Ce cadeau a déjà atteint sa limite de réservation.\n\n" +
                    "Il n'est plus disponible. Merci de choisir un autre cadeau."
                );

            });

        }

        else {

            bouton.textContent = "Choisir ce cadeau";

            bouton.addEventListener("click", function () {

                if (estIndisponible(cadeau)) {

                    chargerCadeaux();

                    alert(
                        "Ce cadeau n'est plus disponible.\n\n" +
                        "Sa limite de réservation vient d'être atteinte. " +
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
// 17. SELECTIONNER UN CADEAU
// ==========================================

function selectionnerCadeau(cadeau) {

    if (estIndisponible(cadeau)) {

        alert(
            "Ce cadeau n'est plus disponible. Merci d'en choisir un autre."
        );

        chargerCadeaux();

        return;

    }

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

// ==========================================
// 18. VERIFICATION DE LA SESSION SUPABASE
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
// 19. FONCTION RESERVER CADEAU
// ==========================================

async function reserverCadeau(
    nom,
    prenom,
    telephone,
    idCadeau,
    message
) {

    // CORRECTION : normalisation du téléphone.

    const telephoneNormalise = telephone.replace(/\s/g, "");

    const { data, error } = await supabase.rpc(
        "reserver_cadeau",
        {
            p_nom: nom,
            p_prenom: prenom,
            p_telephone: telephoneNormalise,
            p_id_cadeau: idCadeau,
            p_message: message || null
        }
    );

    if (error) {
        throw error;
    }

    return data;

}

// ==========================================
// 20. AFFICHER LE RECAPITULATIF
// ==========================================

function verifierInformations() {

    const nom = champNom.value.trim();

    const prenom = champPrenom.value.trim();

    const telephone = champTelephone.value.trim();

    const message = champMessage.value.trim();

    // Réinitialiser les erreurs.

    document.getElementById("erreurNom").textContent = "";
    document.getElementById("erreurPrenom").textContent = "";
    document.getElementById("erreurTelephone").textContent = "";
    document.getElementById("erreurMessage").textContent = "";

    // Vérifier le nom.

    if (!validerNomPrenom(nom)) {

        document.getElementById("erreurNom").textContent =
            "Veuillez saisir un nom valide, sans chiffres.";

        champNom.focus();

        return false;

    }

    // Vérifier le prénom.

    if (!validerNomPrenom(prenom)) {

        document.getElementById("erreurPrenom").textContent =
            "Veuillez saisir un prénom valide, sans chiffres.";

        champPrenom.focus();

        return false;

    }

    // Vérifier le téléphone.

    if (!validerTelephone(telephone)) {

        document.getElementById("erreurTelephone").textContent =
            "Format attendu : +241 77 23 45 67 (8 chiffres après +241).";

        champTelephone.focus();

        return false;

    }

    // Vérifier le souhait.

    if (!validerSouhait(message)) {

        document.getElementById("erreurMessage").textContent =
            "Votre message est invalide ou dépasse 300 caractères.";

        champMessage.focus();

        return false;

    }

    // Vérifier le cadeau.

    if (!cadeauChoisi) {

        alert("Veuillez choisir un cadeau avant de continuer.");

        return false;

    }

    // Vérifier les conditions.

    if (!acceptConditions.checked) {

        alert("Veuillez accepter les conditions avant de continuer.");

        acceptConditions.focus();

        return false;

    }

    // Vérifier une dernière fois la disponibilité.

    if (estIndisponible(cadeauChoisi)) {

        alert("Ce cadeau n'est malheureusement plus disponible.");

        chargerCadeaux();

        return false;

    }

    // Remplir le récapitulatif.

    recapNom.textContent = nom;

    recapPrenom.textContent = prenom;

    recapTelephone.textContent = telephone;

    recapCadeau.textContent = cadeauChoisi.nom;

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
// 21. EVENEMENT DU BOUTON VERIFIER
// ==========================================

boutonVerifier.addEventListener("click", function () {

    verifierInformations();

});

// ==========================================
// 22. RETOUR AU FORMULAIRE
// ==========================================

boutonModifier.addEventListener("click", function () {

    sectionRecapitulatif.hidden = true;

    boutonVerifier.hidden = false;

    recapitulatifValide = false;

    champNom.focus();

});

// ==========================================
// 23. SOUMISSION DU FORMULAIRE
// ==========================================

formInvite.addEventListener("submit", async function (event) {

    event.preventDefault();

    // Vérifier que le récapitulatif a été validé.

    if (!recapitulatifValide) {

        alert(
            "Veuillez d'abord vérifier vos informations avant de confirmer."
        );

        verifierInformations();

        return;

    }

    // Récupérer les informations.

    const nom = champNom.value.trim();

    const prenom = champPrenom.value.trim();

    const telephone = champTelephone.value.trim();

    const message = champMessage.value.trim();

    // Vérification finale.

    if (
        !validerNomPrenom(nom) ||
        !validerNomPrenom(prenom) ||
        !validerTelephone(telephone) ||
        !validerSouhait(message) ||
        !cadeauChoisi ||
        !acceptConditions.checked
    ) {

        recapitulatifValide = false;

        verifierInformations();

        return;

    }

    const bouton = formInvite.querySelector(
        'button[type="submit"]'
    );

    bouton.disabled = true;

    bouton.textContent = "Enregistrement en cours...";

    try {

        // Enregistrement dans Supabase.

        const resultat = await reserverCadeau(
            nom,
            prenom,
            telephone,
            cadeauChoisi.id_cadeau,
            message
        );

        alert(
            "Votre inscription a été enregistrée avec succès !\n" +
            "Cadeau : " +
            (resultat?.[0]?.nom_cadeau || cadeauChoisi.nom)
        );

        // Réinitialisation.

        formInvite.reset();

        cadeauChoisi = null;

        recapitulatifValide = false;

        sectionRecapitulatif.hidden = true;

        boutonVerifier.hidden = false;

        sectionInscription.hidden = true;

        // Actualiser les disponibilités.

        await chargerCadeaux();

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
// 24. DEMARRER L'ECOUTE DES RESERVATIONS
// ==========================================

ecouterReservations();
