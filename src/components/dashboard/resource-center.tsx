import { File, Link2, NotebookText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Child, Resource } from "@/lib/types";

const resourceIcon = {
  file: File,
  note: NotebookText,
  link: Link2,
  worksheet: File,
  book: NotebookText,
  video: Link2
};

export function ResourceCenter({ resources, childProfiles }: { resources: Resource[]; childProfiles: Child[] }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child.firstName]));

  return (
    <Card id="resources" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>资源中心</CardTitle>
            <CardDescription>管理文件、笔记、练习材料和家庭规划资料。</CardDescription>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="搜索资源" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {resources.map((resource) => {
            const Icon = resourceIcon[resource.kind];
            return (
              <div key={resource.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-md bg-slate-100 p-2 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline">{resource.kind}</Badge>
                </div>
                <p className="mt-4 text-sm font-semibold">{resource.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {resource.childId ? childById.get(resource.childId) : "全家"} · {resource.subject}
                </p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {resource.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
