"use client"

import Link from "next/link"


import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { Logo } from "@/components/logo"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"

interface MobileMenuProps {
    role?: string
}

export function MobileMenu({ role }: MobileMenuProps) {
    const [open, setOpen] = useState(false)
    const [activityCredits, setActivityCredits] = useState<Record<string, number>>({})
    const [expiringCredits, setExpiringCredits] = useState<Record<string, number>>({})
    const supabase = createClient()

    useEffect(() => {
        const handleSync = (e: any) => {
            if (e.detail?.activityCredits) setActivityCredits(e.detail.activityCredits)
            if (e.detail?.expiringCredits) setExpiringCredits(e.detail.expiringCredits)
        }
        window.addEventListener('syncTickets', handleSync)
        return () => window.removeEventListener('syncTickets', handleSync)
    }, [])

    useEffect(() => {
        if (open && role === "deportista") {
            const fetchCredits = async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('activity_credits, expiring_activity_credits').eq('id', user.id).single()
                    if (profile) {
                        setActivityCredits(profile.activity_credits || {})
                        setExpiringCredits(profile.expiring_activity_credits || {})
                    }
                }
            }
            fetchCredits()
        }
    }, [open, role, supabase])

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Abrir menú</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="flex flex-col items-center mb-6">
                    <Logo size={100} />
                    <SheetTitle className="mt-4">Menú</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-4">
                    <Separator />

                    {role === "deportista" && (
                        <>
                            <div className="flex flex-col gap-2 mb-2 p-3 bg-secondary/50 rounded-lg">
                                <h4 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mb-1">Mis Tickets de Clase</h4>
                                {Object.keys(activityCredits).length > 0 ? Object.keys(activityCredits).map(activity => {
                                    const c = activityCredits[activity] || 0
                                    const e = expiringCredits[activity] || 0
                                    const total = c + e
                                    if (total <= 0) return null
                                    return (
                                        <div key={activity} className="flex justify-between items-center text-sm">
                                            <span>{activity}</span>
                                            <div className="flex items-center gap-2">
                                                {e > 0 && <span className="text-[10px] text-orange-500 font-bold px-1.5 py-0.5 bg-orange-500/10 rounded-sm">{e} por vencer</span>}
                                                <span className="font-bold text-base">{total}</span>
                                            </div>
                                        </div>
                                    )
                                }) : <p className="text-xs text-muted-foreground">Cargando billetes...</p>}
                            </div>
                            <Separator className="mb-2" />

                            <Button asChild variant="ghost" className="w-full justify-start">
                                <Link href="/deportista/registros" onClick={() => setOpen(false)}>
                                    Registros
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start">
                                <Link href="/deportista/progreso" onClick={() => setOpen(false)}>
                                    Progreso
                                </Link>
                            </Button>
                        </>
                    )}

                    {(role === "entrenador" || role === "administrador") && (
                        <>
                            <Button asChild variant="ghost" className="w-full justify-start">
                                <Link href="/admin/ejercicios" onClick={() => setOpen(false)}>
                                    Catálogo de Ejercicios
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start">
                                <Link href="/admin/eventos" onClick={() => setOpen(false)}>
                                    Clases y Eventos
                                </Link>
                            </Button>
                        </>
                    )}


                    <div className="mt-auto pt-4 p-2">
                        <LogoutButton className="w-full justify-center" />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
