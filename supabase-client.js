// supabaseService.js
import 'react-native-url-polyfill/auto'; // 👈 adds URL & URLSearchParams
import 'react-native-get-random-values'; // 👈 needed for crypto
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';

// Load from .env
const SUPABASE_URL = Config.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

// Sanity checks
if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
  console.error('❌ SUPABASE_URL is missing. Check your .env or react-native-config setup.');
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  console.error('❌ SUPABASE_ANON_KEY is missing. Check your .env or react-native-config setup.');
}

// ✅ Create client configured for React Native
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // persistent storage for session
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no browser redirects
  },
});
