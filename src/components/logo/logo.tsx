import { cn } from "@/lib/utils";

export default function Logo({ classNameFull, classNameMobile }: { classNameFull?: string; classNameMobile?: string }) {
  return (
    <span
      className={cn("text-text-primary font-urbanist text-lg font-bold tracking-tight", classNameFull, classNameMobile)}
    >
      Averuna<span className="text-primary"> Partner</span>
    </span>
  );
}
