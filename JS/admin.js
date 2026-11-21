import { supabase } from "./config/supabase.js";

console.log("ELY&BRI : JavaScript chargé !");

// ======================================
// ÉLÉMENTS DE CONNEXION
// ======================================

const formConnexion = document.getElementById("formConnexion");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnConnexion = document.getElementById("btnConnexion");
const message = document.getElementById("message");

// ======================================
// ÉLÉMENTS DU GUIDE
// ======================================

const guideOverlay = document.getElementById("guideOverlay");
const btnFermerGuide = document.getElementById("btnFermerGuide");
const btnGuidePrecedent = document.getElementById("btnGuidePrecedent");
const btnGuideSuivant = document.getElementById("btnGuideSuivant");
const btnPasserGuide = document.getElementById("btnPasserGuide");

const guideTitle = document.getElementById("guideTitle");
const guideProgressBar = document.getElementById("guideProgressBar");
const guideStep = document.getElementById("guideStep");
const guideIcon = document.getElementById("guideIcon");
const guideDescription = document.getElementById("guideDescription");
const guideTip = document.getElementById("guideTip");

// ======================================
// MODE DE TEST
// ======================================

// TEST : true = le guide apparaît à chaque connexion.
// VERSION FINALE : passer cette valeur à false.
const MODE_TEST = true;

let etapeActuelle = 0;
let utilisateurEnAttente = null;
let redirectionEnCours = false;

// ======================================
// CONTENU DU GUIDE
// ======================================

const etapesGuide = [
    {
        title: "Bienvenue dans votre espace !",
        description:
            "Bienvenue dans votre espace privé ELY&BRI. Nous allons vous accompagner pour découvrir les différentes fonctionnalités de votre tableau de bord.",
        tip:
            "Prenez quelques instants pour découvrir votre espace et ses possibilités.",
        icon: "♡"
    },
    {
        title: "Votre tableau de bord",
        description:
            "Depuis votre tableau de bord, vous pouvez consulter rapidement les statistiques de votre événement : invités, réservations, cadeaux et souhaits.",
        tip:
            "Les chiffres vous permettent de suivre l'évolution de vos préparatifs en un coup d'œil.",
        icon: "✧"
    },
    {
        title: "La gestion des invités",
        description:
            "Dans la rubrique Invités, vous pouvez retrouver les personnes invitées à votre événement et gérer les informations les concernant.",
        tip:
            "Pensez à tenir votre liste à jour pour mieux organiser votre événement.",
        icon: "♡"
    },
    {
        title: "Les réservations et les cadeaux",
        description:
            "La rubrique Réservations vous permet de suivre les réservations. Dans Cadeaux, vous pouvez consulter et gérer les cadeaux prévus pour votre événement.",
        tip:
            "Ces deux espaces vous aident à garder une organisation claire.",
        icon: "🎁"
    },
    {
        title: "Les souhaits et les messages",
        description:
            "Dans la rubrique Souhaits, vous pouvez retrouver les petits mots et les souhaits partagés autour de votre événement.",
        tip:
            "Vous êtes maintenant prête à profiter pleinement de votre espace ELY&BRI !",
        icon: "💌"
    }
];

// ======================================
// AFFICHAGE DES MESSAGES
// ======================================

function afficherMessage(texte, type) {
    message.textContent = texte;
    message.className = type;
}

// ======================================
// VÉRIFICATION ADMINISTRATEUR
// ======================================

async function verifierAdministrateur(user) {
    const { data, error } = await supabase
        .from("administrateur")
        .select("id_admin, email, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error(
            "Ce compte ne possède pas de droits administrateur."
        );
    }

    if (!["principal", "gestionnaire"].includes(data.role)) {
        throw new Error("Rôle administrateur non autorisé.");
    }

    return data;
}

// ======================================
// AFFICHAGE D'UNE ÉTAPE DU GUIDE
// ======================================

function afficherEtapeGuide() {
    const etape = etapesGuide[etapeActuelle];

    guideTitle.textContent = etape.title;
    guideDescription.textContent = etape.description;
    guideTip.textContent = etape.tip;
    guideIcon.textContent = etape.icon;

    guideStep.textContent =
        `Étape ${etapeActuelle + 1} sur ${etapesGuide.length}`;

    const progression =
        ((etapeActuelle + 1) / etapesGuide.length) * 100;

    guideProgressBar.style.width = `${progression}%`;

    btnGuidePrecedent.disabled = etapeActuelle === 0;

    btnGuideSuivant.textContent =
        etapeActuelle === etapesGuide.length - 1
            ? "Accéder à mon espace"
            : "Suivant";
}

// ======================================
// OUVERTURE DU GUIDE
// ======================================

function ouvrirGuide() {
    etapeActuelle = 0;

    afficherEtapeGuide();

    guideOverlay.hidden = false;
    document.body.classList.add("guide-open");

    btnFermerGuide.focus();
}

// ======================================
// FERMETURE DU GUIDE ET REDIRECTION
// ======================================

async function terminerGuide() {
    if (redirectionEnCours) return;

    redirectionEnCours = true;

    // En version finale, on mémorise que le guide a été vu.
    if (!MODE_TEST && utilisateurEnAttente) {
        localStorage.setItem(
            `guideBabyShower_${utilisateurEnAttente.id}`,
            "termine"
        );
    }

    guideOverlay.hidden = true;
    document.body.classList.remove("guide-open");

    window.location.replace("dashboard.html");
}

// ======================================
// NAVIGATION ENTRE LES ÉTAPES
// ======================================

btnGuideSuivant.addEventListener("click", function () {
    if (etapeActuelle < etapesGuide.length - 1) {
        etapeActuelle++;
        afficherEtapeGuide();
    } else {
        terminerGuide();
    }
});

btnGuidePrecedent.addEventListener("click", function () {
    if (etapeActuelle > 0) {
        etapeActuelle--;
        afficherEtapeGuide();
    }
});

btnPasserGuide.addEventListener("click", terminerGuide);
btnFermerGuide.addEventListener("click", terminerGuide);

// ======================================
// DÉCIDER SI LE GUIDE DOIT APPARAÎTRE
// ======================================

function afficherGuideAvantDashboard(user) {
    utilisateurEnAttente = user;

    const cleGuide = `guideBabyShower_${user.id}`;

    // En mode test, on affiche toujours le guide.
    // En version finale, on vérifie s'il a déjà été vu.
    const guideDejaVu =
        !MODE_TEST &&
        localStorage.getItem(cleGuide) === "termine";

    if (guideDejaVu) {
        window.location.replace("dashboard.html");
        return;
    }

    ouvrirGuide();
}

// ======================================
// CONNEXION
// ======================================

formConnexion.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    btnConnexion.disabled = true;
    btnConnexion.textContent = "Connexion...";

    afficherMessage("", "");

    try {
        // 1. Authentification Supabase
        const { data, error } =
            await supabase.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw new Error(
                "Email ou mot de passe incorrect."
            );
        }

        // 2. Vérification des droits administrateur
        await verifierAdministrateur(data.user);

        // 3. Le guide apparaît AVANT le tableau de bord
        afficherMessage(
            "Connexion réussie. Découvrez votre espace !",
            "success"
        );

        afficherGuideAvantDashboard(data.user);

    } catch (error) {
        await supabase.auth.signOut();

        afficherMessage(
            error.message || "Une erreur est survenue.",
            "error"
        );

        btnConnexion.disabled = false;
        btnConnexion.textContent = "Accéder à mon espace";
    }
});

// ======================================
// VÉRIFICATION D'UNE SESSION EXISTANTE
// ======================================

async function verifierSessionExistante() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        return;
    }

    try {
        await verifierAdministrateur(data.session.user);

        // Même parcours si une session est déjà active.
        afficherGuideAvantDashboard(data.session.user);

    } catch (error) {
        await supabase.auth.signOut();
    }
}

// ======================================
// AU CHARGEMENT DE LA PAGE
// ======================================

verifierSessionExistante();
