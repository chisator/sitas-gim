import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { getUniqueExercises } from "@/app/actions/progress-actions"
import { ProgressPageClient } from "@/components/progress-page-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function ProgressPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    // Get list of exercises
    const exercises = await getUniqueExercises()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild className="p-0 hover:bg-transparent -ml-2">
                        <Link href="/deportista" className="flex items-center gap-2">
                            <ChevronLeft className="h-5 w-5" />
                            <span>Volver al inicio</span>
                        </Link>
                    </Button>
                </div>

                <div>
                    <h1 className="text-3xl font-bold">Tu Progreso</h1>
                    <p className="text-muted-foreground">Visualiza cómo has mejorado en tus ejercicios.</p>
                </div>

                <ProgressPageClient exercises={exercises} />
            </div>
        </div>
    )
}
