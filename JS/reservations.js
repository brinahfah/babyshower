
import { supabase } from "./config/supabase.js";

// =====================================
// 1. ELEMENTS HTML
// =====================================

const totalInvites = document.getElementById("totalInvites");
const totalCadeaux = document.getElementById("totalCadeaux");

const rechercheReservation = document.getElementById("rechercheReservation");
const btnActualiser = document.getElementById("btnActualiser");

const listeReservations = document.getElementById("listeReservations");

const messageChargement = document.getElementById("messageChargement");
const messageErreur = document.getElementById("messageErreur");
const messageVide = document.getElementById("messageVide");

// =====================================
// 2. VARIABLES
// =====================================

let reservations = [];
let reservationsGroupees = [];

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
// 4. MESSAGE D'ERREUR
// =====================================

function afficherErreur(message) {

    messageErreur.textContent = message;
    messageErreur.hidden = false;

    messageChargement.hidden = true;
    messageVide.hidden = true;
}

// =====================================
// 5. FORMATER LA DATE
// =====================================

function formaterDate(date) {

    if (!date) {
        return "Date inconnue";
    }

    const dateFormatee = new Date(date);

    if (Number.isNaN(dateFormatee.getTime())) {
        return "Date inconnue";
    }

    return dateFormatee.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// =====================================
// 6. REGROUPER LES RESERVATIONS
// =====================================

function regrouperReservations(donnees) {

    const groupes = new Map();

    donnees.forEach((reservation) => {

        const idInvite = reservation.id_invite;

        if (idInvite === null || idInvite === undefined) {
            return;
        }

        // Si l'invité n'existe pas encore dans le groupe
        if (!groupes.has(idInvite)) {

            groupes.set(idInvite, {
                id_invite: idInvite,
                nom: reservation.invite?.nom || "",
                prenom: reservation.invite?.prenom || "",
                telephone: reservation.invite?.telephone || "",
                date_inscription: reservation.date_reservation,
                cadeaux: []
            });
        }

        const groupe = groupes.get(idInvite);

        // Conserver la date la plus ancienne
        if (
            reservation.date_reservation &&
            (
                !groupe.date_inscription ||
                new Date(reservation.date_reservation) <
                new Date(groupe.date_inscription)
            )
        ) {
            groupe.date_inscription = reservation.date_reservation;
        }

        // Ajouter le cadeau au même invité
        if (reservation.cadeau?.nom) {
            groupe.cadeaux.push(reservation.cadeau.nom);
        }
    });

    return Array.from(groupes.values()).sort((a, b) => {

        return new Date(b.date_inscription) -
               new Date(a.date_inscription);
    });
}

// =====================================
// 7. CHARGER LES RESERVATIONS
// =====================================

async function chargerReservations() {

    messageChargement.hidden = false;
    messageChargement.textContent =
        "Chargement des réservations...";

    messageErreur.hidden = true;
    messageVide.hidden = true;

    listeReservations.innerHTML = "";

    const { data, error } = await supabase
        .from("reservation")
        .select(`
            id_invite,
            date_reservation,
            invite (
                nom,
                prenom,
                telephone
            ),
            cadeau (
                nom
            )
        `)
        .order("date_reservation", {
            ascending: false
        });

    if (error) {
        console.error("Erreur Supabase :", error);
        throw error;
    }

    reservations = data || [];

    // Regrouper les cadeaux par invité
    reservationsGroupees =
        regrouperReservations(reservations);

    // Mettre à jour les statistiques
    totalInvites.textContent =
        reservationsGroupees.length;

    totalCadeaux.textContent =
        reservationsGroupees.reduce(
            (total, invite) => total + invite.cadeaux.length,
            0
        );

    afficherReservations(reservationsGroupees);

    messageChargement.hidden = true;
}

// =====================================
// 8. AFFICHER LES RESERVATIONS GROUPEES
// =====================================

function afficherReservations(liste) {

    listeReservations.innerHTML = "";

    messageVide.hidden = true;
    messageErreur.hidden = true;

    if (liste.length === 0) {

        messageVide.textContent =
            reservationsGroupees.length === 0
                ? "Aucune inscription enregistrée pour le moment."
                : "Aucun invité ne correspond à votre recherche.";

        messageVide.hidden = false;
        return;
    }

   
liste.forEach((invite) => {

    const ligne = document.createElement("tr");

    // Date d'inscription
    const date = document.createElement("td");
    date.setAttribute("data-label", "Date d'inscription");
    date.textContent = formaterDate(invite.date_inscription);

    // Nom et prénom
    const nom = document.createElement("td");
    nom.setAttribute("data-label", "Invité");
    nom.textContent = `${invite.prenom} ${invite.nom}`.trim();

    // Téléphone
    const telephone = document.createElement("td");
    telephone.setAttribute("data-label", "Téléphone");
    telephone.textContent = invite.telephone || "Non renseigné";

    // Cadeaux réservés
    const cadeaux = document.createElement("td");
    cadeaux.setAttribute("data-label", "Cadeaux réservés");

    if (invite.cadeaux.length > 0) {
        cadeaux.textContent = invite.cadeaux.join(" • ");
    } else {
        cadeaux.textContent = "Aucun cadeau";
    }

    // Ajouter les cellules
    ligne.appendChild(date);
    ligne.appendChild(nom);
    ligne.appendChild(telephone);
    ligne.appendChild(cadeaux);

    listeReservations.appendChild(ligne);
});
}

// =====================================
// 9. RECHERCHE
// =====================================

function rechercherReservation() {

    const recherche = rechercheReservation.value
        .trim()
        .toLowerCase();

    const resultat = reservationsGroupees.filter((invite) => {

        const texte = `
            ${invite.nom}
            ${invite.prenom}
            ${invite.telephone}
            ${invite.cadeaux.join(" ")}
        `.toLowerCase();

        return texte.includes(recherche);
    });

    afficherReservations(resultat);
}

// =====================================
// 10. ACTUALISATION
// =====================================

async function actualiserReservations() {

    btnActualiser.disabled = true;
    btnActualiser.textContent = "Actualisation...";

    try {

        await chargerReservations();

        rechercheReservation.value = "";

        afficherReservations(reservationsGroupees);

    } catch (error) {

        console.error("Erreur actualisation :", error);

        afficherErreur(
            "Impossible de récupérer les réservations. Veuillez réessayer."
        );

    } finally {

        btnActualiser.disabled = false;
        btnActualiser.textContent = "↻ Actualiser";
    }
}

// =====================================
// 11. EVENEMENTS
// =====================================

rechercheReservation.addEventListener(
    "input",
    rechercherReservation
);

btnActualiser.addEventListener(
    "click",
    actualiserReservations
);

// =====================================
// 12. INITIALISATION
// =====================================

async function initialiserPage() {

    const autorise = await verifierAdministrateur();

    if (!autorise) {
        return;
    }

    try {

        await chargerReservations();

    } catch (error) {

        console.error("Erreur chargement :", error);

        afficherErreur(
            "Impossible de charger les réservations."
        );
    }
}

initialiserPage();
