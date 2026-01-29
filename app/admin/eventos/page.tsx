"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client" // Adjust import based on project structure
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { EventDialog } from "@/components/admin/event-dialog"

export default function AdminEventosPage() {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [events, setEvents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchEvents()
    }, [date])

    const fetchEvents = async () => {
        setIsLoading(true)
        // Fetch events for the selected month? Or all future?
        // For simplicity, let's fetch all future events or events around selected date
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

    const handleDelete = async (eventId: string) => {
        if (!confirm("¿Estás seguro de eliminar este evento?")) return

        try {
            const { error } = await supabase
                .from('gym_classes')
                .delete()
                .eq('id', eventId)

            if (error) throw error
            toast.success("Evento eliminado")
            fetchEvents()
        } catch (error) {
            console.error('Error deleting event:', error)
            toast.error("Error al eliminar evento")
        }
    }

    const selectedDateEvents = events.filter(event => {
        if (!date) return false
        const eventDate = new Date(event.start_time)
        return eventDate.toDateString() === date.toDateString()
    })

    return (
        <div className="container mx-auto py-6 space-y-6 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold">Gestión de Clases y Eventos</h1>
                <EventDialog onSuccess={fetchEvents}>
                    <Button className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Evento
                    </Button>
                </EventDialog>
            </div>

            <div className="grid md:grid-cols-[1fr,2fr] gap-6">
                <Card className="w-full">
                    <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                        <CardTitle>Calendario</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center p-2 sm:p-6">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border p-3 w-fit mx-auto"
                            locale={es} // Ensure locale is imported/setup
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
                        <CardTitle>
                            Eventos del {date ? format(date, "d 'de' MMMM", { locale: es }) : "Día seleccionado"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                        {isLoading ? (
                            <p>Cargando...</p>
                        ) : selectedDateEvents.length > 0 ? (
                            <div className="space-y-4">
                                {selectedDateEvents.map((event) => (
                                    <div key={event.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                                        <div>
                                            <h3 className="font-semibold text-lg">{event.title}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(event.start_time), "HH:mm")} - {format(new Date(event.end_time), "HH:mm")}
                                            </p>
                                            <p className="text-sm">Instructor: {event.profiles?.full_name || 'Sin asignar'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <EventDialog eventToEdit={event} onSuccess={fetchEvents}>
                                                <Button variant="outline" size="sm">Editar</Button>
                                            </EventDialog>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(event.id)}>Borrar</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">No hay clases programadas para este día.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
