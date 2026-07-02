import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProductTrack = {
  title: string;
  deadline: string;
  goal: string;
  scope: string[];
};

export function ProductTrackSplit({ tracks }: { tracks: ProductTrack[] }) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          双轨推进策略
        </CardTitle>
        <CardDescription>先交付三孩定制版，再抽象为可商用通用版。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {tracks.map((track) => (
          <div key={track.title} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{track.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{track.goal}</p>
              </div>
              <Badge variant={track.title.includes("定制") ? "success" : "outline"}>{track.deadline}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {track.scope.map((item) => (
                <span key={item} className="rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
