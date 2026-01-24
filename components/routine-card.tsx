"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface RoutineCardProps {
  routine: any
  attendance?: any
  athleteId: string
  isPast?: boolean
}

// Helper component for individual exercise items with video toggle
function ExerciseItem({ exercise }: { exercise: any }) {
  const [showVideo, setShowVideo] = useState(false)

  const getYouTubeId = (url: string) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }

  const videoId = getYouTubeId(exercise.video_url)

  return (
    <li className="text-sm bg-muted p-3 rounded-md">
      <p className="font-medium text-base">{exercise.name}</p>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs sm:text-sm">
        {exercise.sets && <p className="text-muted-foreground">Series: <span className="text-foreground">{exercise.sets}</span></p>}
        {exercise.reps && <p className="text-muted-foreground">Reps: <span className="text-foreground">{exercise.reps}</span></p>}
        {exercise.weight && <p className="text-muted-foreground">Peso: <span className="text-foreground">{exercise.weight}{!exercise.weight.toLowerCase().includes("kg") && " kg"}</span></p>}
        {exercise.duration && <p className="text-muted-foreground">Duración: <span className="text-foreground">{exercise.duration}</span></p>}
      </div>

      {videoId && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVideo(!showVideo)}
            className="w-full text-xs h-8 mb-2"
          >
            {showVideo ? "Ocultar video" : "Ver video tutorial"}
          </Button>

          {showVideo && (
            <div className="aspect-video w-full rounded-md overflow-hidden bg-black/10">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={exercise.name}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}
        </div>
      )}

      {exercise.notes && <p className="text-muted-foreground mt-2 text-xs italic">{exercise.notes}</p>}
    </li>
  )
}

export function RoutineCard({ routine, attendance, athleteId, isPast = false }: RoutineCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const router = useRouter()

  const exercises = Array.isArray(routine.exercises) ? routine.exercises : []

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base sm:text-lg">{routine.title}</CardTitle>
            <CardDescription className="mt-1">
              <Badge variant="outline" className="mr-2">
                {routine.sports?.name}
              </Badge>
              <span className="text-xs">
                {routine.start_date && routine.end_date
                  ? `${formatDate(routine.start_date)} - ${formatDate(routine.end_date)}`
                  : routine.end_date
                    ? formatDate(routine.end_date)
                    : routine.start_date
                      ? formatDate(routine.start_date)
                      : "Sin fecha"}
              </span>
            </CardDescription>
          </div>
          {isPast && attendance?.completed && (
            <Badge variant="default" className="bg-green-600">
              Completada
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        {routine.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{routine.description}</p>
        )}

        <div className="mt-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                Ver detalles y ejercicios
              </Button>
            </DialogTrigger>


            <DialogContent
              className="max-w-md max-h-[80vh] overflow-y-auto"
              onPointerDownOutside={(e) => {
                const target = e.detail.originalEvent.target as HTMLElement
                const timerContainer = document.getElementById("workout-timer-container")

                // Check if the click target is inside the timer container
                if (timerContainer && timerContainer.contains(target)) {
                  e.preventDefault()
                } else if (target.closest("[data-radix-collection-item]")) {
                  e.preventDefault()
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>{routine.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* ... existing content ... */}
                {routine.description && (
                  <div>
                    <h4 className="font-semibold mb-1 text-sm">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{routine.description}</p>
                  </div>
                )}

                {/* ... */}

                <div>
                  <h4 className="font-semibold mb-2 text-sm">Ejercicios</h4>
                  <ul className="space-y-4">
                    {exercises.map((exercise: any, index: number) => (
                      <ExerciseItem key={index} exercise={exercise} />
                    ))}
                  </ul>
                  {exercises.length === 0 && <p className="text-sm text-muted-foreground">No hay ejercicios en esta rutina.</p>}
                </div>
              </div>

              {/* Insert Timer here, perfectly visible when dialog is open */}


            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}


