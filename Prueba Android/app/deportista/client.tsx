"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"
import { RoutineCard } from "@/components/routine-card"
import { ActivitiesCarousel } from "@/components/activities-carousel"
import { Logo } from "@/components/logo"
import { MobileMenu } from "@/components/mobile-menu"

export default function DeportistaDashboard() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [upcomingRoutines, setUpcomingRoutines] = useState<any[]>([])
    const [pastRoutines, setPastRoutines] = useState<any[]>([])
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

            // Fetch routines
            const { data: routineAssignments } = await supabase
                .from("routine_user_assignments")
                .select("routine_id")
                .eq("user_id", user.id)

            const routineIds = routineAssignments?.map((r: any) => r.routine_id) || []

            if (routineIds.length > 0) {
                const { data: routines } = await supabase
                    .from("routines")
                    .select("*")
                    .in("id", routineIds)
                    .order("end_date", { ascending: true })

                if (routines && routines.length > 0) {
                    // Fetch trainers
                    const trainerIds = Array.from(new Set(routines.map((r) => r.trainer_id).filter(Boolean))) as string[]

                    let trainers: any[] = []
                    if (trainerIds.length > 0) {
                        const { data } = await supabase.from("profiles").select("id, full_name").in("id", trainerIds)
                        trainers = data || []
                    }

                    // Map trainers to routines
                    const routinesWithTrainers = routines.map((routine) => {
                        const trainer = trainers.find((t) => t.id === routine.trainer_id)
                        return {
                            ...routine,
                            trainer: trainer ? { full_name: trainer.full_name } : null,
                        }
                    })

                    // Filter by date
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    const upcoming = routinesWithTrainers.filter((r) => {
                        const routineEnd = r.end_date ? new Date(r.end_date) : r.start_date ? new Date(r.start_date) : null
                        if (!routineEnd) return false
                        routineEnd.setHours(0, 0, 0, 0)
                        return routineEnd >= today
                    })

                    const past = routinesWithTrainers.filter((r) => {
                        const routineEnd = r.end_date ? new Date(r.end_date) : r.start_date ? new Date(r.start_date) : null
                        if (!routineEnd) return false
                        routineEnd.setHours(0, 0, 0, 0)
                        return routineEnd < today
                    })

                    setUpcomingRoutines(upcoming)
                    setPastRoutines(past)
                }
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
                <div className="container mx-auto flex min-h-[5rem] items-center justify-between px-4 py-2 relative">
                    <div className="flex items-center gap-3">
                        <Logo size={80} />
                    </div>

                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-4">
                        <Button asChild variant="ghost">
                            <Link href="/deportista/registros">Registros</Link>
                        </Button>
                        <Button asChild variant="ghost">
                            <Link href="/deportista/progreso">Progreso</Link>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
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
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-balance">Bienvenido, {profile?.full_name}</h2>
                    <p className="text-muted-foreground mt-1">Aquí puedes ver tus rutinas y seguir tu progreso</p>
                </div>

                <div className="mb-8">
                    <ActivitiesCarousel />
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Próximas Rutinas</h3>
                        {upcomingRoutines.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 items-start">
                                {upcomingRoutines.map((routine: any, index: number) => (
                                    <RoutineCard
                                        key={routine.id}
                                        routine={routine}
                                        athleteId={user.id}
                                        index={index}
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
                        {pastRoutines.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 items-start">
                                {pastRoutines.slice(0, 4).map((routine: any, index: number) => (
                                    <RoutineCard
                                        key={routine.id}
                                        routine={routine}
                                        athleteId={user.id}
                                        isPast
                                        index={index}
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
