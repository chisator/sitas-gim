"use client"

import { useState } from "react"
import { Line, LineChart, Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ProgressChartProps {
    data: { date: string; weight: number; oneRM: number; volume: number }[]
    exerciseName: string
}

// Helper to format large numbers
const formatNumber = (num: number) => {
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k`
    }
    return num.toString()
}

export function ProgressChart({ data, exerciseName }: ProgressChartProps) {
    const [metric, setMetric] = useState<"strength" | "volume">("strength")

    if (!data || data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed p-8 text-muted-foreground">
                No hay datos suficientes para mostrar el gráfico.
            </div>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">Progreso: <span className="font-bold">{exerciseName}</span></CardTitle>
                <Tabs value={metric} onValueChange={(v) => setMetric(v as "strength" | "volume")} className="w-[200px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="strength">Fuerza</TabsTrigger>
                        <TabsTrigger value="volume">Volumen</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pt-6">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {metric === "strength" ? (
                            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tickFormatter={(value) => format(new Date(value), "d MMM", { locale: es })}
                                    style={{ fontSize: '12px', fill: '#6B7280' }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    style={{ fontSize: '12px', fontWeight: 'bold', fill: '#000000' }}
                                    width={60}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <div className="mb-2 border-b pb-1">
                                                        <span className="font-semibold">
                                                            {format(new Date(label), "d MMMM yyyy", { locale: es })}
                                                        </span>
                                                    </div>
                                                    {payload.map((p: any) => (
                                                        <div key={p.name} className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                            <span className="text-sm text-muted-foreground capitalize">
                                                                {p.name === "oneRM" ? "1RM Estimado" : "Peso Máximo"}:
                                                            </span>
                                                            <span className="font-bold">
                                                                {p.value} kg
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Line
                                    name="1RM Estimado"
                                    type="monotone"
                                    dataKey="oneRM"
                                    stroke="#8884d8" // Purple/indigo
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 0, fill: '#8884d8' }}
                                    activeDot={{ r: 7 }}
                                />
                                <Line
                                    name="Peso Máximo"
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#82ca9d" // Green
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 0, fill: '#82ca9d' }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        ) : (
                            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tickFormatter={(value) => format(new Date(value), "d MMM", { locale: es })}
                                    style={{ fontSize: '12px', fill: '#6B7280' }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    style={{ fontSize: '12px', fontWeight: 'bold', fill: '#000000' }}
                                    width={60}
                                    tickFormatter={formatNumber}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                    <div className="mb-2 border-b pb-1">
                                                        <span className="font-semibold">
                                                            {format(new Date(label), "d MMMM yyyy", { locale: es })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                        <span className="text-sm text-muted-foreground">Volumen Total:</span>
                                                        <span className="font-bold">
                                                            {payload[0].value?.toLocaleString()} kg
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="volume"
                                    name="Volumen Total"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorVolume)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 text-xs text-muted-foreground text-center">
                    {metric === "strength"
                        ? "1RM = Estimación de peso máximo para 1 repetición (Fórmula Brzycki)"
                        : "Volumen = Peso × Repeticiones × Series (Carga total de trabajo)"}
                </div>
            </CardContent>
        </Card>
    )
}
