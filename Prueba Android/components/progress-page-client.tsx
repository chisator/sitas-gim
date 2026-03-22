"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProgressChart } from "@/components/progress-chart"
import { createClient } from "@/lib/client"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface ProgressPageClientProps {
    exercises: string[]
}

export function ProgressPageClient({ exercises }: ProgressPageClientProps) {
    const [selectedExercise, setSelectedExercise] = useState<string>("")
    const [chartData, setChartData] = useState<{ date: string; weight: number; oneRM: number; volume: number }[]>([])
    const [loading, setLoading] = useState(false)

    const supabase = createClient() // Add imports: import { createClient } from "@/lib/client"

    useEffect(() => {
        if (selectedExercise) {
            setLoading(true)

            async function fetchData() {
                try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return

                    const { data, error } = await supabase
                        .from("workout_log_entries")
                        .select(`
                            exercise_name,
                            sets_data,
                            workout_logs!inner (
                                date,
                                user_id
                            )
                        `)
                        .eq("workout_logs.user_id", user.id)
                        .eq("exercise_name", selectedExercise)
                        .order("workout_logs(date)", { ascending: true })

                    if (error) throw error
                    if (!data) {
                        setChartData([])
                        return
                    }

                    // Process data
                    const progressData = data.map((entry: any) => {
                        const sets = entry.sets_data || []
                        let maxWeight = 0
                        let maxOneRM = 0
                        let totalVolume = 0

                        sets.forEach((s: any) => {
                            const w = parseFloat(s.weight)
                            const r = parseFloat(s.reps)

                            if (!isNaN(w) && w > 0) {
                                if (w > maxWeight) maxWeight = w
                                if (!isNaN(r) && r > 0) {
                                    totalVolume += w * r
                                    const oneRM = w / (1.0278 - (0.0278 * r))
                                    if (oneRM > maxOneRM) maxOneRM = oneRM
                                }
                            }
                        })

                        return {
                            date: entry.workout_logs.date,
                            weight: maxWeight,
                            oneRM: Math.round(maxOneRM * 10) / 10,
                            volume: totalVolume
                        }
                    })
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

                    setChartData(progressData)
                } catch (err) {
                    console.error("Error fetching progress:", err)
                    setChartData([])
                } finally {
                    setLoading(false)
                }
            }

            fetchData()
        }
    }, [selectedExercise])

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Selecciona un ejercicio
                    </label>
                    <Select onValueChange={setSelectedExercise} value={selectedExercise}>
                        <SelectTrigger className="w-full sm:w-[300px]">
                            <SelectValue placeholder="Buscar ejercicio..." />
                        </SelectTrigger>
                        <SelectContent>
                            {exercises.length > 0 ? (
                                exercises.map((ex) => (
                                    <SelectItem key={ex} value={ex}>
                                        {ex}
                                    </SelectItem>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                    No hay ejercicios registrados aún.
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {selectedExercise && (
                <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <ProgressChart data={chartData} exerciseName={selectedExercise} />
                    )}
                </div>
            )}
        </div>
    )
}
