import { useState } from "react"
import { supabase } from "../lib/supabase"
import { Brand, Button } from "./ui"

export default function AuthScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  return (
    <main className="app-shell" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ marginBottom: 48 }}><Brand /></div>

        <p className="eyebrow">ENTRE FINANCE</p>
        <h1 style={{ marginBottom: 12 }}>As vossas finanças. Num só lugar.</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 28 }}>
          Introduz o teu email e palavra-passe para aceder.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="O teu endereço de email"
            style={{ width: "100%", padding: 14, marginTop: 8, marginBottom: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}
          />

          <label htmlFor="auth-password">Palavra-passe</label>
          <input
            id="auth-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="A tua palavra-passe"
            style={{ width: "100%", padding: 14, marginTop: 8, marginBottom: 20, border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}
          />

          <Button type="submit" disabled={loading}>
            {loading ? "A entrar..." : "Entrar"}
          </Button>
        </form>

        {error && <p style={{ color: "var(--danger)", marginTop: 18 }}>{error}</p>}
      </section>
    </main>
  )
}
