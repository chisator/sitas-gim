'use server'

import { createClient } from "@/lib/server"
import { revalidatePath } from "next/cache"

// Helper to check and renew credits
async function checkAndRenewCredits(userId: string, supabase: any) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('reservation_credits, plan_credits, expiring_credits, last_renewal_date, last_expiration_date')
            .eq('id', userId)
            .single()

        if (error || !profile) return

        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthSixth = new Date(now.getFullYear(), now.getMonth(), 6)

        let updates: any = {}
        let newCredits = profile.reservation_credits
        let newExpiring = profile.expiring_credits

        // 1. Renewal Logic (1st of Month)
        const lastRenewal = new Date(profile.last_renewal_date || '2000-01-01')
        if (lastRenewal < currentMonthStart && profile.plan_credits > 0) {
            // It's a new month, and we haven't renewed yet.
            // Move current credits to expiring (if they fit logic, or just add new ones?)
            // The requirement: "1st of month accredit X more. 6th of month expire old ones."

            // Logic:
            // Old credits becoming expiring? Or do we track them separately?
            // Simplest interpretation:
            // On 1st: Add Plan Credits.
            // Note: We need to know which credits are "old".
            // Let's say accurate way:
            // On renewal, the *current* balance becomes "expiring candidates".
            // But wait, if I have 4, get 4 more. Total 8.
            // On 6th, I should lose the initial 4 (if unused).

            // So:
            // newly_expiring = current_balance
            // new_balance = current_balance + plan_credits
            // expiring_credits = newly_expiring

            newExpiring = newCredits // All current credits are now "old"
            newCredits = newCredits + profile.plan_credits

            updates.last_renewal_date = now.toISOString()
            updates.reservation_credits = newCredits
            updates.expiring_credits = newExpiring
        }

        // 2. Expiration Logic (6th of Month)
        const lastExpiration = new Date(profile.last_expiration_date || '2000-01-01')
        // Only expire if we are past the 6th AND we haven't expirated for this month yet.
        // AND the renewal for this month must have happened (implicit usually, but good to check).
        if (now >= currentMonthSixth && lastExpiration < currentMonthStart && updates.expiring_credits === undefined) {
            // We check updates.expiring_credits === undefined to ensure we don't expire immediately after renewal in the same transaction simulation
            // although with lazy evaluation, this might happen sequentially.

            // If we have expiring credits, remove them.
            if (newExpiring > 0) {
                // We need to deduct `newExpiring` from `newCredits`.
                // But we might have used some! 
                // Since standard usage prefers "expiring" credits first (FIFO), 
                // `expiring_credits` should track *remaining* expiring credits.

                // So, simply remove whatever is left in `expiring_credits`.
                newCredits = Math.max(0, newCredits - newExpiring)
                newExpiring = 0

                updates.last_expiration_date = now.toISOString()
                updates.reservation_credits = newCredits
                updates.expiring_credits = 0
            } else {
                // Just update date if nothing to expire
                updates.last_expiration_date = now.toISOString()
            }
        }

        if (Object.keys(updates).length > 0) {
            await supabase.from('profiles').update(updates).eq('id', userId)
        }

    } catch (e) {
        console.error("Error in auto-renewal:", e)
    }
}

export async function reserveClass(classId: string, userId: string) {
    const supabase = await createClient()

    try {
        // Run auto-renewal/expiration check first
        await checkAndRenewCredits(userId, supabase)

        // 1. Get user profile and check credits
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('reservation_credits, expiring_credits')
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

        // Credit Deduction Logic: Use expiring first
        let newCredits = profile.reservation_credits - 1
        let newExpiring = profile.expiring_credits
        if (newExpiring > 0) {
            newExpiring = newExpiring - 1
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                reservation_credits: newCredits,
                expiring_credits: newExpiring
            })
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
        // Run auto-renewal check
        await checkAndRenewCredits(userId, supabase)

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
            .select('reservation_credits, expiring_credits')
            .eq('id', userId)
            .single()

        if (profile) {
            // Refund logic: Add back to expiring if feasible? 
            // Simplifying: Just add to general credits. 
            // Ideally we'd know if the credit used was expiring, but that's complex state tracking.
            // Assumption: Refunded credits become "fresh" (or at least non-expiring for simplicity in this MVP).
            // OR consistent: Increase general credits. Only increase expiring if we are BEFORE the 6th? 
            // Let's just increase `reservation_credits` to be safe and generous.

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

    // Check renewal on read too, so UI is accurate
    await checkAndRenewCredits(userId, supabase)

    const { data, error } = await supabase
        .from('reservations')
        .select('class_id')
        .eq('user_id', userId)

    if (error) return []
    return data.map(r => r.class_id)
}
