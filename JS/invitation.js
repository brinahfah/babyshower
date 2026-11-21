
// ======================================
// DETECTION D'UNE INVITATION ADMINISTRATEUR
// ======================================

// Supabase renvoie le gestionnaire sur le Site URL
// après validation de son invitation.
//
// Nous détectons le type "invite" dans l'URL
// avant de laisser fonctionner la carte publique.

const hashParams = new URLSearchParams(
    window.location.hash.substring(1)
);

const searchParams = new URLSearchParams(
    window.location.search
);

const typeInvitation =
    hashParams.get("type") || searchParams.get("type");

if (typeInvitation === "invite") {

    window.location.replace(
        "admin/activation.html" +
        window.location.search +
        window.location.hash
    );

} else {

// Récupération des éléments HTML
        const card = document.getElementById("card");
        const touchMessage = document.getElementById("touchMessage");

        // État de la carte
        let isFlipped = false;

        // Déclenchement de la rotation
        card.addEventListener("click", function () {

            isFlipped = !isFlipped;

            card.classList.toggle("flipped");

            if (isFlipped) {
                touchMessage.textContent =
                    "♡ Votre présence nous ferait plaisir ♡";
            } else {
                touchMessage.textContent =
                    "✨ Toucher la carte pour découvrir la suite ✨";
            }

        });
    }