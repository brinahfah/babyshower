
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

// ==========================================
// 9. ENREGISTRER L'INVITE
// ==========================================

async function enregistrerInvite(nom, prenom) {

    const { data, error } = await supabase
        .from("invite")
        .insert([
            {
                nom: nom,
                prenom: prenom
            }
        ])
        .select("id_invite")
        .single();

    if (error) {
        throw error;
    }

    console.log("INVITE ENREGISTRE :", data);

    return data.id_invite;

}

// ==========================================
// 10. ENREGISTRER LA RESERVATION
// ==========================================

async function enregistrerReservation(idInvite, idCadeau) {

    const { data, error } = await supabase
        .from("reservation")
        .insert([
            {
                id_invite: idInvite,
                id_cadeau: idCadeau
            }
        ])
        .select()
        .single();

    if (error) {
        throw error;
    }

    console.log("RESERVATION ENREGISTREE :", data);

    return data;

}

// ==========================================
// 11. ENREGISTRER LE SOUHAIT
// ==========================================

async function enregistrerSouhait(idInvite, message) {

    // Aucun message : aucune insertion
    if (!message) {
        return;
    }

    const { data, error } = await supabase
        .from("souhait")
        .insert([
            {
                id_invite: idInvite,
                message: message
            }
        ])
        .select()
        .single();

    if (error) {
        throw error;
    }

    console.log("SOUHAIT ENREGISTRE :", data);

}

// ==========================================
// 12. ANNULER LES INSERTIONS EN CAS D'ERREUR
// ==========================================

async function annulerInscription(idInvite, reservationCreee) {

    // Supprimer d'abord la réservation
    if (reservationCreee) {

        const { error } = await supabase
            .from("reservation")
            .delete()
            .eq("id_invite", idInvite);

        if (error) {
            console.error("Erreur suppression réservation :", error);
        }

    }

    // Supprimer ensuite l'invité
    const { error } = await supabase
        .from("invite")
        .delete()
        .eq("id_invite", idInvite);

    if (error) {
        console.error("Erreur suppression invité :", error);
    }

}

// ==========================================
// 13. AFFICHER LA CONFIRMATION
// ==========================================

function afficherConfirmation() {

    messageConfirmation.textContent = cadeauChoisi.nom;

    sectionInscription.hidden = true;
    sectionCadeaux.hidden = true;
    confirmation.hidden = false;

    confirmation.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}

// ==========================================
// 14. GERER LA VALIDATION DU FORMULAIRE
// ==========================================

formInvite.addEventListener("submit", async function (event) {

    event.preventDefault();

    // Vérifier qu'un cadeau a été sélectionné
    if (!cadeauChoisi) {

        alert("Veuillez d'abord choisir un cadeau.");

        return;
    }

    // Récupération des informations
    const nom = champNom.value.trim();
    const prenom = champPrenom.value.trim();
    const message = champMessage.value.trim();

    // Vérification des champs
    if (!nom || !prenom) {

        alert("Veuillez renseigner votre nom et votre prénom.");

        return;
    }

    if (!acceptConditions.checked) {

        alert("Vous devez accepter les conditions d'utilisation.");

        return;
    }

    // Désactiver le bouton pendant l'enregistrement
    const boutonValidation = formInvite.querySelector(
        'button[type="submit"]'
    );

    boutonValidation.disabled = true;
    boutonValidation.textContent = "Enregistrement en cours...";

    let idInvite = null;
    let reservationCreee = false;

    try {

        // 1. Enregistrer l'invité
        idInvite = await enregistrerInvite(nom, prenom);

        // 2. Enregistrer sa réservation
        await enregistrerReservation(
            idInvite,
            cadeauChoisi.id_cadeau
        );

        reservationCreee = true;

        // 3. Enregistrer son souhait si renseigné
        await enregistrerSouhait(idInvite, message);

        console.log("INSCRIPTION TERMINEE AVEC SUCCES !");

        // 4. Afficher la confirmation
        afficherConfirmation();

        // 5. Actualiser les réservations en mémoire
        reservations.push({
            id_cadeau: cadeauChoisi.id_cadeau
        });

    } catch (error) {

        console.error("ERREUR INSCRIPTION :", error);

        // Annuler les insertions déjà effectuées
        if (idInvite !== null) {

            await annulerInscription(
                idInvite,
                reservationCreee
            );

        }

        alert(
            "Une erreur est survenue lors de votre inscription. " +
            "Veuillez réessayer. Si le problème persiste, contactez les futurs parents."
        );

    } finally {

        // Réactiver le bouton
        boutonValidation.disabled = false;
        boutonValidation.textContent = "Confirmer ma réservation";

    }

});
