
import { supabase } from "./config/supabase.js";

// ======================================
// ÉLÉMENTS HTML
// ======================================

const totalCadeaux = document.getElementById("totalCadeaux");
const totalReserves = document.getElementById("totalReserves");
const totalDisponibles = document.getElementById("totalDisponibles");

const rechercheCadeau = document.getElementById("rechercheCadeau");

const chargement = document.getElementById("chargement");
const listeVide = document.getElementById("listeVide");
const tableContainer = document.getElementById("tableContainer");
const tableauCadeaux = document.getElementById("tableauCadeaux");
const messageGlobal = document.getElementById("messageGlobal");

// ======================================
// VARIABLES
// ======================================

let cadeaux = [];
let reservations = [];

// ======================================
// VÉRIFICATION ADMINISTRATEUR
// ======================================

async function verifierAdministrateur(user) {

    const { data, error } = await supabase
        .from("administrateur")
        .select("id_admin, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (error) throw error;

    if (!data || !["principal", "gestionnaire"].includes(data.role)) {
        throw new Error("Accès administrateur non autorisé.");
    }
}

// ======================================
// MESSAGES
// ======================================

function afficherErreur(message) {

    messageGlobal.textContent = message;
    messageGlobal.className = "global-message error";
    messageGlobal.hidden = false;
}

// ======================================
// NORMALISATION
// ======================================

function normaliserNom(nom) {

    return nom
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// ======================================
// CADEAUX ILLIMITÉS
// ======================================

function estIllimite(nom) {

    const nomNormalise = normaliserNom(nom);

    return (
        nomNormalise.includes("enveloppe") ||
        nomNormalise.includes("couche") ||
        nomNormalise.includes("lingette")
    );
}

// ======================================
// NOMBRE DE RÉSERVATIONS
// ======================================

function obtenirNombreReservations(idCadeau) {

    return reservations.filter(
        reservation =>
            String(reservation.id_cadeau) === String(idCadeau)
    ).length;
}

// ======================================
// DISPONIBILITÉ
// ======================================

function obtenirDisponibilite(cadeau) {

    const nombre = obtenirNombreReservations(cadeau.id_cadeau);

    if (estIllimite(cadeau.nom)) {

        return {
            nombre,
            illimite: true,
            complet: false,
            reste: null
        };
    }

    const limite = 5;
    const reste = Math.max(0, limite - nombre);

    return {
        nombre,
        illimite: false,
        complet: reste === 0,
        reste
    };
}

// ======================================
// CHARGEMENT DES DONNÉES
// ======================================

async function chargerDonnees() {

    chargement.hidden = false;
    tableContainer.hidden = true;
    listeVide.hidden = true;
    messageGlobal.hidden = true;

    try {

        const [resultatCadeaux, resultatReservations] =
            await Promise.all([

                supabase
                    .from("cadeau")
                    .select("id_cadeau, nom, date_ajout")
                    .order("date_ajout", { ascending: false }),

                supabase
                    .from("reservation")
                    .select("id_cadeau")

            ]);

        if (resultatCadeaux.error) {
            throw resultatCadeaux.error;
        }

        if (resultatReservations.error) {
            throw resultatReservations.error;
        }

        cadeaux = resultatCadeaux.data || [];
        reservations = resultatReservations.data || [];

        actualiserStatistiques();
        afficherCadeaux();

    } catch (error) {

        console.error("Erreur de chargement :", error);

        afficherErreur(
            "Impossible de charger les cadeaux. Vérifiez les autorisations Supabase."
        );

    } finally {

        chargement.hidden = true;
    }
}

// ======================================
// STATISTIQUES
// ======================================

function actualiserStatistiques() {

    const nombreReservations = reservations.length;

    const nombreDisponibles = cadeaux.filter(cadeau => {

        const disponibilite = obtenirDisponibilite(cadeau);

        return disponibilite.illimite || !disponibilite.complet;

    }).length;

    totalCadeaux.textContent = cadeaux.length;
    totalReserves.textContent = nombreReservations;
    totalDisponibles.textContent = nombreDisponibles;
}

// ======================================
// FORMATAGE DATE
// ======================================

function formaterDate(date) {

    if (!date) return "—";

    const valeur = new Date(`${date}T00:00:00`);

    if (Number.isNaN(valeur.getTime())) return "—";

    return valeur.toLocaleDateString("fr-FR");
}

// ======================================
// AFFICHAGE DU CATALOGUE
// ======================================

function afficherCadeaux() {

    const recherche = normaliserNom(rechercheCadeau.value);

    const cadeauxFiltres = cadeaux.filter(cadeau =>
        normaliserNom(cadeau.nom).includes(recherche)
    );

    tableauCadeaux.replaceChildren();

    if (cadeauxFiltres.length === 0) {

        tableContainer.hidden = true;
        listeVide.hidden = false;

        return;
    }

    listeVide.hidden = true;
    tableContainer.hidden = false;

    cadeauxFiltres.forEach(cadeau => {

        const disponibilite = obtenirDisponibilite(cadeau);

        const ligne = document.createElement("tr");

        const celluleNom = document.createElement("td");
        celluleNom.className = "gift-name";
        celluleNom.textContent = cadeau.nom;

        const celluleReservations = document.createElement("td");
        celluleReservations.textContent = disponibilite.nombre;

        const celluleDisponibilite = document.createElement("td");

        const badge = document.createElement("span");
        badge.className = "availability";

        if (disponibilite.illimite) {

            badge.classList.add("unlimited");
            badge.textContent = "Illimité";

        } else if (disponibilite.complet) {

            badge.classList.add("full");
            badge.textContent = "Complet";

        } else {

            badge.classList.add("available");
            badge.textContent =
                `${disponibilite.reste} place(s) restante(s)`;
        }

        celluleDisponibilite.appendChild(badge);

        const celluleDate = document.createElement("td");
        celluleDate.textContent = formaterDate(cadeau.date_ajout);

        ligne.append(
            celluleNom,
            celluleReservations,
            celluleDisponibilite,
            celluleDate
        );

        tableauCadeaux.appendChild(ligne);
    });
}

// ======================================
// RECHERCHE
// ======================================

rechercheCadeau.addEventListener("input", afficherCadeaux);

// ======================================
// INITIALISATION
// ======================================

async function initialiser() {

    try {

        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {

            window.location.replace("connexion.html");
            return;
        }

        await verifierAdministrateur(data.session.user);

        await chargerDonnees();

    } catch (error) {

        console.error("Erreur :", error);

        await supabase.auth.signOut();

        window.location.replace("connexion.html");
    }
}

initialiser();
