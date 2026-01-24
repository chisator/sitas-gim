"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from "next/link"
import { deleteRoutine } from "@/app/actions/trainer-actions"
import { RenewRoutineDialog } from "@/components/renew-routine-dialog"
import { ExportImportDialog } from "@/components/export-import-dialog"

interface TrainerRoutineCardProps {
  routine: any
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

export function TrainerRoutineCard({ routine, isPast = false }: TrainerRoutineCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showRenewDialog, setShowRenewDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const exercises = Array.isArray(routine.exercises) ? routine.exercises : []

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta rutina? Esta acción no se puede deshacer.")) {
      return
    }
    setIsDeleting(true)
    const result = await deleteRoutine(routine.id)

    if (result.error) {
      alert(result.error)
      setIsDeleting(false)
      return
    }

    // eliminado correctamente
    window.location.reload()
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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
          {isPast && (
            <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700">
              Finalizada
            </Badge>
          )}
        </div>
      </CardHeader>


      <CardContent className="flex flex-col flex-1">
        {routine.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{routine.description}</p>
        )}

        <div className="mt-auto space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">{exercises.length} ejercicios</p>
            <div className="relative">
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                      Ver detalles
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{routine.title}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      {routine.description && (
                        <div>
                          <h4 className="font-semibold mb-1 text-sm">Descripción</h4>
                          <p className="text-sm text-muted-foreground">{routine.description}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-2 text-sm">Ejercicios</h4>
                        {exercises.length > 0 ? (
                          <ul className="space-y-3">
                            {exercises.map((exercise: any, index: number) => (
                              <ExerciseItem key={index} exercise={exercise} />
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No hay ejercicios detallados.</p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                  <Link href={`/entrenador/editar-rutina/${routine.id}`}>Editar</Link>
                </Button>

                {/* Three-dots menu trigger */}
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMenu((s) => !s)}
                    className="p-2 rounded hover:bg-muted/50 text-sm"
                    aria-label="Más acciones"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-44 rounded-md border bg-popover p-1 shadow-lg z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false)
                          handleDelete()
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent/20 rounded"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Eliminando..." : "Eliminar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false)
                          setShowRenewDialog(true)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/20 rounded"
                        disabled={isDeleting}
                      >
                        Renovar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false)
                          setShowExportDialog(true)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/20 rounded"
                        disabled={isDeleting}
                      >
                        Descargar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <RenewRoutineDialog
        isOpen={showRenewDialog}
        onOpenChange={setShowRenewDialog}
        routineId={routine.id}
        currentEndDate={routine.end_date}
      />

      <ExportImportDialog
        isOpen={showExportDialog}
        onOpenChange={setShowExportDialog}
        routineId={routine.id}
      />
    </Card>
  )
}
