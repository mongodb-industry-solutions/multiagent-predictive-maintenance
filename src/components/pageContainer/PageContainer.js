import { H1, Body, Description } from "@leafygreen-ui/typography";
import StoryStepper from "@/components/storyStepper/StoryStepper";

export default function PageContainer({
  eyebrow,
  title,
  description,
  activeStageId,
  showStepper = true,
  actions,
  children,
}) {
  return (
    <main className="w-full pb-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-2 py-6 sm:px-4 lg:px-6">
        <header className="relative overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white px-6 py-8 shadow-sm sm:px-8">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#E3FCF7]"
          />
          <div className="relative max-w-4xl">
            {eyebrow && (
              <Body
                as="p"
                weight="medium"
                className="mb-3 uppercase tracking-[0.16em] text-[#00684A]"
              >
                {eyebrow}
              </Body>
            )}
            <H1 className="text-balance text-[#112733]">{title}</H1>
            {description && (
              <Description className="mt-3 max-w-3xl text-base leading-7 text-[#3D4F58]">
                {description}
              </Description>
            )}
            {actions && (
              <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
            )}
          </div>
        </header>

        {showStepper && <StoryStepper activeStageId={activeStageId} />}

        <div className="flex w-full flex-col gap-8">{children}</div>
      </div>
    </main>
  );
}
