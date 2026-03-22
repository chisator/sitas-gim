"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      const role = profile?.role

      if (role === "deportista") {
        router.replace("/deportista")
      } else if (role === "entrenador") {
        router.replace("/entrenador")
      } else if (role === "administrador") {
        router.replace("/admin")
      } else {
        router.replace("/auth/login")
      }
    }

    checkAuth()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
