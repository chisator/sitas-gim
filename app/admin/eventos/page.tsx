"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, ChevronLeft } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EventDialog } from "@/components/admin/event-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

export default function AdminEventosPage() {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [events, setEvents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [userProfile, setUserProfile] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchEvents()
        fetchUserProfile()
    }, [date])

    const fetchUserProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()
            setUserProfile(data)
        }
    }

    const fetchEvents = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('gym_classes')
                .select('*, profiles(full_name)')
                .order('start_time', { ascending: true })

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
            toast.error("Error al cargar eventos")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (event: any, type: 'single' | 'series') => {
        const message = type === 'single'
            ? "¿Estás seguro de suspender esta clase? (Aparecerá como cancelada pero no se borrará)"
            : `¿Estás seguro de borrar TODAS las clases futuras de "${event.title}" en este horario?`

        if (!confirm(message)) return

        try {
            if (type === 'single') {
                // Suspend logic: Update 'is_cancelled' to true instead of deleting
                const { error } = await supabase
                    .from('gym_classes')
                    .update({ is_cancelled: true })
                    .eq('id', event.id)

                if (error) throw error
                toast.success("Clase suspendida")
            } else {
                // Series delete logic
                const originalDate = new Date(event.start_time)
                const originalDay = originalDate.getDay()
                const originalTime = originalDate.toTimeString().slice(0, 5)

                // Fetch candidates
                const { data: potentialMatches, error: searchError } = await supabase
                    .from('gym_classes')
                    .select('id, start_time')
                    .eq('title', event.title)
                    .gte('start_time', event.start_time)

                if (searchError) throw searchError

                // Filter strictly
                const idsToDelete = potentialMatches.filter(ev => {
                    const d = new Date(ev.start_time)
                    return d.getDay() === originalDay &&
                        d.toTimeString().slice(0, 5) === originalTime
                }).map(ev => ev.id)

                if (idsToDelete.length === 0) {
                    toast.info("No se encontraron otras clases para borrar")
                    return
                }

                const { error: deleteError } = await supabase
                    .from('gym_classes')
                    .delete()
                    .in('id', idsToDelete)

                if (deleteError) throw deleteError
                toast.success(`${idsToDelete.length} clases eliminadas de la serie`)
            }

            fetchEvents()
        } catch (error) {
            console.error('Error processing event:', error)
            toast.error("Error al procesar la solicitud (¿Existe la columna 'is_cancelled' en DB?)")
        }
    }

    const selectedDateEvents = events.filter(event => {
        if (!date) return false
        const eventDate = new Date(event.start_time)
        return eventDate.toDateString() === date.toDateString()
    })

    return (
        <div className="min-h-screen bg-background pb-24">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild className="mr-2">
                            <Link href="/admin">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold">Gestión de Clases</h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">Administración de calendario</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            {userProfile && (
                                <>
                                    <p className="text-sm font-medium">{userProfile.full_name}</p>
                                    <Badge variant="secondary" className="capitalize text-xs">{userProfile.role}</Badge>
                                </>
                            )}
                        </div>
                        <EventDialog onSuccess={fetchEvents}>
                            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Nueva Clase</span> <span className="sm:hidden">Crear</span>
                            </Button>
                        </EventDialog>
                    </div>
                </div>
            </header>

            <div className="container mx-auto py-6 space-y-6 px-4 sm:px-6">
                <div className="grid md:grid-cols-[1fr,2fr] gap-6">
                    <Card className="w-full h-fit">
                        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                            <CardTitle>Calendario</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center p-2 sm:p-6">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border p-3 w-fit mx-auto"
                                locale={es}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 sticky top-16 bg-card z-0 border-b">
                            <CardTitle>
                                Eventos del {date ? format(date, "d 'de' MMMM", { locale: es }) : "Día seleccionado"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pt-4">
                            {isLoading ? (
                                <div className="text-center py-10 text-muted-foreground">Cargando eventos...</div>
                            ) : selectedDateEvents.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedDateEvents.map((event) => (
                                        <div key={event.id} className="flex flex-col xl:flex-row xl:items-center justify-between border-b pb-4 last:border-0 gap-3">
                                            <div>
                                                <h3 className={`font-semibold text-lg flex items-center gap-2 ${event.is_cancelled ? 'text-muted-foreground line-through' : ''}`}>
                                                    {event.title}
                                                    {event.is_cancelled && <span className="text-destructive text-xs no-underline font-bold uppercase border border-destructive px-1 rounded">Suspendido</span>}
                                                </h3>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                                                        {format(new Date(event.start_time), "HH:mm")} - {format(new Date(event.end_time), "HH:mm")}
                                                    </span>
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Instructor: <span className="font-medium text-foreground">{event.profiles?.full_name || 'Sin asignar'}</span>
                                                </p>
                                                {event.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>}
                                            </div>
                                            <div className="flex flex-wrap gap-2 self-start xl:self-center">
                                                <EventDialog eventToEdit={event} onSuccess={fetchEvents}>
                                                    <Button variant="outline" size="sm" className="h-8">Editar</Button>
                                                </EventDialog>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200"
                                                    onClick={() => handleDelete(event, 'single')}
                                                    title="Suspender esta clase (Solo hoy)"
                                                >
                                                    Suspender
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => handleDelete(event, 'series')}
                                                    title="Borrar todas las clases futuras de este horario"
                                                >
                                                    Borrar Todo
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
                                    <Calendar className="h-10 w-10 opacity-20" />
                                    <p>No hay clases programadas.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
