"use client"

import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { EditRoutineForm } from "@/components/edit-routine-form"
import { useEffect, useState } from "react"


type PageProps = {
  params: { id: string }
}

export default function EditRoutinePage({ params }: PageProps) {
  const [routine, setRoutine] = useState<any>(null)
  const [athletes, setAthletes] = useState<any[]>([])
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [exerciseCatalog, setExerciseCatalog] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const userRole = user?.user_metadata?.role

      if (userRole !== "entrenador" && userRole !== "administrador") {
        router.push("/unauthorized")
        return
      }

      const admin = userRole === "administrador"
      setIsAdmin(admin)

      // Obtener la rutina
      let query = supabase
        .from("routines")
        .select("*")
        .eq("id", params.id)

      // Si no es admin, solo puede ver sus propias rutinas
      if (!admin) {
        query = query.eq("trainer_id", user.id)
      }

      const { data: routineData, error } = await query.single()

      if (error || !routineData) {
        router.push(admin ? "/admin" : "/entrenador")
        return
      }
      setRoutine(routineData)

      // Obtener usuarios asignados al entrenador (o todos si es admin)
      let trainerUserIds = [] as string[]
      if (admin) {
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

      const assigned = routineAssignments?.map((a: any) => a.user_id) || []
      setAssignedUserIds(assigned)

      // Obtener perfiles de deportistas
      if (trainerUserIds.length > 0) {
        const { data: athletesData } = await supabase.from("profiles").select("*").in("id", trainerUserIds).order("full_name")
        setAthletes(athletesData || [])
      }

      // Obtener todos los entrenadores si el usuario actual es administrador
      if (admin) {
        const { data: trainersData } = await supabase.from("profiles").select("id, full_name, email").eq("role", "entrenador").order("full_name")
        setTrainers(trainersData || [])
      }

      // Obtener catálogo de ejercicios
      // Replacing getExerciseCatalog action which likely fetches from 'exercises' table
      const { data: exercisesData } = await supabase.from("exercises").select("*").order("name")
      setExerciseCatalog(exercisesData || [])

      setLoading(false)
    }

    loadData()
  }, [params.id, router, supabase])

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-8 text-center">Cargando...</div>
  if (!routine) return null // Or load error component

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-balance">Editar Rutina</h1>
          <p className="text-muted-foreground mt-2">Actualiza los detalles de la rutina de entrenamiento</p>
        </div>

        <EditRoutineForm
          routine={routine}
          athletes={athletes}
          assignedUserIds={assignedUserIds}
          isAdmin={isAdmin}
          trainers={trainers}
          exerciseCatalog={exerciseCatalog}
        />
      </div>
    </div>
  )
}
