
import { supabase } from "./config/supabase.js";

// ======================================
// ELEMENTS HTML
// ======================================

const chargement = document.getElementById("chargement");
const messageErreur = document.getElementById("messageErreur");

const conteneurTable = document.getElementById("conteneurTable");
const listeInvites = document.getElementById("listeInvites");

const totalInvites = document.getElementById("totalInvites");
const rechercheInvite = document.getElementById("rechercheInvite");

const aucunInvite = document.getElementById("aucunInvite");
const nombreResultats = document.getElementById("nombreResultats");

const btnActualiser = document.getElementById("btnActualiser");


// ======================================
// STOCKAGE DES INVITES
// ======================================

let invites = [];


// ======================================
// AFFICHER UNE ERREUR
// ======================================

function afficherErreur(message) {

    chargement.hidden = true;
    conteneurTable.hidden = true;

    messageErreur.textContent = message;
    messageErreur.hidden = false;

}


// ======================================
// VERIFICATION DES AUTORISATIONS
// ======================================

async function verifierAdministrateur() {

    // Vérifier la session

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {

        window.location.replace("connexion.html");
        return false;

    }

    // Vérifier le profil administrateur

    const { data: administrateur, error: erreurAdmin } =
        await supabase
            .from("administrateur")
            .select("id_admin, role")
            .eq("auth_user_id", data.user.id)
            .maybeSingle();

    if (erreurAdmin) {

        console.error("Erreur administrateur :", erreurAdmin);

        afficherErreur(
            "Impossible de vérifier vos autorisations."
        );

        return false;

    }

    // Vérifier le rôle

    if (
        !administrateur ||
        !["principal", "gestionnaire"].includes(administrateur.role)
    ) {

        await supabase.auth.signOut();

        window.location.replace("connexion.html");
        return false;

    }

    return true;

}


// ======================================
// RECUPERER LES INVITES DEPUIS SUPABASE
// ======================================

async function chargerInvites() {

    chargement.hidden = false;
    messageErreur.hidden = true;
    conteneurTable.hidden = true;

    const { data, error } = await supabase
        .from("invite")
        .select("id_invite, nom, prenom, telephone")
        .order("nom", { ascending: true });

    if (error) {

        console.error("Erreur de récupération :", error);

        throw error;

    }

    invites = data ?? [];

    // Afficher le nombre total d'invités

    totalInvites.textContent = invites.length;

    // Afficher les résultats

    afficherInvites(invites);

    chargement.hidden = true;
    conteneurTable.hidden = false;

}


// ======================================
// NORMALISER UN TEXTE
// ======================================

function normaliser(texte) {

    return String(texte ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

}


// ======================================
// AFFICHER LES INVITES
// ======================================

function afficherInvites(liste) {

    // Vider le tableau

    listeInvites.replaceChildren();

    // Aucun résultat

    if (liste.length === 0) {

        aucunInvite.hidden = false;

    } else {

        aucunInvite.hidden = true;

    }

    // Création des lignes

    liste.forEach(invite => {

        const ligne = document.createElement("tr");

        const celluleNom = document.createElement("td");
        const cellulePrenom = document.createElement("td");
        const celluleTelephone = document.createElement("td");

        celluleNom.textContent = invite.nom ?? "Non renseigné";

        cellulePrenom.textContent = invite.prenom ?? "Non renseigné";

        celluleTelephone.textContent =
            invite.telephone ?? "Non renseigné";

        ligne.append(
            celluleNom,
            cellulePrenom,
            celluleTelephone
        );

        listeInvites.appendChild(ligne);

    });

    // Nombre de résultats affichés

    nombreResultats.textContent =
        `${liste.length} invité(s) affiché(s).`;

}


// ======================================
// RECHERCHER UN INVITE
// ======================================

function rechercherInvite() {

    const recherche = normaliser(rechercheInvite.value);

    const resultats = invites.filter(invite => {

        const nom = normaliser(invite.nom);
        const prenom = normaliser(invite.prenom);
        const telephone = normaliser(invite.telephone);

        return (
            nom.includes(recherche) ||
            prenom.includes(recherche) ||
            telephone.includes(recherche)
        );

    });

    afficherInvites(resultats);

}


// ======================================
// ACTUALISER LA LISTE
// ======================================


async function actualiserListe() {

    btnActualiser.disabled = true;
    btnActualiser.textContent = "Actualisation...";

    try {

        // Recharger les invités depuis Supabase
        await chargerInvites();

        // Vider le champ de recherche
        rechercheInvite.value = "";

        // Réafficher tous les invités
        afficherInvites(invites);

    } catch (error) {

        console.error("Erreur actualisation :", error);

        afficherErreur(
            "Impossible de récupérer les invités. Veuillez réessayer."
        );

    } finally {

        btnActualiser.disabled = false;
        btnActualiser.textContent = "↻ Actualiser";

    }

}



// ======================================
// EVENEMENTS
// ======================================

// Recherche en temps réel

rechercheInvite.addEventListener("input", rechercherInvite);

// Actualisation

btnActualiser.addEventListener("click", actualiserListe);


// ======================================
// LANCEMENT DE LA PAGE
// ======================================

async function initialiserPage() {

    try {

        const autorise = await verifierAdministrateur();

        if (!autorise) {
            return;
        }

        await chargerInvites();

        console.log("BabyShower : gestion des invités chargée.");

    } catch (error) {

        console.error("Erreur :", error);

        afficherErreur(
            "Une erreur est survenue lors du chargement des invités."
        );

    }

}

initialiserPage();
