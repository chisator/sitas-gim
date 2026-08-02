/**
 * Traduce errores de Postgres/Supabase a algo que una persona pueda entender.
 *
 * Hasta ahora las server actions devolvían `error.message` crudo y la UI lo
 * mostraba tal cual, así que al socio le aparecían cosas como
 * "new row violates row-level security policy for table \"workout_logs\"".
 *
 * El mensaje técnico no se pierde: conviene loguearlo en el servidor con
 * console.error y devolver al cliente solamente el texto de esta función.
 */
export function mensajeUsuario(error: unknown, porDefecto = "No pudimos completar la acción. Probá de nuevo."): string {
  if (!error) return porDefecto

  const e = error as { code?: string; message?: string; details?: string }
  const code = e.code
  const message = (e.message || "").toLowerCase()

  if (code === "23505" || message.includes("duplicate key")) {
    return "Ya existe un registro con esos datos."
  }
  if (code === "23503" || message.includes("foreign key")) {
    return "No se puede eliminar: hay información asociada que depende de esto."
  }
  if (code === "23502") {
    return "Faltan datos obligatorios."
  }
  if (code === "42501" || message.includes("row-level security") || message.includes("permission denied")) {
    return "No tenés permiso para hacer esto."
  }
  if (code === "22P02") {
    return "Alguno de los datos tiene un formato inválido."
  }
  if (message.includes("already been registered") || message.includes("already registered")) {
    return "Ese email ya está registrado."
  }
  if (message.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos."
  }
  if (message.includes("password should be at least")) {
    return "La contraseña es demasiado corta."
  }
  if (message.includes("user not allowed")) {
    return "No tenés permiso para modificar este usuario."
  }
  if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("fetch failed")) {
    return "No pudimos conectarnos. Revisá tu conexión a internet."
  }
  if (message.includes("jwt") || message.includes("token is expired")) {
    return "Tu sesión expiró. Volvé a iniciar sesión."
  }

  return porDefecto
}
