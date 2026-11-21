
import { supabase } from "./config/supabase.js";

// ======================================
// ELEMENTS HTML
// ======================================

const chargement = document.getElementById("chargement");
const contenuDashboard = document.getElementById("contenuDashboard");
const messageErreur = document.getElementById("messageErreur");

const btnDeconnexion = document.getElementById("btnDeconnexion");


// ======================================
// AFFICHER UNE ERREUR
// ======================================

function afficherErreur(message) {

    chargement.hidden = true;
    messageErreur.textContent = message;
    messageErreur.hidden = false;

}


// ======================================
// RECUPERER LES STATISTIQUES
// ======================================

async function chargerStatistiques() {

    const requetes = [
        supabase.from("invite").select("*", { count: "exact", head: true }),
        supabase.from("reservation").select("*", { count: "exact", head: true }),
        supabase.from("cadeau").select("*", { count: "exact", head: true }),
        supabase.from("souhait").select("*", { count: "exact", head: true })
    ];

    const resultats = await Promise.all(requetes);

    const elements = [
        "totalInvites",
        "totalReservations",
        "totalCadeaux",
        "totalSouhaits"
    ];

    const erreurs = [];

    resultats.forEach((resultat, index) => {

        const element = document.getElementById(elements[index]);

        if (resultat.error) {

            console.error(
                "Erreur statistique :",
                elements[index],
                resultat.error
            );

            element.textContent = "Indisponible";
            erreurs.push(elements[index]);

        } else {

            element.textContent = resultat.count ?? 0;

        }

    });

    if (erreurs.length > 0) {
        console.warn("Certaines statistiques n'ont pas pu être chargées.");
    }

}


// ======================================
// PROTEGER LE TABLEAU DE BORD
// ======================================

async function protegerDashboard() {

    try {

        // 1. Vérifier la session Supabase

        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {

            window.location.replace("connexion.html");
            return;

        }

        // 2. Vérifier le profil administrateur

        const { data: administrateur, error: erreurAdmin } =
            await supabase
                .from("administrateur")
                .select("id_admin, role")
                .eq("auth_user_id", data.user.id)
                .maybeSingle();

        if (erreurAdmin) {

            console.error("Erreur de vérification :", erreurAdmin);

            afficherErreur(
                "Impossible de vérifier vos autorisations. Veuillez réessayer."
            );

            return;

        }

        // 3. Vérifier le rôle autorisé

        if (
            !administrateur ||
            !["principal", "gestionnaire"].includes(administrateur.role)
        ) {

            await supabase.auth.signOut();

            window.location.replace("connexion.html");
            return;

        }

        // 4. Charger les statistiques

        await chargerStatistiques();

        // 5. Afficher le tableau de bord

        chargement.hidden = true;
        contenuDashboard.hidden = false;

        console.log("BabyShower : tableau de bord chargé.");

    } catch (error) {

        console.error("Erreur :", error);

        afficherErreur(
            "Une erreur est survenue lors du chargement du tableau de bord."
        );

    }

}


// ======================================
// DECONNEXION
// ======================================

btnDeconnexion.addEventListener("click", async function() {

    btnDeconnexion.disabled = true;
    btnDeconnexion.textContent = "Déconnexion...";

    try {

        const { error } = await supabase.auth.signOut();

        if (error) {
            throw error;
        }

        window.location.replace("connexion.html");

    } catch (error) {

        console.error("Erreur de déconnexion :", error);

        btnDeconnexion.disabled = false;
        btnDeconnexion.textContent = "Se déconnecter";

        alert("La déconnexion a échoué. Veuillez réessayer.");

    }

});


// ======================================
// LANCEMENT
// ======================================

protegerDashboard();
