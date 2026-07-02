"use client";

import { useMemo, useState } from "react";
import { File, Link2, NotebookText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [query, setQuery] = useState("");
  const [childFilter, setChildFilter] = useState("all");
  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);
  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return resources.filter((resource) => {
      const childMatches = childFilter === "all" || (childFilter === "family" ? !resource.childId : resource.childId === childFilter);
      const text = [resource.title, resource.subject, resource.kind, ...resource.tags, resource.childId ? childById.get(resource.childId) : "全家"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return childMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [childById, childFilter, query, resources]);

  return (
    <Card id="resources" className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>资源中心</CardTitle>
            <CardDescription>管理文件、笔记、练习材料和家庭规划资料。</CardDescription>
          </div>
          <div className="grid w-full min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-[min(520px,100%)]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="搜索资源" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Select value={childFilter} onValueChange={setChildFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部资源</SelectItem>
                <SelectItem value="family">全家资源</SelectItem>
                {childProfiles.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {filteredResources.map((resource) => {
            const Icon = resourceIcon[resource.kind];
            return (
              <div key={resource.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-muted/60 p-2 text-foreground">
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
                    <span key={tag} className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {filteredResources.length === 0 && (
          <p className="rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
            没有找到匹配资源。可以换一个关键词，或切回“全部资源”。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
