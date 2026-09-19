import { Reveal } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Reveal className="section-heading max-w-2xl">
      {eyebrow ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-gold-500">
          {eyebrow}
        </p>
      ) : null}
      <Heading className="section-title">{title}</Heading>
      {subtitle ? <p className="section-sub">{subtitle}</p> : null}
    </Reveal>
  );
}
