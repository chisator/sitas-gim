"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { ProgressPageClient } from "@/components/progress-page-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useEffect, useState } from "react"

export default function ProgressPage() {
    const [exercises, setExercises] = useState<string[]>([])
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

            // Strategy: Select distinct exercise_name from workout_log_entries where parent log belongs to user.
            const { data, error } = await supabase
                .from("workout_log_entries")
                .select("exercise_name, workout_logs!inner(user_id)")
                .eq("workout_logs.user_id", user.id)
                .order("exercise_name", { ascending: true })

            if (!error && data) {
                const uniqueNames = Array.from(new Set(data.map((d: any) => d.exercise_name)))
                setExercises(uniqueNames as string[])
            }
            setLoading(false)
        }

        loadData()
    }, [router, supabase])

    if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild className="p-0 hover:bg-transparent -ml-2">
                        <Link href="/deportista" className="flex items-center gap-2">
                            <ChevronLeft className="h-5 w-5" />
                            <span>Volver al inicio</span>
                        </Link>
                    </Button>
                </div>

                <div>
                    <h1 className="text-3xl font-bold">Tu Progreso</h1>
                    <p className="text-muted-foreground">Visualiza cómo has mejorado en tus ejercicios.</p>
                </div>

                <ProgressPageClient exercises={exercises} />
            </div>
        </div>
    )
}
