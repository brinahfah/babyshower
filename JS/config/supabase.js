
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Informations de ton projet Supabase
const SUPABASE_URL = 'https://yvdcxspqmeffxrpcmqwc.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_sCw2LGqfjyxkf3-U2K7N_Q_X5a6X6aO';

// Création du client Supabase
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
