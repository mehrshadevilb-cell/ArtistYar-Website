import * as React from "react"
import { PageHeader } from "./primitives"

export function ProfessionalPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title={title} description={description} actions={actions} />
        <div className="mt-6 grid gap-6">{children}</div>
      </section>
    </main>
  )
}
