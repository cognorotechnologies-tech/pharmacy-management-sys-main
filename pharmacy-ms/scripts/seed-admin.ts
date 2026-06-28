import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !roleKey) {
    console.error("Missing environment variables. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, roleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function seedUser() {
    console.log('Seeding super admin user...');
    const { data: user, error: signUpError } = await supabase.auth.admin.createUser({
        email: 'superadmin@pharmacy.com',
        password: 'password123',
        email_confirm: true,
    });

    if (signUpError) {
        if (signUpError.message.includes('already registered')) {
            console.log("User already exists!");
        } else {
            console.error('Error creating user:', signUpError);
        }
    } else {
        console.log('User created:', user.user.id);

        // now we need to make sure the user is in public.profiles and is super_admin
        const { error: profileError } = await supabase.from('profiles').update({
            role: 'super_admin',
            full_name: 'Test Super Admin'
        }).eq('id', user.user.id);

        if (profileError) {
            console.error("Error setting role to super admin:", profileError);
        } else {
            console.log("Profile updated to super_admin.");
        }
    }
}

seedUser();
