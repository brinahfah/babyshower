
import { supabase } from "./config/supabase.js";

// ======================================
// ELEMENTS HTML
// ======================================

const formActivation = document.getElementById("formActivation");

const passwordInput = document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const btnActivation = document.getElementById("btnActivation");

const message = document.getElementById("message");

// ======================================
// AFFICHAGE DES MESSAGES
// ======================================

function afficherMessage(texte, type = "") {
    message.textContent = texte;
    message.className = `activation-message ${type}`;
}

// ======================================
// VERIFICATION DE LA SESSION
// ======================================

async function verifierInvitation() {

    try {

        // 1. Vérifier si un token_hash est présent
        const url = new URL(window.location.href);

        const tokenHash = url.searchParams.get("token_hash");

        const type = url.searchParams.get("type");

        // 2. Vérifier directement le token si nécessaire
        if (tokenHash) {

            if (type !== "invite") {
                throw new Error(
                    "Ce lien ne correspond pas à une invitation administrateur."
                );
            }

            const { error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: "invite"
            });

            if (error) {
                throw new Error(
                    "Ce lien d'invitation est invalide ou expiré."
                );
            }

            // Nettoyer les paramètres sensibles de l'URL
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );
        }

        // 3. Récupérer la session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        if (!data.session) {
            throw new Error(
                "Votre invitation n'a pas pu être vérifiée. Veuillez utiliser le lien reçu par e-mail."
            );
        }

        const user = data.session.user;

        // 4. Vérifier le compte administrateur
        const { data: administrateur, error: adminError } =
            await supabase
                .from("administrateur")
                .select("id_admin, email, role")
                .eq("auth_user_id", user.id)
                .maybeSingle();

        if (adminError) {
            throw adminError;
        }

        if (!administrateur) {
            throw new Error(
                "Aucun compte administrateur n'est associé à cette invitation."
            );
        }

        if (administrateur.role !== "gestionnaire") {
            throw new Error(
                "Cette page est réservée à l'activation du compte gestionnaire."
            );
        }

        // 5. Afficher le formulaire
        formActivation.hidden = false;

        afficherMessage(
            "Votre invitation est validée. Vous pouvez choisir votre mot de passe."
        );

    } catch (error) {

        afficherMessage(
            error.message || "Une erreur est survenue.",
            "error"
        );

        formActivation.hidden = true;

        console.error("Erreur activation :", error);
    }
}

// ======================================
// ACTIVATION DU COMPTE
// ======================================

formActivation.addEventListener("submit", async function(event) {

    event.preventDefault();

    const password = passwordInput.value;

    const confirmPassword = confirmPasswordInput.value;

    // Vérifier la longueur
    if (password.length < 8) {

        afficherMessage(
            "Le mot de passe doit contenir au moins 8 caractères.",
            "error"
        );

        return;
    }

    // Vérifier la confirmation
    if (password !== confirmPassword) {

        afficherMessage(
            "Les deux mots de passe ne correspondent pas.",
            "error"
        );

        confirmPasswordInput.focus();

        return;
    }

    btnActivation.disabled = true;

    btnActivation.textContent = "Activation en cours...";

    afficherMessage("");

    try {

        // 1. Enregistrer le mot de passe
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            throw error;
        }

        // 2. Déconnecter le gestionnaire
        const { error: logoutError } = await supabase.auth.signOut();

        if (logoutError) {
            throw logoutError;
        }

        // 3. Confirmation
        afficherMessage(
            "Votre compte est activé ! Vous allez être redirigée vers la connexion.",
            "success"
        );

        formActivation.hidden = true;

        // 4. Retour vers la connexion
        setTimeout(() => {

            window.location.replace("connexion.html");

        }, 2500);

    } catch (error) {

        afficherMessage(
            error.message || "Impossible d'activer votre compte.",
            "error"
        );

        console.error("Erreur mot de passe :", error);

        btnActivation.disabled = false;

        btnActivation.textContent = "Activer mon compte";

    }

});

// ======================================
// DEMARRAGE
// ======================================

verifierInvitation();
