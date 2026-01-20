import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let supabase: any = null;

if (!supabaseUrl || !supabaseKey) {
	// Avoid throwing during module import so the app can render and show a helpful message.
	// Consumers should handle errors from auth/queries when not configured.
	// Log a clear warning for developers.
	// eslint-disable-next-line no-console
	console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase client disabled.');

	supabase = {
		auth: {
			signInWithPassword: async () => { throw new Error('Supabase not configured'); },
			signUp: async () => { throw new Error('Supabase not configured'); },
			signOut: async () => { return; }
		},
		from: () => ({ select: async () => ({ data: null, error: new Error('Supabase not configured') }) }),
	} as any;
} else {
	supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };
export default supabase;
