import Card from "@leafygreen-ui/card";
import Icon from "@leafygreen-ui/icon";
import { H3, Body, Description } from "@leafygreen-ui/typography";

export default function PlaceholderPanel({
  eyebrow = "Concept preview",
  title,
  description,
  glyph,
  highlights = [],
  children,
  footer,
  className = "",
}) {
  return (
    <Card
      className={`flex h-full flex-col rounded-2xl border border-[#D8E3DF] bg-white p-6 ${className}`}
    >
      <div className="mb-5 flex items-start gap-4">
        {glyph && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E3FCF7] text-[#00684A]">
            <Icon glyph={glyph} size={24} />
          </span>
        )}
        <div className="min-w-0">
          <Body
            as="p"
            weight="medium"
            className="mb-1 uppercase tracking-[0.12em] text-[#00684A]"
          >
            {eyebrow}
          </Body>
          <H3 className="text-[#112733]">{title}</H3>
          {description && (
            <Description className="mt-2 leading-6 text-[#3D4F58]">
              {description}
            </Description>
          )}
        </div>
      </div>

      {highlights.length > 0 && (
        <ul className="mb-5 grid gap-2">
          {highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00A35C]"
              />
              <Body className="text-[#3D4F58]">{highlight}</Body>
            </li>
          ))}
        </ul>
      )}

      {children && <div className="flex-1">{children}</div>}

      {footer && (
        <div className="mt-5 border-t border-gray-200 pt-4">{footer}</div>
      )}
    </Card>
  );
}
