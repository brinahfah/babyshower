import { supabase } from "./config/supabase.js";

console.log("ELY&BRI : JavaScript chargé !");

        const formConnexion =
            document.getElementById("formConnexion");

        const emailInput =
            document.getElementById("email");

        const passwordInput =
            document.getElementById("password");

        const btnConnexion =
            document.getElementById("btnConnexion");

        const message =
            document.getElementById("message");


        // Afficher un message
        function afficherMessage(texte, type) {

            message.textContent = texte;

            message.className = type;
        }


        // Vérifier si l'utilisateur est administrateur
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
                throw new Error(
                    "Rôle administrateur non autorisé."
                );
            }

            return data;
        }


        // Vérifier une éventuelle session existante
        async function verifierSessionExistante() {

            const { data, error } =
                await supabase.auth.getSession();

            if (error || !data.session) {
                return;
            }

            try {

                await verifierAdministrateur(
                    data.session.user
                );

                window.location.replace("dashboard.html");

            } catch (error) {

                await supabase.auth.signOut();

            }
        }


        // Connexion
        formConnexion.addEventListener(
            "submit",
            async function(event) {

                console.log("ELY&BRI : Bouton de connexion cliqué !");
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
                            email: email,
                            password: password
                        });

                    if (error) {
                        throw new Error(
                            "Email ou mot de passe incorrect."
                        );
                    }

                    // 2. Vérification du compte administrateur
                    const administrateur =
                        await verifierAdministrateur(data.user);

                    // 3. Accès autorisé
                    afficherMessage(
                        "Connexion réussie. Redirection...",
                        "success"
                    );

                    window.location.replace("dashboard.html");

                } catch (error) {

                    // Fermer la session si le compte
                    // n'est pas autorisé
                    await supabase.auth.signOut();

                    afficherMessage(
                        error.message ||
                        "Une erreur est survenue.",
                        "error"
                    );

                } finally {

                    btnConnexion.disabled = false;

                    btnConnexion.textContent = "Se connecter";

                }

            }
        );


        // Vérification au chargement
        verifierSessionExistante();