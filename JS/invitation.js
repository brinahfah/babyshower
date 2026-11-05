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