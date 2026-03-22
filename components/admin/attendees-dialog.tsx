"use client"

import { useState, useEffect } from "react"
import { getAttendees } from "@/app/actions/admin-actions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AttendeesDialogProps {
    classId: string
    title: string
    currentCount: number
    capacity: number
}

export function AttendeesDialog({ classId, title, currentCount, capacity }: AttendeesDialogProps) {
    const [open, setOpen] = useState(false)
    const [attendees, setAttendees] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            fetchAttendees()
        }
    }, [open])

    const fetchAttendees = async () => {
        setLoading(true)
        const result = await getAttendees(classId)
        if (result.success && result.attendees) {
            setAttendees(result.attendees)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2" title="Ver Asistentes">
                    <Users className="h-4 w-4" />
                    <span>{currentCount} / {capacity || 20}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Asistentes: {title}</DialogTitle>
                    <DialogDescription>
                        Lista de usuarios que han reservado su lugar para esta clase ({currentCount} de {capacity || 20} cupos).
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <p className="text-center text-muted-foreground text-sm">Cargando...</p>
                    ) : attendees.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm">No hay asistentes anotados aún.</p>
                    ) : (
                        <ul className="space-y-2 border rounded-md p-2 divide-y">
                            {attendees.map((attendee, index) => (
                                <li key={attendee.id} className="pt-2 pb-2 first:pt-0 last:pb-0 flex items-center justify-between text-sm">
                                    <span className="font-medium">{index + 1}. {attendee.profiles?.full_name || "Usuario Desconocido"}</span>
                                    {attendee.profiles?.email && <span className="text-xs text-muted-foreground">{attendee.profiles.email}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
