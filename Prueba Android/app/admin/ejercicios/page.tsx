"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { ExercisesCatalogTable } from "@/components/exercises-catalog-table"
import { LogoutButton } from "@/components/logout-button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function ExercisesPage() {
    const [profile, setProfile] = useState<any>(null)
    const [exercises, setExercises] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
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

            const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

            if (profileData?.role !== "administrador") {
                router.push("/unauthorized")
                return
            }
            setProfile(profileData)

            const { data: exercisesData } = await supabase.from("exercises").select("*").order("name")
            setExercises(exercisesData || [])
            setLoading(false)
        }

        loadData()
    }, [router, supabase])

    if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild className="mr-2">
                            <Link href="/admin">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold">Catálogo de Ejercicios</h1>
                            <p className="text-xs text-muted-foreground">Administración</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium">{profile?.full_name}</p>
                            <Badge variant="secondary">Admin</Badge>
                        </div>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <ExercisesCatalogTable exercises={exercises} />
            </main>
        </div>
    )
}
