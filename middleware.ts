import { updateSession } from "@/lib/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Se excluyen el service worker, workbox y el manifest: cada pedido de esos
  // archivos disparaba un getUser() contra Supabase, y el manifest además
  // redirigía a /auth/login por no estar en las rutas públicas.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
