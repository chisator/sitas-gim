"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { CreateRoutineForm } from "@/components/create-routine-form"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { useEffect, useState } from "react"

export default function AdminCrearRutinaPage() {
  const [profile, setProfile] = useState<any>(null)
  const [athletes, setAthletes] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [exerciseCatalog, setExerciseCatalog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/auth/login")
        return
      }
      setUser(authUser)

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

      if (profileData?.role !== "administrador") {
        router.push("/unauthorized")
        return
      }
      setProfile(profileData)

      // Como admin, necesitamos la lista de todos los deportistas y todos los entrenadores
      const { data: profiles } = await supabase.from("profiles").select("*").order("full_name")

      const allAthletes = profiles?.filter(p => p.role === 'deportista') || []
      const allTrainers = profiles?.filter(p => p.role === 'entrenador') || []

      setAthletes(allAthletes)
      setTrainers(allTrainers)

      // Obtener catálogo de ejercicios
      const { data: exercisesData } = await supabase.from("exercises").select("*").order("name")
      setExerciseCatalog(exercisesData || [])

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex min-h-[5rem] items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <Logo size={80} />
            <div className="hidden sm:block border-l pl-4 border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Panel de<br />Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Mobile: Show only Back button */}
            <Button variant="ghost" asChild className="md:hidden">
              <Link href="/admin" className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver
              </Link>
            </Button>

            {/* Desktop: Show standard header elements */}
            <div className="hidden md:flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/admin">Volver</Link>
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900">
                  Administrador
                </Badge>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-balance">Crear Nueva Rutina (Admin)</h2>
          <p className="text-muted-foreground mt-1">Define los ejercicios y asigna la rutina a un entrenador y usuarios.</p>
        </div>

        <CreateRoutineForm
          athletes={athletes}
          trainers={trainers}
          isAdmin={true}
          creatorId={user.id}
          exerciseCatalog={exerciseCatalog}
        />
      </main>
    </div>
  )
}
