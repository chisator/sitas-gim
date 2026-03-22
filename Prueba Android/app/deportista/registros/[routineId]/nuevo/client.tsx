"use client"

import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { WorkoutLogForm } from "@/components/workout-log-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useEffect, useState } from "react"



export default function NewLogPage({ params }: { params: { routineId: string } }) {
    const [routine, setRoutine] = useState<any>(null)
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

            // Obtener rutina para tener la lista de ejercicios base
            const { data: routineData } = await supabase
                .from("routines")
                .select("*")
                .eq("id", params.routineId)
                .single()

            if (routineData) {
                setRoutine(routineData)
            }
            setLoading(false)
        }

        loadData()
    }, [params.routineId, router, supabase])

    if (loading) return <div className="p-8 text-center bg-transparent text-gray-900 border-none dark:text-gray-100">Cargando...</div>
    if (!routine) return <div className="p-8 text-center bg-transparent text-gray-900 border-none dark:text-gray-100">Rutina no encontrada</div>

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="mb-6">
                <Button variant="ghost" asChild className="p-0 hover:bg-transparent mb-4">
                    <Link href={`/deportista/registros/${params.routineId}`} className="flex items-center gap-2">
                        <ChevronLeft className="h-5 w-5" />
                        <span>Volver al historial</span>
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">Nuevo Registro</h1>
                <p className="text-muted-foreground">{routine.title}</p>
            </div>

            <WorkoutLogForm
                routineId={params.routineId}
                routineTitle={routine.title}
                initialExercises={routine.exercises || []}
            />
        </div>
    )
}
