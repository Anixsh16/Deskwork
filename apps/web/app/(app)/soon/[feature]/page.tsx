import Link from "next/link";
import { FEATURES, FeatureId } from "@/lib/features";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";

interface SoonPageProps {
  params: Promise<{
    feature: string;
  }>;
}

export default async function SoonPage({ params }: SoonPageProps) {
  const resolvedParams = await params;
  const featureKey = resolvedParams.feature as FeatureId;
  const feature = FEATURES[featureKey];

  const name = feature?.name || resolvedParams.feature.replace(/-/g, " ");
  const blurb = feature?.blurb || "This module is slated for implementation in the next release.";

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#2A4A9A] dark:hover:text-[#93AEF2] mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-8 shadow-xs">
        <div className="inline-flex p-2.5 rounded-xl bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2] mb-4">
          <Clock className="w-6 h-6" />
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1]">
            {name}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FBF1D9] text-[#9A6700] dark:bg-[#342A14] dark:text-[#E8BE5C]">
            Coming Soon
          </span>
        </div>

        <p className="mt-4 text-sm text-[#5A6377] dark:text-[#9AA3B6] leading-relaxed">
          {blurb}
        </p>

        <div className="mt-8 pt-6 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between text-xs text-[#5A6377] dark:text-[#9AA3B6]">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#2A4A9A]" />
            Deskwork Academic Workspace Roadmap
          </span>
          <span className="font-mono">Final Milestone</span>
        </div>
      </div>
    </div>
  );
}
