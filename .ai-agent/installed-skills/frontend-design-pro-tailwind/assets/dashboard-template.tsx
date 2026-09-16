import { ArrowUpRight } from "lucide-react"
import { Badge, Button, Card, PageHeader } from "./primitives"
import { ForwardChevron } from "./directional-icons"

const stats = [
  { label: "Total requests", value: "24,892", change: "+12.4%" },
  { label: "Approved", value: "18,320", change: "+8.1%" },
  { label: "Pending", value: "1,204", change: "-2.3%" },
  { label: "SLA compliance", value: "98.2%", change: "+1.2%" },
]

export function ProfessionalDashboard() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Operations Dashboard"
          description="Monitor service performance, approvals, and operational activity from one official view."
          actions={
            <Button>
              <span>View report</span>
              <ForwardChevron className="ms-1" />
            </Button>
          }
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <Badge>{stat.change}</Badge>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
                <ArrowUpRight className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Recent activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">Latest updates and review decisions.</p>
              </div>
              <Button variant="outline" size="sm">Export</Button>
            </div>
            <div className="mt-6 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-medium">Application review #{index + 1204}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Updated by review team</p>
                  </div>
                  <Badge>Completed</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold">Next actions</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Prioritized work items that need attention.</p>
            <div className="mt-5 grid gap-3">
              {['Review pending requests', 'Validate documents', 'Resolve SLA exceptions'].map((item) => (
                <button
                  key={item}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-start text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>{item}</span>
                  <ForwardChevron className="ms-3" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  )
}
