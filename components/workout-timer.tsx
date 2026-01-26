"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Square, Timer, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { toast } from "sonner"

export function WorkoutTimer() {
    const [isOpen, setIsOpen] = useState(false)
    const [time, setTime] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const [mode, setMode] = useState<"stopwatch" | "timer">("stopwatch")
    const [presetTime, setPresetTime] = useState(60) // Default 60s for timer

    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Audio Context and Beep logic
    const audioContextRef = useRef<AudioContext | null>(null)

    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume()
        }
    }

    // ... imports

    const playAlarm = () => {
        try {
            const ctx = audioContextRef.current
            if (!ctx) return

            // Secuencia de 3 beeps
            const now = ctx.currentTime
            const beeps = [0, 0.4, 0.8] // Tiempos de inicio

            beeps.forEach(startTime => {
                const osc = ctx.createOscillator()
                const gainNode = ctx.createGain()

                osc.connect(gainNode)
                gainNode.connect(ctx.destination)

                osc.type = 'sine'
                osc.frequency.setValueAtTime(880, now + startTime)
                osc.frequency.exponentialRampToValueAtTime(440, now + startTime + 0.2) // Caída de tono para efecto alarma

                gainNode.gain.setValueAtTime(0.5, now + startTime)
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + startTime + 0.2)

                osc.start(now + startTime)
                osc.stop(now + startTime + 0.2)
            })

            // Vibración (pattern: vibrar 200, pausa 100, vibrar 200...)
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 400])
            }

        } catch (e) {
            console.error("Error generating alarm:", e)
        }
    }

    // Effect to handle timer countdown
    useEffect(() => {
        if (isActive) {
            intervalRef.current = setInterval(() => {
                setTime((prevTime) => {
                    if (mode === "timer") {
                        if (prevTime <= 0) {
                            return 0
                        }
                        return prevTime - 1
                    }
                    return prevTime + 1
                })
            }, 1000)
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isActive, mode])

    // Effect to handle timer completion
    useEffect(() => {
        if (mode === "timer" && time === 0 && isActive) {
            setIsActive(false)
            playAlarm()
            toast("¡Tiempo terminado!", {
                description: "El temporizador ha llegado a cero.",
                duration: 5000,
                action: {
                    label: "Reiniciar",
                    onClick: () => {
                        setTimerMode(presetTime)
                        setIsActive(true)
                    }
                }
            })
        }
    }, [time, isActive, mode, presetTime])

    const toggleTimer = () => {
        if (!isActive) {
            initAudio() // Initialize on user interaction
        }
        setIsActive(!isActive)
    }

    const resetTimer = () => {
        setIsActive(false)
        setTime(mode === "timer" ? presetTime : 0)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const setTimerMode = (duration: number) => {
        setMode("timer")
        setPresetTime(duration)
        setTime(duration)
        setIsActive(false)
    }

    const setStopwatchMode = () => {
        setMode("stopwatch")
        setTime(0)
        setIsActive(false)
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    // Use createPortal to ensure the timer is outside the stacking context of the main app flow
    // and can compete properly with Dialogs (which are also ported).
    // Usually Dialogs have z-50. We use z-[100] to stay on top.
    const content = (
        <div
            id="workout-timer-container"
            className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 isolate pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {isOpen && (
                <Card className="w-64 shadow-xl border-2 border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300 bg-background/95 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center bg-muted p-1 rounded-lg">
                            <Button
                                variant={mode === "stopwatch" ? "default" : "ghost"}
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={setStopwatchMode}
                            >
                                Cronómetro
                            </Button>
                            <Button
                                variant={mode === "timer" ? "default" : "ghost"}
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => setTimerMode(60)}
                            >
                                Temporizador
                            </Button>
                        </div>

                        <div className="text-center">
                            <div className="text-5xl font-mono font-bold tracking-wider tabular-nums">
                                {formatTime(time)}
                            </div>
                        </div>

                        <div className="flex justify-center gap-2">
                            <Button
                                variant={isActive ? "secondary" : "default"}
                                size="icon"
                                className="h-12 w-12 rounded-full"
                                onClick={toggleTimer}
                            >
                                {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                            </Button>
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={resetTimer}>
                                {isActive ? <Square className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
                            </Button>
                        </div>

                        {mode === "timer" && (
                            <div className="grid grid-cols-3 gap-1">
                                {[30, 60, 90, 120, 180, 300].map(sec => (
                                    <Button
                                        key={sec}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7"
                                        onClick={() => {
                                            setTimerMode(sec)
                                            setIsActive(true) // Auto start on preset click? Optional.
                                        }}
                                    >
                                        {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Button
                size="lg"
                className={cn(
                    "rounded-full shadow-lg h-14 px-6 gap-2 transition-all",
                    isOpen ? "bg-primary text-primary-foreground" : "bg-primary hover:bg-primary/90"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Timer className="h-6 w-6" />
                <span className="font-bold text-lg tabular-nums">
                    {isActive ? formatTime(time) : isOpen ? "Ocultar" : "Timer"}
                </span>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
        </div>
    )

    // Using a portal allows this to float above everything else including Dialogs
    if (typeof document !== "undefined") {
        import("react-dom").then(ReactDOM => {
            // This is just for type safety, the dynamic import handles it
        })
    }

    // Since we are in client component, we can use createPortal directly if we import it
    const { createPortal } = require("react-dom")
    return createPortal(content, document.body)
}
