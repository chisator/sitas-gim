'use server'

import { createClient } from "@/lib/server"
import { revalidatePath } from "next/cache"

export async function reserveClass(classId: string, userId: string) {
    const supabase = await createClient()

    try {
        // 1. Get user profile and check credits
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('reservation_credits')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            return { error: "Usuario no encontrado" }
        }

        if (profile.reservation_credits < 1) {
            return { error: "No tienes créditos suficientes para reservar" }
        }

        // 2. Get class details to check date and past status
        const { data: classData, error: classError } = await supabase
            .from('gym_classes')
            .select('start_time')
            .eq('id', classId)
            .single()

        if (classError || !classData) {
            return { error: "Clase no encontrada" }
        }

        const classDate = new Date(classData.start_time)
        const now = new Date()

        if (classDate < now) {
            return { error: "No puedes reservar una clase que ya ha pasado" }
        }

        // 3. Check existing reservation
        const { data: existing } = await supabase
            .from('reservations')
            .select('id')
            .eq('user_id', userId)
            .eq('class_id', classId)
            .single()

        if (existing) {
            return { error: "Ya estás registrado en esta clase" }
        }

        // 4. Check daily limit (Max 2 per day)
        // We need to count reservations for this user on the same day as the target class
        const startOfDay = new Date(classDate)
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date(classDate)
        endOfDay.setHours(23, 59, 59, 999)

        const { count, error: countError } = await supabase
            .from('reservations')
            .select('gym_classes!inner(start_time)', { count: 'exact', head: true }) // head: true returns count only
            .eq('user_id', userId)
            .gte('gym_classes.start_time', startOfDay.toISOString())
            .lte('gym_classes.start_time', endOfDay.toISOString())

        if (countError) {
            console.error("Error checking limits:", countError)
            return { error: "Error al verificar límites de reserva" }
        }

        if (count !== null && count >= 2) {
            return { error: "No puedes reservar más de 2 clases por día" }
        }

        // 5. Create reservation and deduct credit
        const { error: insertError } = await supabase
            .from('reservations')
            .insert({
                user_id: userId,
                class_id: classId
            })

        if (insertError) {
            console.error("Error creating reservation:", insertError)
            return { error: "Error al crear la reserva" }
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ reservation_credits: profile.reservation_credits - 1 })
            .eq('id', userId)

        if (updateError) {
            // Rollback reservation if credit update fails
            await supabase.from('reservations').delete().eq('user_id', userId).eq('class_id', classId)
            return { error: "Error al actualizar créditos" }
        }

        revalidatePath('/deportista')
        return { success: true }

    } catch (error) {
        console.error("Unexpected error in reserveClass:", error)
        return { error: "Ocurrió un error inesperado" }
    }
}

export async function cancelReservation(classId: string, userId: string) {
    const supabase = await createClient()

    try {
        // 1. Check if reservation exists
        const { data: existing, error: reservationError } = await supabase
            .from('reservations')
            .select('id')
            .eq('user_id', userId)
            .eq('class_id', classId)
            .single()

        if (!existing) {
            return { error: "No tienes una reserva para esta clase" }
        }

        // 2. Delete reservation and refund credit
        const { error: deleteError } = await supabase
            .from('reservations')
            .delete()
            .eq('user_id', userId)
            .eq('class_id', classId)

        if (deleteError) {
            return { error: "Error al cancelar la reserva" }
        }

        // Get current credits to refund
        const { data: profile } = await supabase
            .from('profiles')
            .select('reservation_credits')
            .eq('id', userId)
            .single()

        if (profile) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ reservation_credits: profile.reservation_credits + 1 })
                .eq('id', userId)
        }

        revalidatePath('/deportista')
        return { success: true }

    } catch (error) {
        console.error("Unexpected error in cancelReservation:", error)
        return { error: "Ocurrió un error inesperado" }
    }
}


export async function getUserReservations(userId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('reservations')
        .select('class_id')
        .eq('user_id', userId)

    if (error) return []
    return data.map(r => r.class_id)
}
