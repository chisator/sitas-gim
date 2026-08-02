"use server"

import { mensajeUsuario } from "@/lib/db-errors"
import { createClient as createServerClient } from "@/lib/server"
import { revalidatePath } from "next/cache"

export async function getWorkoutLogs(routineId: string) {
    const supabase = await createServerClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: "No autenticado" }
    }

    try {
        const { data, error } = await supabase
            .from("workout_logs")
            .select("*")
            .eq("routine_id", routineId)
            .eq("user_id", user.id)
            .order("date", { ascending: false })

        if (error) throw error

        return { data }
    } catch (error: any) {
        return { error: mensajeUsuario(error) }
    }
}

export async function getWorkoutLog(logId: string) {
    const supabase = await createServerClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: "No autenticado" }
    }

    try {
        const { data, error } = await supabase
            .from("workout_logs")
            .select(`
        *,
        entries:workout_log_entries(*)
      `)
            .eq("id", logId)
            .eq("user_id", user.id)
            .single()

        if (error) throw error

        // Ordenar entradas por el campo 'order'
        if (data && data.entries) {
            data.entries.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        }

        return { data }
    } catch (error: any) {
        return { error: mensajeUsuario(error) }
    }
}

export async function createWorkoutLog(data: {
    routineId: string
    date: string
    notes?: string
    entries: {
        exercise_name: string
        sets_data: any[]
        notes?: string
        order: number
    }[]
}) {
    const supabase = await createServerClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: "No autenticado" }
    }

    try {
        // 1. Crear el log
        const { data: log, error: logError } = await supabase
            .from("workout_logs")
            .insert({
                user_id: user.id,
                routine_id: data.routineId,
                date: `${data.date}T12:00:00Z`,

                notes: data.notes,
            })
            .select()
            .single()

        if (logError) throw logError

        // 2. Crear las entradas
        if (data.entries && data.entries.length > 0) {
            const entriesToInsert = data.entries.map((entry) => ({
                workout_log_id: log.id,
                exercise_name: entry.exercise_name,
                sets_data: entry.sets_data,
                notes: entry.notes,
                order: entry.order,
            }))

            const { error: entriesError } = await supabase
                .from("workout_log_entries")
                .insert(entriesToInsert)

            if (entriesError) throw entriesError
        }

        revalidatePath(`/deportista/registros/${data.routineId}`)
        return { success: true, logId: log.id }
    } catch (error: any) {
        return { error: mensajeUsuario(error) }
    }
}

export async function updateWorkoutLog(
    logId: string,
    data: {
        date?: string
        notes?: string
        entries?: {
            id?: string // Si tiene ID, actualizamos. Si no, creamos.
            exercise_name: string
            sets_data: any[]
            notes?: string
            order: number
        }[]
    }
) {
    const supabase = await createServerClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: "No autenticado" }
    }

    try {
        // 1. Actualizar el log principal.
        // La fecha solo se toca si vino: antes se escribía siempre y una llamada
        // con solo `notes` grababa la cadena "undefinedT12:00:00Z".
        if (data.date || data.notes !== undefined) {
            const logUpdate: Record<string, unknown> = {}
            if (data.date) logUpdate.date = `${data.date}T12:00:00Z`
            if (data.notes !== undefined) logUpdate.notes = data.notes

            const { error: updateError } = await supabase
                .from("workout_logs")
                .update(logUpdate)
                .eq("id", logId)
                .eq("user_id", user.id)

            if (updateError) throw updateError
        }

        // 2. Manejar entradas (Upsert/Delete logic could be complex, implementing simple replacement strategy for simplicity or individual upserts)
        // Estrategia: Upsert para los que tienen ID o nuevos, y podríamos necesitar lógica para borrar los que se quitaron si la UI lo permite.
        // Para simplificar: La UI enviará todas las entradas actuales. 
        // Lo ideal sería borrar las que no están en la lista, pero por seguridad, haremos upserts.

        // Ninguna de estas escrituras miraba su error, así que la función
        // devolvía éxito y la pantalla decía "Registro actualizado" aunque no
        // se hubiera guardado nada.
        if (data.entries) {
            const toUpdate = data.entries.filter((e) => e.id)
            const toInsert = data.entries.filter((e) => !e.id)

            for (const entry of toUpdate) {
                const { error: entryError } = await supabase
                    .from("workout_log_entries")
                    .update({
                        sets_data: entry.sets_data,
                        notes: entry.notes,
                    })
                    .eq("id", entry.id!)
                    .eq("workout_log_id", logId)

                if (entryError) throw entryError
            }

            if (toInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from("workout_log_entries")
                    .insert(toInsert.map((entry) => ({
                        workout_log_id: logId,
                        exercise_name: entry.exercise_name,
                        sets_data: entry.sets_data,
                        notes: entry.notes,
                        order: entry.order
                    })))

                if (insertError) throw insertError
            }
        }

        revalidatePath(`/deportista/registros`)
        // Better validation path handling might be needed depending on where we redirect

        return { success: true }
    } catch (error: any) {
        return { error: mensajeUsuario(error) }
    }
}
