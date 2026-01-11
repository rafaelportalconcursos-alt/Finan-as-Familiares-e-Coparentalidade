
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jzixdsyxkumhdhqgbqff.supabase.co';
const supabaseKey = 'sb_publishable_ZxEOc9y1ZXVqUYCRFzH9OQ_b1cJ61dm';

export const supabase = createClient(supabaseUrl, supabaseKey);
