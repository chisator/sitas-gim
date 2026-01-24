
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
        envVars[key] = value;
    }
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const RELEASE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(SUPABASE_URL, RELEASE_KEY);

async function verifyAdmin() {
    const email = 'admin@sitasgim.com';
    console.log(`Verificando rol para: ${email}`);

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('role, email, full_name')
        .eq('email', email);

    if (error) {
        console.error('Error consultando perfil:', error);
        return;
    }

    if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        console.log('--- RESULTADO ---');
        console.log(`Usuario: ${profile.email}`);
        console.log(`Rol: ${profile.role}`);

        if (profile.role === 'administrador') {
            console.log('VERIFICACIÓN: EXITOSA ✅');
        } else {
            console.log('VERIFICACIÓN: FALLIDA ❌ (El rol no es administrador)');
        }
    } else {
        console.log('No se encontró perfil para ese email.');
    }
}

verifyAdmin();
