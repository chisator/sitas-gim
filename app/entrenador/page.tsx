import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/logout-button"
import { TrainerRoutineCard } from "@/components/trainer-routine-card"
import Link from "next/link"
import { TrainerUserFilter } from "@/components/trainer-user-filter"

export default async function EntrenadorPage({ searchParams }: { searchParams?: { userId?: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "entrenador") {
    redirect("/unauthorized")
  }

  // Obtener asignaciones entrenador-usuario
  const { data: assignments } = await supabase
    .from("trainer_user_assignments")
    .select("user_id")
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false })

  const userIds = assignments?.map((a) => a.user_id) || []

  // Obtener perfiles de esos usuarios para el filtro
  const { data: athletes } = userIds.length
    ? await supabase.from("profiles").select("*").in("id", userIds).order("full_name")
    : { data: [] }

  // Si hay filtro por usuario en querystring, obtener sólo las rutinas asignadas a ese usuario
  let routines = [] as any[]
  if (searchParams?.userId) {
    const { data: routineAssignments } = await supabase
      .from("routine_user_assignments")
      .select("routine_id")
      .eq("user_id", searchParams.userId)
      .order("created_at", { ascending: false })

    const routineIds = (routineAssignments || []).map((r: any) => r.routine_id)
    if (routineIds.length > 0) {
      const { data } = await supabase
        .from("routines")
        .select("*")
        .in("id", routineIds)
        .eq("trainer_id", user.id)
        .order("end_date", { ascending: false })
      routines = data || []
    } else {
      routines = []
    }
  } else {
    const { data } = await supabase
      .from("routines")
      .select("*")
      .eq("trainer_id", user.id)
      .order("end_date", { ascending: false })
    routines = data || []
  }

  // Calcular estadísticas
  const totalRoutines = routines?.length || 0
  const totalAssignedUsers = userIds.length || 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingRoutines =
    routines?.filter((r) => {
      const routineEnd = r.end_date ? new Date(r.end_date) : r.start_date ? new Date(r.start_date) : null
      if (!routineEnd) return false
      routineEnd.setHours(0, 0, 0, 0)
      return routineEnd >= today
    }) || []

  const pastRoutines =
    routines?.filter((r) => {
      const routineEnd = r.end_date ? new Date(r.end_date) : r.start_date ? new Date(r.start_date) : null
      if (!routineEnd) return false
      routineEnd.setHours(0, 0, 0, 0)
      return routineEnd < today
    }) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold">SITAS FITNESS</h1>
              <p className="text-xs text-muted-foreground">Panel de Entrenador</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900">
                Entrenador
              </Badge>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-balance">Bienvenido, {profile?.full_name}</h2>
            <p className="text-muted-foreground mt-1">Gestiona tus rutinas de entrenamiento</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="text-xs sm:text-base">
              <Link href="/entrenador/crear-rutina">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Rutina
              </Link>
            </Button>
          </div>
        </div>
        <div className="mb-6">
          <TrainerUserFilter athletes={athletes || []} />
        </div>
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rutinas</CardTitle>
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{totalRoutines}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximas</CardTitle>
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{upcomingRoutines.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Asignados</CardTitle>
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a9 9 0 0118 0v-2a9 9 0 00-18 0v2z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{totalAssignedUsers}</div>
              <p className="text-xs text-muted-foreground">Usuarios asignados a ti</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">Próximas Rutinas</h3>
            {upcomingRoutines.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingRoutines.map((routine: any) => (
                  <TrainerRoutineCard key={routine.id} routine={routine} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">No tienes rutinas próximas programadas</p>
                  <Button asChild>
                    <Link href="/entrenador/crear-rutina">Crear Primera Rutina</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-4">Rutinas Anteriores</h3>
            {pastRoutines.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pastRoutines.slice(0, 4).map((routine: any) => (
                  <TrainerRoutineCard key={routine.id} routine={routine} isPast />
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
