import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogoutButton } from "@/components/logout-button"
import { RoutineCard } from "@/components/routine-card"
import { StatsCard } from "@/components/stats-card"
import Image from "next/image"
import { ActivitiesCarousel } from "@/components/activities-carousel"

export default async function DeportistaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "deportista") {
    redirect("/unauthorized")
  }

  // Obtener rutinas asignadas al usuario via routine_user_assignments
  const { data: routineAssignments } = await supabase
    .from("routine_user_assignments")
    .select("routine_id")
    .eq("user_id", user.id)

  const routineIds = routineAssignments?.map((r: any) => r.routine_id) || []

  // Obtener rutinas sin join complejo
  const { data: routines } = routineIds.length
    ? await supabase
      .from("routines")
      .select("*")
      .in("id", routineIds)
      .order("end_date", { ascending: true })
    : { data: [] }

  // Obtener entrenadores manualmente
  const trainerIds = Array.from(new Set(routines?.map((r) => r.trainer_id).filter(Boolean))) as string[]

  const { data: trainers } = trainerIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", trainerIds)
    : { data: [] }

  // Mapear entrenadores a rutinas
  const routinesWithTrainers = routines?.map((routine) => {
    const trainer = trainers?.find((t) => t.id === routine.trainer_id)
    return {
      ...routine,
      trainer: trainer ? { full_name: trainer.full_name } : null,
    }
  })

  // Calcular estadísticas
  const totalRoutines = routinesWithTrainers?.length || 0

  // Filtrar rutinas por fecha
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingRoutines = routinesWithTrainers?.filter((r) => {
    const routineEnd = r.end_date ? new Date(r.end_date) : r.start_date ? new Date(r.start_date) : null
    if (!routineEnd) return false
    routineEnd.setHours(0, 0, 0, 0)
    return routineEnd >= today
  })

  const pastRoutines = routinesWithTrainers?.filter((r) => {
    const routineEnd = r.end_date ? new Date(r.end_date) : r.start_date ? new Date(r.start_date) : null
    if (!routineEnd) return false
    routineEnd.setHours(0, 0, 0, 0)
    return routineEnd < today
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold">SITAS FITNESS</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                Deportista
              </Badge>
            </div>
            <div className="sm:hidden">
              <LogoutButton iconOnly />
            </div>
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-balance">Bienvenido, {profile?.full_name}</h2>
          <p className="text-muted-foreground mt-1">Aquí puedes ver tus rutinas y seguir tu progreso</p>
        </div>

        <div className="mb-8">
          <ActivitiesCarousel />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <StatsCard title="Rutinas Totales" value={totalRoutines} icon="calendar" />
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Próximas Rutinas</h3>
            {upcomingRoutines && upcomingRoutines.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingRoutines.map((routine: any) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    athleteId={user.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No tienes rutinas próximas programadas</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-4">Rutinas Anteriores</h3>
            {pastRoutines && pastRoutines.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pastRoutines.slice(0, 4).map((routine: any) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    athleteId={user.id}
                    isPast
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No tienes rutinas anteriores</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
