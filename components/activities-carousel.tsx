
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, startOfWeek, endOfWeek, addDays } from "date-fns"
import { es } from "date-fns/locale"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    CarouselDots,
} from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

type WeeklySchedule = {
    day: string
    time: string
    instructor: string
    isCancelled?: boolean
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

export function ActivitiesCarousel() {
    const [activities, setActivities] = useState<ActivityType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [weekRange, setWeekRange] = useState("")
    const supabase = createClient()

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setIsLoading(true)
        try {
            const now = new Date()
            // If Sunday (0), we consider the "active week" to be the NEXT week starting tomorrow (Monday)
            // If Mon-Sat, we consider the "active week" to be the CURRENT week (started last Monday)
            let targetDate = now
            if (now.getDay() === 0) {
                targetDate = addDays(now, 1)
            }

            const start = startOfWeek(targetDate, { weekStartsOn: 1 }) // Monday
            const end = endOfWeek(targetDate, { weekStartsOn: 1 }) // Sunday

            setWeekRange(`Semana del ${format(start, "d 'de' MMMM", { locale: es })} `)

            const { data, error } = await supabase
                .from('gym_classes')
                .select('*, profiles(full_name)')
                .gte('start_time', start.toISOString())
                .lte('start_time', end.toISOString())
                .order('start_time', { ascending: true })

            if (error) throw error

            const rawEvents = data || []

            const activitiesMap = new Map<string, ActivityType>()

            rawEvents.forEach(event => {
                const title = event.title
                const dateObj = new Date(event.start_time)
                const dayName = format(dateObj, "EEEE", { locale: es }).toLowerCase()
                const timeStr = format(dateObj, "HH:mm")
                const instructor = event.profiles?.full_name || 'Sin asignar'

                if (!activitiesMap.has(title)) {
                    activitiesMap.set(title, { title, schedules: [] })
                }

                const activity = activitiesMap.get(title)!

                const exists = activity.schedules.some(s => s.day === dayName && s.time === timeStr)
                if (!exists) {
                    activity.schedules.push({
                        day: dayName,
                        time: timeStr,
                        instructor,
                        isCancelled: event.is_cancelled
                    })
                }
            })

            const sortedActivities = Array.from(activitiesMap.values()).map(act => {
                act.schedules.sort((a, b) => {
                    const dayA = DAYS_ORDER[a.day as keyof typeof DAYS_ORDER] || 0
                    const dayB = DAYS_ORDER[b.day as keyof typeof DAYS_ORDER] || 0
                    if (dayA !== dayB) return dayA - dayB
                    return a.time.localeCompare(b.time)
                })
                return act
            })

            sortedActivities.sort((a, b) => a.title.localeCompare(b.title))

            setActivities(sortedActivities)
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return <div className="text-center py-10 text-muted-foreground w-full">Cargando actividades...</div>
    }

    if (activities.length === 0) {
        return <div className="text-center py-8 text-muted-foreground w-full">No hay actividades programadas para esta semana.</div>
    }

    return (
        <div className="w-full py-4">
            <h3 className="text-center text-muted-foreground text-sm mb-4 uppercase tracking-widest">{weekRange}</h3>
            <Carousel
                className="w-full max-w-[1400px] mx-auto"
                opts={{
                    align: "center",
                    loop: true,
                }}
            >
                <CarouselContent className="-ml-4">
                    {activities.map((activity, index) => (
                        <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                            <div className="p-1 h-full">
                                <Card className={`h-[280px] flex flex-col border-0 shadow-lg overflow-hidden relative group cursor-pointer transition-all hover:scale-[1.01]
                                    ${index % 6 === 0 ? "bg-gradient-to-br from-blue-600 to-violet-600" :
                                        index % 6 === 1 ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                                            index % 6 === 2 ? "bg-gradient-to-br from-orange-500 to-red-600" :
                                                index % 6 === 3 ? "bg-gradient-to-br from-pink-500 to-rose-600" :
                                                    index % 6 === 4 ? "bg-gradient-to-br from-indigo-500 to-purple-600" :
                                                        "bg-gradient-to-br from-cyan-500 to-blue-600"
                                    } text-white`
                                }>
                                    {/* Abstract Pattern overlay */}
                                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/2 -translate-y-1/2">
                                        <Clock className="w-48 h-48" />
                                    </div>

                                    <CardHeader className="relative z-10 pb-2">
                                        <CardTitle className="text-2xl font-bold tracking-tight text-white/95 truncate" title={activity.title}>
                                            {activity.title}
                                        </CardTitle>
                                        {/* Alerta de suspensión */}
                                        {activity.schedules.some(s => s.isCancelled) && (
                                            <div className="flex flex-col gap-1 mt-1">
                                                {activity.schedules.filter(s => s.isCancelled).map((s, i) => (
                                                    <p key={i} className="text-[10px] leading-tight font-bold text-red-200 bg-red-900/40 px-1.5 py-0.5 rounded w-fit border border-red-500/30">
                                                        ⚠️ Clase de las {s.time} ({s.day}) suspendida
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </CardHeader>

                                    <CardContent className="relative z-10 flex-1 overflow-auto pt-2 scrollbar-none">
                                        <div className="space-y-3">
                                            {(() => {
                                                // Group schedules by day
                                                const groupedByDay = activity.schedules.reduce((acc, curr) => {
                                                    if (!acc[curr.day]) {
                                                        acc[curr.day] = []
                                                    }
                                                    acc[curr.day].push(curr)
                                                    return acc
                                                }, {} as Record<string, typeof activity.schedules>)

                                                // Sort days based on predefined order
                                                const sortedDays = Object.keys(groupedByDay).sort((a, b) => {
                                                    return (DAYS_ORDER[a as keyof typeof DAYS_ORDER] || 0) - (DAYS_ORDER[b as keyof typeof DAYS_ORDER] || 0)
                                                })

                                                return sortedDays.map((day) => (
                                                    <div key={day} className="flex items-start justify-between border-b border-white/20 pb-2 last:border-0 last:pb-0 text-sm font-medium">
                                                        <div className="flex flex-col gap-1 w-full">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge variant="secondary" className="bg-white/20 text-white border-0 capitalize w-24 justify-center backdrop-blur-sm shadow-sm">
                                                                    {day}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 pl-1">
                                                                {groupedByDay[day].sort((a, b) => a.time.localeCompare(b.time)).map((slot, sIdx) => (
                                                                    <div
                                                                        key={sIdx}
                                                                        className={`flex items-center rounded px-2 py-0.5 text-xs transition-colors
                                                                            ${slot.isCancelled
                                                                                ? "bg-red-500/20 text-white/50 line-through decoration-white/40"
                                                                                : "bg-white/10 text-white/90"
                                                                            }`}
                                                                        title={slot.isCancelled ? "Clase suspendida" : `Instructor: ${slot.instructor}`}
                                                                    >
                                                                        <Clock className={`w-3 h-3 mr-1 ${slot.isCancelled ? "opacity-40" : "opacity-70"}`} />
                                                                        {slot.time}
                                                                        {slot.isCancelled && <span className="no-underline ml-1 text-[10px] opacity-70">(Susp.)</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            })()}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="hidden md:block">
                    <CarouselPrevious className="left-4 bg-white/20 border-0 text-white hover:bg-white/40" />
                    <CarouselNext className="right-4 bg-white/20 border-0 text-white hover:bg-white/40" />
                </div>
                <CarouselDots className="mt-6" />
            </Carousel>
        </div>
    )
}

