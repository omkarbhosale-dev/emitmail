import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({
  title,
  description = "This feature module is coming soon in the next release of the EmitMail dashboard.",
}: ComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md rounded-[4px] border border-[#f0f0f0] bg-white p-8">
        <h1 className="text-[24px] font-normal tracking-[-0.6px] text-[#262626]">
          {title}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#595959]">
          {description}
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-[2px] border border-[#f0f0f0] bg-white px-4 text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f0f0f0]"
          >
            <ArrowLeft size={14} />
            <span>Return to Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
