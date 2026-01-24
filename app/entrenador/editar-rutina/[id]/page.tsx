import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { EditRoutineForm } from "@/components/edit-routine-form"
import { getExerciseCatalog } from "@/app/actions/admin-actions"

type PageProps = {
  params: { id: string }
}

export default async function EditRoutinePage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userRole = user?.user_metadata?.role

  if (!user || (userRole !== "entrenador" && userRole !== "administrador")) {
    redirect("/unauthorized")
  }

  // Obtener la rutina
  let query = supabase
    .from("routines")
    .select("*")
    .eq("id", params.id)

  // Si no es admin, solo puede ver sus propias rutinas
  if (userRole !== "administrador") {
    query = query.eq("trainer_id", user.id)
  }

  const { data: routine, error } = await query.single()

  if (error || !routine) {
    // Redirigir si no se encuentra la rutina o no tiene permisos (para no admin)
    redirect(userRole === "administrador" ? "/admin" : "/entrenador")
  }

  // Obtener usuarios asignados al entrenador (o todos si es admin)
  let trainerUserIds = [] as string[]
  if (userRole === "administrador") {
    const { data: allProfiles } = await supabase.from("profiles").select("id").eq("role", "deportista")
    trainerUserIds = allProfiles?.map(p => p.id) || []
  } else {
    const { data: assignments } = await supabase
      .from("trainer_user_assignments")
      .select("user_id")
      .eq("trainer_id", user.id)
    trainerUserIds = assignments?.map((a) => a.user_id) || []
  }

  // Obtener usuarios asignados a la rutina específica
  const { data: routineAssignments } = await supabase
    .from("routine_user_assignments")
    .select("user_id")
    .eq("routine_id", params.id)

  const assignedUserIds = routineAssignments?.map((a: any) => a.user_id) || []

  // Obtener perfiles de deportistas (filtrados por entrenador o todos para admin)
  const { data: athletes } = trainerUserIds.length
    ? await supabase.from("profiles").select("*").in("id", trainerUserIds).order("full_name")
    : { data: [] }

  // Obtener todos los entrenadores si el usuario actual es administrador
  let allTrainers = [] as any[]
  if (userRole === "administrador") {
    const { data: trainersData } = await supabase.from("profiles").select("id, full_name, email").eq("role", "entrenador").order("full_name")
    allTrainers = trainersData || []
  }

  // Obtener catálogo de ejercicios
  const { exercises: exerciseCatalog } = await getExerciseCatalog()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-balance">Editar Rutina</h1>
          <p className="text-muted-foreground mt-2">Actualiza los detalles de la rutina de entrenamiento</p>
        </div>

        <EditRoutineForm
          routine={routine}
          athletes={athletes || []}
          assignedUserIds={assignedUserIds}
          isAdmin={userRole === "administrador"}
          trainers={allTrainers}
          exerciseCatalog={exerciseCatalog || []}
        />
      </div>
    </div>
  )
}
