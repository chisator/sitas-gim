"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/client"
import * as XLSX from "xlsx"

interface ExportDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  routineId?: string
}

export function ExportImportDialog({
  isOpen,
  onOpenChange,
  routineId,
}: ExportDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<"json" | "csv" | "xlsx">("json")
  const supabase = createClient()

  const handleExport = async () => {
    if (!routineId) return
    setIsLoading(true)
    setError(null)
    try {
      const { data: routine, error: fetchError } = await supabase
        .from('routines')
        .select('exercises, title')
        .eq('id', routineId)
        .single()

      if (fetchError) throw new Error("Error fetching routine: " + fetchError.message)
      if (!routine) throw new Error("Rutina no encontrada")

      const exercises = routine.exercises || []
      const filenameBase = routine.title ? routine.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'routine'

      if (selectedFormat === "xlsx" || selectedFormat === "csv" || selectedFormat === "json") {
        let content: any;
        let type = "";
        let extension = "";

        if (selectedFormat === "xlsx") {
          const ws = XLSX.utils.json_to_sheet(exercises)
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, "Ejercicios")
          // Ajustar ancho de columnas
          const colWidths = [
            { wch: 30 }, // name
            { wch: 8 },  // sets
            { wch: 8 },  // reps
            { wch: 10 }, // weight
            { wch: 8 },  // rest
            { wch: 30 }, // notes
          ]
          ws["!cols"] = colWidths
          XLSX.writeFile(wb, `${filenameBase}.xlsx`)
          setIsLoading(false)
          onOpenChange(false)
          return
        } else if (selectedFormat === "json") {
          content = JSON.stringify(exercises, null, 2)
          type = "application/json"
          extension = "json"
        } else if (selectedFormat === "csv") {
          const header = ["name", "sets", "reps", "weight", "rest", "notes", "video_url"]
          const rows = exercises.map((ex: any) => [
            `"${(ex.name || "").replace(/"/g, '""')}"`,
            ex.sets,
            ex.reps,
            ex.weight,
            ex.duration, // mapped to rest
            `"${(ex.notes || "").replace(/"/g, '""')}"`,
            ex.video_url
          ].join(","))
          content = [header.join(","), ...rows].join("\n")
          type = "text/csv"
          extension = "csv"
        }

        // Crear blob y descargar
        const blob = new Blob([content], { type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${filenameBase}.${extension}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Error al exportar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar Ejercicios</DialogTitle>
          <DialogDescription>Descarga los ejercicios de la rutina en tu formato preferido</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Formato de descarga</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedFormat === "json" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFormat("json")}
              >
                JSON
              </Button>
              <Button
                variant={selectedFormat === "csv" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFormat("csv")}
              >
                CSV
              </Button>
              <Button
                variant={selectedFormat === "xlsx" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFormat("xlsx")}
              >
                Excel
              </Button>
            </div>
          </div>
          {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
          <Button onClick={handleExport} disabled={isLoading || !routineId} className="w-full">
            {isLoading ? "Descargando..." : "Descargar Ejercicios"}
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
