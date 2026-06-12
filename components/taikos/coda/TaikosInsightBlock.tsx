import type { TaikosInsight } from "@/lib/taikos/coda/types";

type Props = {
  insight: TaikosInsight;
};

export function TaikosInsightBlock({ insight }: Props) {
  return (
    <div className="taikos-insight-block">
      <p className="taikos-insight-block__label">{insight.subjectLabel}</p>
      <p className="taikos-insight-block__discovery">
        <span>Discovery:</span> {insight.discovery}
      </p>
      <p className="taikos-insight-block__curiosity">
        <span>Curiosity:</span> {insight.curiosityPrompt}
      </p>
      <p className="taikos-insight-block__action">
        <span>Suggested Action:</span> {insight.suggestedAction}
      </p>
    </div>
  );
}
