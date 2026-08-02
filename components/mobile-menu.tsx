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
    const [creditsLoaded, setCreditsLoaded] = useState(false)
    const supabase = createClient()

    // Hay que mirar los dos bolsillos: del 1 al 5 activity_credits queda vacío
    const allCreditActivities = Array.from(
        new Set([...Object.keys(activityCredits), ...Object.keys(expiringCredits)])
    ).sort((a, b) => a.localeCompare(b))

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
                setCreditsLoaded(true)
            }
            fetchCredits()
        }
    }, [open, role, supabase])

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <div className="flex flex-col items-center justify-center w-full h-full space-y-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <Menu className="h-5 w-5" />
                    <span className="font-medium">Más</span>
                </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="w-full rounded-t-xl px-4 pb-6 pt-2">
                <div className="mx-auto mt-2 mb-6 h-1.5 w-12 rounded-full bg-muted" />
                <SheetHeader className="flex flex-col items-center mb-6">
                    <Logo size={100} />
                    <SheetTitle className="mt-2 sr-only">Menú</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-4">
                    <Separator />

                    {role === "deportista" && (
                        <>
                            <div className="flex flex-col gap-2 mb-2 p-3 bg-secondary/50 rounded-lg">
                                <h4 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mb-1">Mis Tickets de Clase</h4>
                                {allCreditActivities.length > 0 ? allCreditActivities.map(activity => {
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
                                }) : creditsLoaded
                                    ? <p className="text-xs text-muted-foreground">Todavía no tenés tickets asignados. Pedilos en administración.</p>
                                    : <p className="text-xs text-muted-foreground">Cargando tickets...</p>}
                            </div>
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
