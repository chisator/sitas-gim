import { createClient } from "@supabase/supabase-js"

/**
 * Cliente con service role: ignora RLS por completo.
 *
 * Usar SOLO en server actions y server components, y SIEMPRE después de haber
 * verificado quién es el usuario y qué tiene permitido hacer. Nunca importar
 * este módulo desde un componente con "use client".
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
