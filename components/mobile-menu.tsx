"use client"

import Link from "next/link"


import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { Logo } from "@/components/logo"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

export function MobileMenu() {
    const [open, setOpen] = useState(false)

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

                    {/* Aquí irán los futuros botones de navegación */}
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


                    <div className="mt-auto pt-4 p-2">
                        <LogoutButton className="w-full justify-center" />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
