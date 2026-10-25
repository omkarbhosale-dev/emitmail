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
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center sm:p-8">
      <div className="max-w-md rounded-[4px] border border-[#e5e5e5] bg-white p-8">
        <h1 className="text-page-title text-[#262626]">{title}</h1>
        <p className="mt-3 text-body text-[#595959]">{description}</p>
        <div className="mt-6">
          <Link href="/" className="btn btn-secondary">
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Return to Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
