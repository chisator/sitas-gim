"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronRight, ClipboardList } from "lucide-react"
import { Logo } from "@/components/logo"
import { MobileMenu } from "@/components/mobile-menu"
import { LogoutButton } from "@/components/logout-button"
import { Badge } from "@/components/ui/badge"

export default function RegistrosDashboard() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [routines, setRoutines] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.replace("/auth/login")
                return
            }

            const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

            if (profile?.role !== "deportista") {
                router.replace("/unauthorized")
                return
            }

            setUser(user)
            setProfile(profile)

            // Get assigned routines
            const { data: routineAssignments } = await supabase
                .from("routine_user_assignments")
                .select("routine_id")
                .eq("user_id", user.id)

            const routineIds = routineAssignments?.map((r: any) => r.routine_id) || []

            if (routineIds.length > 0) {
                const { data } = await supabase
                    .from("routines")
                    .select("*")
                    .in("id", routineIds)
                    .order("end_date", { ascending: false })
                setRoutines(data || [])
            } else {
                setRoutines([])
            }

            setLoading(false)
        }

        fetchData()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex min-h-[5rem] items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3">
                        <Link href="/deportista">
                            <Logo size={60} />
                        </Link>
                        <span className="font-semibold text-lg hidden sm:inline-block">Mis Registros</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="hidden md:flex gap-4 mr-4">
                            <Button asChild variant="ghost">
                                <Link href="/deportista">Inicio</Link>
                            </Button>
                            <Button asChild variant="secondary">
                                <Link href="/deportista/registros">Registros</Link>
                            </Button>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium">{profile?.full_name}</p>
                            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                                Deportista
                            </Badge>
                        </div>
                        <MobileMenu />
                        <div className="hidden md:block">
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Registro de Entrenamiento</h1>
                    <p className="text-muted-foreground">Selecciona una rutina para ver tu historial o registrar una nueva sesión.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {routines.map((routine) => (
                        <Link key={routine.id} href={`/deportista/registros/${routine.id}`}>
                            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-indigo-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-start">
                                        <span>{routine.title}</span>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">{routine.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                                        <ClipboardList className="h-4 w-4 mr-2" />
                                        <span>Ver historial y registrar</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {routines.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No tienes rutinas asignadas para registrar.
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
