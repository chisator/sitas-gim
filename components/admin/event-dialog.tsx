import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const eventSchema = z.object({
    title: z.string().min(2, "El título debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    date: z.string().min(1, "La fecha es requerida"),
    startTime: z.string().min(1, "La hora de inicio es requerida"),
    endTime: z.string().min(1, "La hora de fin es requerida"),
    instructorId: z.string().optional(),
    recurrenceWeeks: z.string().optional(),
    updateFutureEvents: z.boolean().optional(), // New field for bulk update
})

type EventFormValues = z.infer<typeof eventSchema>

interface EventDialogProps {
    children?: React.ReactNode
    onSuccess?: () => void
    eventToEdit?: any // Optional event to edit
}

export function EventDialog({ children, onSuccess, eventToEdit }: EventDialogProps) {
    const [open, setOpen] = useState(false)
    const [instructors, setInstructors] = useState<any[]>([])
    const [additionalSlots, setAdditionalSlots] = useState<{ startTime: string, endTime: string }[]>([])
    const supabase = createClient()

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setValue,
    } = useForm<EventFormValues>({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            title: "",
            description: "",
            date: "",
            startTime: "",
            endTime: "",
            instructorId: "",
            recurrenceWeeks: "1",
            updateFutureEvents: false,
        }
    })

    const PREDEFINED_ACTIVITIES = ["Indoor Bike", "Crossfit", "Funcional", "Box Training"]

    useEffect(() => {
        if (open) {
            fetchInstructors()
            if (eventToEdit) {
                // Parse date and time from ISO strings
                const startDate = new Date(eventToEdit.start_time)
                const endDate = new Date(eventToEdit.end_time)

                reset({
                    title: eventToEdit.title,
                    description: eventToEdit.description || "",
                    date: startDate.toISOString().split('T')[0],
                    startTime: startDate.toTimeString().slice(0, 5),
                    endTime: endDate.toTimeString().slice(0, 5),
                    instructorId: eventToEdit.instructor_id || "",
                    recurrenceWeeks: "1",
                    updateFutureEvents: false,
                })
            } else {
                reset({
                    title: "",
                    description: "",
                    date: "",
                    startTime: "",
                    endTime: "",
                    instructorId: "",
                    recurrenceWeeks: "1",
                    updateFutureEvents: false,
                })
                setAdditionalSlots([])
            }
        }
    }, [open, eventToEdit])

    const fetchInstructors = async () => {
        const { data } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in('role', ['entrenador', 'administrador']) // Allow admins too?
        setInstructors(data || [])
    }

    const onSubmit = async (data: EventFormValues) => {
        try {
            if (eventToEdit) {
                // Update Logic
                const startDateTime = new Date(`${data.date}T${data.startTime}`)
                const endDateTime = new Date(`${data.date}T${data.endTime}`)

                // Fields to update
                const updatePayload = {
                    title: data.title,
                    description: data.description,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    instructor_id: data.instructorId || null,
                }

                if (data.updateFutureEvents) {
                    // 1. Get original details to find matches
                    const originalDate = new Date(eventToEdit.start_time)
                    const originalDay = originalDate.getDay() // 0-6
                    const originalTime = originalDate.toTimeString().slice(0, 5) // HH:MM

                    // 2. Fetch all future events that *look* like this one (same title approx, maybe same day/time)
                    // Since we can't easily filter by "Day of Week" in simple Supabase query without RPC,
                    // we will filter in memory (assuming not millions of records).
                    // Or simple heuristic: Same Title AND Same StartTime Time-portion? 
                    // Let's rely on Title + Instructor? Or just Title. 
                    // The user said "como el nombre se crea uno nuevo", implying they changed the name.
                    // We need to find events with the OLD name.

                    const { data: potentialMatches, error: searchError } = await supabase
                        .from('gym_classes')
                        .select('id, start_time')
                        .eq('title', eventToEdit.title) // Use OLD title to find siblings
                        .gte('start_time', eventToEdit.start_time) // From this event onwards (inclusive)

                    if (searchError) throw searchError

                    // 3. Filter matches strictly by Day of Week and Time
                    const idsToUpdate = potentialMatches.filter(ev => {
                        const d = new Date(ev.start_time)
                        // Check strictly same time (HH:MM) and same Day of Week
                        return d.getDay() === originalDay &&
                            d.toTimeString().slice(0, 5) === originalTime
                    }).map(ev => ev.id)

                    // 4. Update all
                    if (idsToUpdate.length > 0) {
                        const { error: updateError } = await supabase
                            .from("gym_classes")
                            .update({
                                title: data.title,
                                description: data.description,
                                instructor_id: data.instructorId || null,
                                // Note: We do NOT update start_time/end_time date part, only Time part if needed?
                                // Actually, if user changed time in form, we should update time for all?
                                // Updating time for recurrent events is tricky because we need to keep their respective DATES.
                                // For simplicity v1: Update Title, Description, Instructor ONLY. 
                                // Updating Time implies shifting all dates... too complex for now without more logic.
                            })
                            .in('id', idsToUpdate)

                        if (updateError) throw updateError
                        toast.success(`${idsToUpdate.length} clases actualizadas (título/desc/instructor)`)
                    }

                    // Special case: The specific event being edited might have had its Date/Time changed manually.
                    // The bulk update above might not correct the specific date change of THIS instance if we only updated generic fields.
                    // So we perform a specific update on THIS ID to ensure date/time is correct.
                    const { error: specificError } = await supabase
                        .from("gym_classes")
                        .update(updatePayload)
                        .eq('id', eventToEdit.id)

                    if (specificError) throw specificError

                } else {
                    // Single update
                    const { error } = await supabase
                        .from("gym_classes")
                        .update(updatePayload)
                        .eq('id', eventToEdit.id)

                    if (error) throw error
                    toast.success("Clase actualizada exitosamente")
                }

            } else {
                // Create Logic
                const weeks = data.recurrenceWeeks ? parseInt(data.recurrenceWeeks) : 1
                const eventsToCreate: any[] = []

                // Define all time slots to process (main form slot + additional slots)
                const allTimeSlots = [
                    { startTime: data.startTime, endTime: data.endTime },
                    ...additionalSlots.filter(s => s.startTime && s.endTime) // Filter out incomplete slots
                ]

                // Base date
                let currentDate = new Date(`${data.date}T00:00:00`)

                for (let i = 0; i < weeks; i++) {
                    const eventDateStr = currentDate.toISOString().split('T')[0]

                    // Create an event for EACH time slot for THIS day
                    allTimeSlots.forEach(slot => {
                        const startDateTime = new Date(`${eventDateStr}T${slot.startTime}`)
                        const endDateTime = new Date(`${eventDateStr}T${slot.endTime}`)

                        eventsToCreate.push({
                            title: data.title,
                            description: data.description,
                            start_time: startDateTime.toISOString(),
                            end_time: endDateTime.toISOString(),
                            instructor_id: data.instructorId || null,
                        })
                    })

                    currentDate.setDate(currentDate.getDate() + 7)
                }

                const { error } = await supabase.from("gym_classes").insert(eventsToCreate)
                if (error) throw error

                // Calculate total count properly
                const totalEvents = weeks * allTimeSlots.length
                toast.success(`Se crearon ${totalEvents} clase(s) exitosamente`)
            }

            setOpen(false)
            reset()
            setAdditionalSlots([]) // Clear extra slots
            onSuccess?.()
        } catch (error) {
            console.error(error)
            toast.error(eventToEdit ? "Error al actualizar la clase" : "Error al crear la(s) clase(s)")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{eventToEdit ? "Editar Clase" : "Nueva Clase"}</DialogTitle>
                    <DialogDescription>
                        {eventToEdit ? "Modifica los detalles de la clase existente." : "Crea un nuevo evento o clase para el gimnasio."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="max-h-[60vh] overflow-y-auto px-1 pr-2 space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Título</Label>
                            <Controller
                                control={control}
                                name="title"
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Input id="title" placeholder="Ej. Zumba" {...field} />
                                        <div className="flex flex-wrap gap-2">
                                            {PREDEFINED_ACTIVITIES.map((activity) => (
                                                <div
                                                    key={activity}
                                                    className="text-xs border rounded-full px-2 py-1 cursor-pointer hover:bg-muted transition-colors text-muted-foreground"
                                                    onClick={() => setValue("title", activity)}
                                                >
                                                    {activity}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="date">Fecha</Label>
                            <Controller
                                control={control}
                                name="date"
                                render={({ field }) => (
                                    <Input id="date" type="date" {...field} />
                                )}
                            />
                            {errors.date && (
                                <p className="text-sm text-destructive">{errors.date.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime">Inicio</Label>
                                <Controller
                                    control={control}
                                    name="startTime"
                                    render={({ field }) => (
                                        <Input id="startTime" type="time" {...field} />
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime">Fin</Label>
                                <Controller
                                    control={control}
                                    name="endTime"
                                    render={({ field }) => (
                                        <Input id="endTime" type="time" {...field} />
                                    )}
                                />
                            </div>
                        </div>

                        {!eventToEdit && (
                            <div className="space-y-3">
                                {additionalSlots.map((slot, index) => (
                                    <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-4 items-end bg-muted/20 p-2 rounded-md border">
                                        <div className="grid gap-2">
                                            <Label className="text-xs text-muted-foreground">Inicio (Extra)</Label>
                                            <Input
                                                type="time"
                                                value={slot.startTime}
                                                onChange={(e) => {
                                                    const newSlots = [...additionalSlots]
                                                    newSlots[index].startTime = e.target.value
                                                    setAdditionalSlots(newSlots)
                                                }}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs text-muted-foreground">Fin (Extra)</Label>
                                            <Input
                                                type="time"
                                                value={slot.endTime}
                                                onChange={(e) => {
                                                    const newSlots = [...additionalSlots]
                                                    newSlots[index].endTime = e.target.value
                                                    setAdditionalSlots(newSlots)
                                                }}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive h-10 w-10 hover:bg-destructive/10"
                                            onClick={() => {
                                                const newSlots = additionalSlots.filter((_, i) => i !== index)
                                                setAdditionalSlots(newSlots)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full dashed border-dashed text-muted-foreground hover:text-foreground"
                                    onClick={() => setAdditionalSlots([...additionalSlots, { startTime: "", endTime: "" }])}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Agregar otro horario
                                </Button>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="instructor">Instructor</Label>
                            <Controller
                                control={control}
                                name="instructorId"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar instructor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {instructors.map((instructor) => (
                                                <SelectItem key={instructor.id} value={instructor.id}>
                                                    {instructor.full_name || "Sin nombre"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Controller
                                control={control}
                                name="description"
                                render={({ field }) => (
                                    <Textarea
                                        id="description"
                                        placeholder="Detalles de la clase..."
                                        {...field}
                                    />
                                )}
                            />
                        </div>

                        {eventToEdit ? (
                            <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20">
                                <Controller
                                    control={control}
                                    name="updateFutureEvents"
                                    render={({ field }) => (
                                        <Checkbox
                                            id="updateFuture"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <Label htmlFor="updateFuture" className="cursor-pointer text-sm font-normal">
                                    Aplicar cambios a todas las clases futuras de este tipo (mismo día y hora)
                                </Label>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="recurrence">Repetir semanalmente</Label>
                                <Controller
                                    control={control}
                                    name="recurrenceWeeks"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="No repetir (Solo una vez)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">No repetir (Solo una vez)</SelectItem>
                                                <SelectItem value="4">Por 1 mes (4 semanas)</SelectItem>
                                                <SelectItem value="8">Por 2 meses (8 semanas)</SelectItem>
                                                <SelectItem value="12">Por 3 meses (12 semanas)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <p className="text-[0.8rem] text-muted-foreground leading-tight">
                                    Se crearán copias de este evento y sus horarios extra el mismo día de la semana.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? "Guardando..." : (eventToEdit ? "Actualizar Clase" : "Guardar Clase")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
