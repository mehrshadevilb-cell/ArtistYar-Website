import { Button, Card, Input } from "./primitives"

export function ProfessionalForm() {
  return (
    <Card className="mx-auto w-full max-w-2xl p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Submit request</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Complete the required information to continue.</p>
      </div>

      <form className="mt-6 grid gap-5">
        <div className="grid gap-2">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">Full name</label>
          <Input id="fullName" name="fullName" autoComplete="name" placeholder="Enter full name" />
        </div>

        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email address</label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" />
          <p className="text-xs leading-5 text-muted-foreground">We will use this address for request updates.</p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="submit">Submit request</Button>
        </div>
      </form>
    </Card>
  )
}
