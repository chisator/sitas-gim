"use client"

import type React from "react"

import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"

import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // Obtener el rol del usuario
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        // Redirigir según el rol
        if (profile?.role === "deportista") {
          router.push("/deportista")
        } else if (profile?.role === "entrenador") {
          router.push("/entrenador")
        } else if (profile?.role === "administrador") {
          router.push("/admin")
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md relative bottom-20">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            {/* Logo eliminado por rebranding */}
            {/* Logo principal */}
            <Logo size={200} />
            {/*
            <div className="relative w-72 h-72 mr-2 top-20">
              <Image src="/logo.png" alt="SITAS FITNESS" fill className="object-contain" priority />
            </div>
            */}
            <p className="text-muted-foreground z-10">Sistema de gestión de entrenamientos</p>
          </div>
          <Card className="z-20">
            <CardHeader>
              <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
              <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export function Logo({ size = 250 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow rosa */}
        <filter id="glowPink" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="10" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Glow celeste */}
        <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="10" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Animaciones */}
        <style>{`
          .startup {
            animation: startup 2s ease-out forwards, flicker 3.5s infinite 2s;
          }

          .startup-slow {
            animation: startup 3.5s ease-out forwards, flicker 4s infinite 2.5s;
          }

          @keyframes startup {
            0%   { opacity: 0; }
            5%   { opacity: 1; }
            10%  { opacity: 0.2; }
            15%  { opacity: 1; }
            20%  { opacity: 0.3; }
            25%  { opacity: 1; }
            100% { opacity: 1; }
          }

          @keyframes flicker {
            0% { opacity: 1; }
            3% { opacity: 0.4; }
            6% { opacity: 1; }
            7% { opacity: 0.2; }
            10% { opacity: 1; }
            100% { opacity: 1; }
          }
        `}</style>
      </defs>

      {/* Fondo */}
      <circle cx="200" cy="200" r="150" fill="#050505" />

      {/* SITAS */}
      <text
        x="40"
        y="155"
        fontSize="30"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fill="#ff4fa3"
        filter="url(#glowPink)"
        transform="rotate(-18 100 125)"
        className="startup"
      >
        SITAS
      </text>

      {/* FITNESS */}
      <text
        x="85"
        y="215"
        fontSize="54"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fill="#5ff2e8"
        filter="url(#glowCyan)"
        className="startup-slow"
      >
        FITNESS
      </text>

      {/* CENTER */}
      <text
        x="95"
        y="275"
        fontSize="54"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fill="#5ff2e8"
        filter="url(#glowCyan)"
        className="startup-slow"
      >
        CENTER
      </text>
    </svg>
  );
}




