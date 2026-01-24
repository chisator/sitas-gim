
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno manualmente porque dotenv podría no estar configurado para scripts fuera de next
// Intentamos leer el .env del root
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const RELEASE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !RELEASE_KEY) {
  console.error('Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, RELEASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@sitasgim.com';
  const password = 'Admin123!';
  const fullName = 'Administrador Sitas';

  console.log(`Intentando crear usuario admin: ${email}`);

  // 1. Crear usuario en Auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  });

  if (userError) {
    console.error('Error creando usuario Auth:', userError.message);
    if (userError.message.includes('already registered')) {
        console.log('El usuario ya existe, intentando actualizar rol...');
        // Buscar el ID del usuario si ya existe
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if(listError) {
            console.error("Error listando usuarios:", listError);
            return;
        }
        const existingUser = users.users.find(u => u.email === email);
        if(existingUser) {
             updateProfile(existingUser.id, email, fullName);
        } else {
             console.error("No se pudo encontrar el usuario existente.");
        }
    }
    return;
  }

  console.log('Usuario Auth creado exitosamente. ID:', userData.user.id);
  await updateProfile(userData.user.id, email, fullName);
}

async function updateProfile(userId, email, fullName) {
    // 2. Insertar o Actualizar en public.profiles
    // Primero verificamos si existe
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 es "no rows returned"
        console.error('Error verificando perfil:', fetchError);
    }

    let error;
    if (profile) {
        console.log('El perfil existe, actualizando a rol administrador...');
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'administrador' })
            .eq('id', userId);
        error = updateError;
    } else {
         console.log('El perfil no existe, creandolo con rol administrador...');
         const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                full_name: fullName,
                role: 'administrador'
            });
         error = insertError;
    }

    if (error) {
        console.error('Error actualizando/creando perfil:', error.message);
    } else {
        console.log('¡ÉXITO! Usuario administrador configurado correctamente.');
        console.log('Email:', email);
        console.log('Password:', 'Admin123!');
    }
}

createAdmin();
