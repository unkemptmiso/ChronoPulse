import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yemfbvzmdsgfvlqizfho.supabase.co';
const supabaseAnonKey = 'sb_publishable_EWCFPqkFZMq6liSOhenoIA_pXjxPMkY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
