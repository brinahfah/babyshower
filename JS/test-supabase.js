import { supabase } from "./config/supabase.js";

// Fonction de test
async function testerConnexion() {

    console.log("Test de connexion à Supabase...");

    const { data, error } = await supabase
        .from("cadeau")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Erreur de connexion :", error);
        return;
    }

    console.log("Connexion réussie à Supabase !");
    console.log("Données récupérées :", data);
}

testerConnexion();

