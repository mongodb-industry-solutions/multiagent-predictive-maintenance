import Link from "next/link";
import Icon from "@leafygreen-ui/icon";

export default function NextStepButton({
  href,
  label,
  eyebrow = "Next step",
}) {
  return (
    <Link
      href={href}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-4 rounded-xl border border-[#00573E] bg-[#00684A] px-5 py-3 text-white transition-colors hover:bg-[#00573E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A35C]"
    >
      <span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#B8E4D8]">
          {eyebrow}
        </span>
        <span className="mt-0.5 block text-sm font-semibold">{label}</span>
      </span>
      <Icon glyph="ArrowRight" size={18} />
    </Link>
  );
}
