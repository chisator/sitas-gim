"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar as CalendarIcon, User } from "lucide-react"

type WeeklySchedule = {
    day: string
    time: string
    instructor: string
}

type ActivityType = {
    title: string
    schedules: WeeklySchedule[]
}

const DAYS_ORDER = {
    "lunes": 1,
    "martes": 2,
    "miércoles": 3,
    "jueves": 4,
    "viernes": 5,
    "sábado": 6,
    "domingo": 7
}

export default function DeportistaAgendaPage() {
    const [activities, setActivities] = useState<ActivityType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setIsLoading(true)
        try {
            // Fetch all future events (or events from now on)
            const { data, error } = await supabase
                .from('gym_classes')
                .select('*, profiles(full_name)')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })

            if (error) throw error

            const rawEvents = data || []

            // Group by Title and Consolidate Schedule
            const activitiesMap = new Map<string, ActivityType>()

            rawEvents.forEach(event => {
                const title = event.title
                // Get day name in Spanish
                const dateObj = new Date(event.start_time)
                const dayName = format(dateObj, "EEEE", { locale: es }).toLowerCase()
                const timeStr = format(dateObj, "HH:mm")
                const instructor = event.profiles?.full_name || 'Sin asignar'

                if (!activitiesMap.has(title)) {
                    activitiesMap.set(title, { title, schedules: [] })
                }

                const activity = activitiesMap.get(title)!

                // Check if this slot already exists (deduplicate)
                const exists = activity.schedules.some(s => s.day === dayName && s.time === timeStr)
                if (!exists) {
                    activity.schedules.push({ day: dayName, time: timeStr, instructor })
                }
            })

            // Sort schedules by day of week
            const sortedActivities = Array.from(activitiesMap.values()).map(act => {
                act.schedules.sort((a, b) => {
                    const dayA = DAYS_ORDER[a.day as keyof typeof DAYS_ORDER] || 0
                    const dayB = DAYS_ORDER[b.day as keyof typeof DAYS_ORDER] || 0
                    if (dayA !== dayB) return dayA - dayB
                    return a.time.localeCompare(b.time)
                })
                return act
            })

            // Sort activities alphabetically?
            sortedActivities.sort((a, b) => a.title.localeCompare(b.title))

            setActivities(sortedActivities)
        } catch (error) {
            console.error('Error fetching events:', error)
            toast.error("Error al cargar eventos")
        } finally {
            setIsLoading(false)
        }
    }

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    return (
        <div className="container mx-auto py-6 space-y-6 px-4">
            <h1 className="text-3xl font-bold mb-6 text-center">Clases Disponibles</h1>

            {isLoading ? (
                <div className="text-center py-10">Cargando clases...</div>
            ) : activities.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No hay clases programadas próximamente.</div>
            ) : (
                <div className="flex justify-center">
                    <Carousel className="w-full max-w-sm sm:max-w-md md:max-w-lg">
                        <CarouselContent>
                            {activities.map((activity, index) => (
                                <CarouselItem key={index}>
                                    <div className="p-1">
                                        <Card className="h-[400px] flex flex-col shadow-md">
                                            <CardHeader className="bg-muted/20 border-b pb-4">
                                                <CardTitle className="text-2xl text-center text-primary">{activity.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-1 overflow-y-auto pt-6">
                                                <div className="space-y-4">
                                                    {activity.schedules.map((slot, idx) => (
                                                        <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="outline" className="w-24 justify-center capitalize">
                                                                    {slot.day}
                                                                </Badge>
                                                                <div className="flex items-center text-sm font-medium">
                                                                    <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                                                                    {slot.time}
                                                                </div>
                                                            </div>
                                                            {slot.instructor !== 'Sin asignar' && (
                                                                <div className="flex items-center text-xs text-muted-foreground" title={`Instructor: ${slot.instructor}`}>
                                                                    <User className="w-3 h-3 mr-1" />
                                                                    <span className="truncate max-w-[80px]">{slot.instructor.split(' ')[0]}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="hidden sm:block">
                            <CarouselPrevious />
                            <CarouselNext />
                        </div>
                        {/* Mobile navigation hint or buttons below if arrows are hidden */}
                        <div className="flex justify-center gap-2 mt-4 sm:hidden">
                            <p className="text-xs text-muted-foreground animate-pulse">Desliza para ver más actividades →</p>
                        </div>
                    </Carousel>
                </div>
            )}
        </div>
    )
}
