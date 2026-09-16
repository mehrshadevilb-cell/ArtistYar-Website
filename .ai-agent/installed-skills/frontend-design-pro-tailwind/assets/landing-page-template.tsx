import { ShieldCheck } from "lucide-react"
import { Button, Card } from "./primitives"
import { ForwardChevron } from "./directional-icons"

export function ProfessionalLandingPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted-foreground shadow-sm">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span>Official digital services platform</span>
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Build trusted digital services with clarity and confidence.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            A professional interface system for teams that need accessible, reliable, and multilingual user experiences.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg">
              <span>Get started</span>
              <ForwardChevron className="ms-1" />
            </Button>
            <Button variant="outline" size="lg">View documentation</Button>
          </div>
        </div>

        <Card className="p-4 sm:p-6">
          <div className="rounded-lg border border-border bg-muted p-4">
            <div className="grid gap-3">
              {['Service availability', 'Request processing', 'Compliance checks'].map((item, index) => (
                <div key={item} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium">{item}</p>
                    <span className="text-sm font-semibold text-primary">{96 + index}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${96 + index}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </main>
  )
}
