'use server'

import { createClient } from "@/lib/server"
import { createAdminClient } from "@/lib/admin"
import { revalidatePath } from "next/cache"

type Credits = Record<string, number>

/**
 * Devuelve el id del usuario autenticado. El userId que manda el cliente NO se
 * usa para decidir sobre qué perfil operar: una server action es un endpoint
 * HTTP público y cualquiera podría pasar el id de otra persona.
 */
async function getSessionUserId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
}

/**
 * Renovación y expiración mensual de tickets.
 *
 * Día 1: lo que hay en activity_credits pasa a "por vencer".
 * Día 6: lo que quedó "por vencer" se pierde.
 *
 * Ambas se evalúan en la MISMA pasada. Antes la expiración se salteaba cuando
 * en la misma llamada había corrido la renovación, así que a quien entraba por
 * primera vez después del día 6 los tickets le desaparecían recién en la
 * segunda recarga de la página.
 *
 * Escribe con service role: el usuario no debe poder tocar sus propios créditos.
 */
async function checkAndRenewCredits(userId: string) {
    try {
        const admin = createAdminClient()

        const { data: profile, error } = await admin
            .from('profiles')
            .select('activity_credits, expiring_activity_credits, last_renewal_date, last_expiration_date')
            .eq('id', userId)
            .single()

        if (error || !profile) return

        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthSixth = new Date(now.getFullYear(), now.getMonth(), 6)

        const updates: Record<string, unknown> = {}
        let currentCredits: Credits = profile.activity_credits || {}
        let expiringCredits: Credits = profile.expiring_activity_credits || {}

        // 1. Renovación (día 1): todo pasa al bolsillo de "por vencer"
        const lastRenewal = new Date(profile.last_renewal_date || '2000-01-01')
        if (lastRenewal < currentMonthStart) {
            expiringCredits = { ...currentCredits }
            currentCredits = {}

            updates.last_renewal_date = now.toISOString()
            updates.activity_credits = currentCredits
            updates.expiring_activity_credits = expiringCredits
        }

        // 2. Expiración (día 6): se pierde lo que quedó sin usar
        const lastExpiration = new Date(profile.last_expiration_date || '2000-01-01')
        if (now >= currentMonthSixth && lastExpiration < currentMonthStart) {
            expiringCredits = {}
            updates.last_expiration_date = now.toISOString()
            updates.expiring_activity_credits = expiringCredits
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await admin.from('profiles').update(updates).eq('id', userId)
            if (updateError) console.error("[creditos] No se pudo aplicar la renovación:", updateError.message)
        }
    } catch (e) {
        console.error("Error in auto-renewal:", e)
    }
}

/**
 * ¿Los tickets "por vencer" siguen vigentes? Determina a qué bolsillo se
 * devuelve un ticket al cancelar. Debe ser el inverso exacto del descuento
 * (que consume primero los que vencen); si no, cancelar y volver a reservar
 * convierte tickets por vencer en permanentes.
 */
function expiringWindowIsOpen(now = new Date()) {
    return now < new Date(now.getFullYear(), now.getMonth(), 6)
}

export async function reserveClass(classId: string, _userId?: string) {
    try {
        const userId = await getSessionUserId()
        if (!userId) return { error: "Tenés que iniciar sesión para reservar" }

        await checkAndRenewCredits(userId)

        // Los cupos y los créditos se leen y escriben con service role: RLS solo
        // deja ver las reservas propias, así que contar con el cliente del
        // usuario daba siempre 0 y el cupo nunca se aplicaba.
        const admin = createAdminClient()

        const { data: profile, error: profileError } = await admin
            .from('profiles')
            .select('activity_credits, expiring_activity_credits')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            return { error: "Usuario no encontrado" }
        }

        const { data: classData, error: classError } = await admin
            .from('gym_classes')
            .select('title, start_time, capacity, is_cancelled')
            .eq('id', classId)
            .single()

        if (classError || !classData) {
            return { error: "Clase no encontrada" }
        }

        if (classData.is_cancelled) {
            return { error: "Esta clase fue suspendida" }
        }

        const activityTitle = classData.title
        const currentCredits: Credits = profile.activity_credits || {}
        const expiringCredits: Credits = profile.expiring_activity_credits || {}

        const c = currentCredits[activityTitle] || 0
        const e = expiringCredits[activityTitle] || 0

        if (c <= 0 && e <= 0) {
            return { error: `No tienes tickets suficientes para ${activityTitle}` }
        }

        const classDate = new Date(classData.start_time)
        if (classDate < new Date()) {
            return { error: "No puedes reservar una clase que ya ha pasado" }
        }

        // Cupo
        const capacity = classData.capacity || 20

        const { count: enrolledCount, error: enrollError } = await admin
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)

        if (enrollError) {
            return { error: "Error al verificar cupos de la clase" }
        }

        if (enrolledCount !== null && enrolledCount >= capacity) {
            return { error: "La clase ya está llena. No quedan cupos disponibles." }
        }

        // Reserva duplicada
        const { data: existing } = await admin
            .from('reservations')
            .select('id')
            .eq('user_id', userId)
            .eq('class_id', classId)
            .maybeSingle()

        if (existing) {
            return { error: "Ya estás registrado en esta clase" }
        }

        // Límite de 2 por día. La ventana se calcula sobre el día calendario
        // argentino de la clase, no sobre el día UTC del servidor.
        const { startUtc, endUtc } = argentineDayBounds(classDate)

        const { count, error: countError } = await admin
            .from('reservations')
            .select('gym_classes!inner(start_time)', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('gym_classes.start_time', startUtc)
            .lte('gym_classes.start_time', endUtc)

        if (countError) {
            console.error("Error checking limits:", countError)
            return { error: "Error al verificar límites de reserva" }
        }

        if (count !== null && count >= 2) {
            return { error: "No puedes reservar más de 2 clases por día" }
        }

        const { error: insertError } = await admin
            .from('reservations')
            .insert({ user_id: userId, class_id: classId })

        if (insertError) {
            console.error("Error creating reservation:", insertError)
            return { error: "Error al crear la reserva" }
        }

        // Se consumen primero los que vencen
        if (e > 0) {
            expiringCredits[activityTitle] = e - 1
        } else {
            currentCredits[activityTitle] = c - 1
        }

        const { error: updateError } = await admin
            .from('profiles')
            .update({
                activity_credits: currentCredits,
                expiring_activity_credits: expiringCredits
            })
            .eq('id', userId)

        if (updateError) {
            await admin.from('reservations').delete().eq('user_id', userId).eq('class_id', classId)
            return { error: "Error al descontar el ticket del perfil" }
        }

        revalidatePath('/deportista')
        return { success: true }

    } catch (error) {
        console.error("Unexpected error in reserveClass:", error)
        return { error: "Ocurrió un error inesperado" }
    }
}

export async function cancelReservation(classId: string, _userId?: string) {
    try {
        const userId = await getSessionUserId()
        if (!userId) return { error: "Tenés que iniciar sesión" }

        await checkAndRenewCredits(userId)

        const admin = createAdminClient()

        const { data: existing } = await admin
            .from('reservations')
            .select('id')
            .eq('user_id', userId)
            .eq('class_id', classId)
            .maybeSingle()

        if (!existing) {
            return { error: "No tienes una reserva para esta clase" }
        }

        const { data: profile } = await admin
            .from('profiles')
            .select('activity_credits, expiring_activity_credits')
            .eq('id', userId)
            .single()

        const { data: classData } = await admin
            .from('gym_classes')
            .select('title')
            .eq('id', classId)
            .single()

        if (!profile || !classData) {
            return { error: "No pudimos recuperar los datos de la reserva" }
        }

        const { error: deleteError } = await admin
            .from('reservations')
            .delete()
            .eq('user_id', userId)
            .eq('class_id', classId)

        if (deleteError) {
            return { error: "Error al cancelar la reserva" }
        }

        const currentCredits: Credits = profile.activity_credits || {}
        const expiringCredits: Credits = profile.expiring_activity_credits || {}
        const title = classData.title

        if (expiringWindowIsOpen()) {
            expiringCredits[title] = (expiringCredits[title] || 0) + 1
        } else {
            currentCredits[title] = (currentCredits[title] || 0) + 1
        }

        const { error: updateError } = await admin
            .from('profiles')
            .update({
                activity_credits: currentCredits,
                expiring_activity_credits: expiringCredits
            })
            .eq('id', userId)

        if (updateError) {
            // No se pudo devolver el ticket: se repone la reserva para que el
            // socio no quede sin la clase Y sin el ticket.
            await admin.from('reservations').insert({ user_id: userId, class_id: classId })
            return { error: "No pudimos devolverte el ticket. La reserva sigue activa." }
        }

        revalidatePath('/deportista')
        return { success: true }

    } catch (error) {
        console.error("Unexpected error in cancelReservation:", error)
        return { error: "Ocurrió un error inesperado" }
    }
}

export async function getUserReservations(_userId?: string) {
    const userId = await getSessionUserId()
    if (!userId) return []

    await checkAndRenewCredits(userId)

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('reservations')
        .select('class_id')
        .eq('user_id', userId)

    if (error) return []
    return data.map(r => r.class_id)
}

/**
 * Cuántos inscriptos tiene cada clase. Necesita service role porque RLS solo
 * deja ver las reservas propias: sin esto el deportista veía siempre 0.
 */
export async function getClassOccupancy(classIds: string[]) {
    if (classIds.length === 0) return {}

    const userId = await getSessionUserId()
    if (!userId) return {}

    const admin = createAdminClient()
    const counts: Record<string, number> = {}

    // Se consulta de a 100 para no armar una URL demasiado larga.
    for (let i = 0; i < classIds.length; i += 100) {
        const chunk = classIds.slice(i, i + 100)
        const { data, error } = await admin
            .from('reservations')
            .select('class_id')
            .in('class_id', chunk)

        if (error) {
            console.error("[reservas] No se pudo contar inscriptos:", error.message)
            continue
        }

        for (const row of data || []) {
            counts[row.class_id] = (counts[row.class_id] || 0) + 1
        }
    }

    return counts
}

/**
 * Devuelve los tickets de las reservas de una clase y las elimina.
 * Se usa al suspender o borrar una clase: antes las reservas se borraban en
 * cascada y los socios perdían el ticket sin aviso.
 */
export async function refundReservationsForClasses(classIds: string[]) {
    if (classIds.length === 0) return { success: true, refunded: 0 }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role

    if (!user || (role !== "administrador" && role !== "entrenador")) {
        return { error: "No tenés permisos para hacer esto" }
    }

    const admin = createAdminClient()

    const { data: classes, error: classesError } = await admin
        .from('gym_classes')
        .select('id, title')
        .in('id', classIds)

    if (classesError) return { error: classesError.message }

    const titleByClassId = new Map((classes || []).map(c => [c.id, c.title]))

    const { data: reservations, error: reservationsError } = await admin
        .from('reservations')
        .select('id, user_id, class_id')
        .in('class_id', classIds)

    if (reservationsError) return { error: reservationsError.message }
    if (!reservations || reservations.length === 0) return { success: true, refunded: 0 }

    // Se agrupa por usuario para hacer una sola escritura por perfil
    const perUser = new Map<string, string[]>()
    for (const r of reservations) {
        const title = titleByClassId.get(r.class_id)
        if (!title) continue
        const list = perUser.get(r.user_id) || []
        list.push(title)
        perUser.set(r.user_id, list)
    }

    const backToExpiring = expiringWindowIsOpen()
    let refunded = 0

    for (const [userId, titles] of perUser) {
        const { data: profile } = await admin
            .from('profiles')
            .select('activity_credits, expiring_activity_credits')
            .eq('id', userId)
            .single()

        if (!profile) continue

        const currentCredits: Credits = profile.activity_credits || {}
        const expiringCredits: Credits = profile.expiring_activity_credits || {}

        for (const title of titles) {
            if (backToExpiring) expiringCredits[title] = (expiringCredits[title] || 0) + 1
            else currentCredits[title] = (currentCredits[title] || 0) + 1
        }

        const { error: updateError } = await admin
            .from('profiles')
            .update({
                activity_credits: currentCredits,
                expiring_activity_credits: expiringCredits
            })
            .eq('id', userId)

        if (updateError) {
            console.error(`[creditos] No se pudo devolver el ticket a ${userId}:`, updateError.message)
            continue
        }

        refunded += titles.length
    }

    const { error: deleteError } = await admin
        .from('reservations')
        .delete()
        .in('class_id', classIds)

    if (deleteError) return { error: deleteError.message }

    revalidatePath('/deportista')
    return { success: true, refunded }
}

/**
 * Inicio y fin del día calendario argentino (UTC-3) que contiene `date`,
 * expresados en UTC. El servidor corre en UTC, así que usar setHours() daba
 * una ventana corrida tres horas.
 */
function argentineDayBounds(date: Date) {
    const AR_OFFSET_MS = 3 * 60 * 60 * 1000
    const arDate = new Date(date.getTime() - AR_OFFSET_MS)
    const y = arDate.getUTCFullYear()
    const m = arDate.getUTCMonth()
    const d = arDate.getUTCDate()

    const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) + AR_OFFSET_MS)
    const endUtc = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) + AR_OFFSET_MS)

    return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() }
}
