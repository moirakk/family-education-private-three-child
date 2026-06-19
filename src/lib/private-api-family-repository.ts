"use client";

import type { ChildIntakeProfile, FamilyRepository } from "@/lib/core-types";
import type { CalendarEvent } from "@/lib/types";
import { pilotSnapshot } from "@/lib/pilot-snapshot";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Private API request failed");
  }

  if (!payload.data) {
    throw new Error("Private API response is missing data");
  }

  return payload.data;
}

export class PrivateApiFamilyRepository implements FamilyRepository {
  async getSnapshot() {
    // Until the private snapshot endpoint is wired, keep the no-login pilot resilient.
    // Writes can already go to Supabase through private server APIs.
    return pilotSnapshot;
  }

  async saveChildIntakeProfile(profile: ChildIntakeProfile) {
    const data = await parseJsonResponse<{
      child_id: string;
      school_detail: string | null;
      weekly_schedule: string | null;
      important_dates: string | null;
      current_goals: string | null;
      parent_concerns: string | null;
      private_notes: string | null;
      updated_at: string | null;
    }>(
      await fetch("/api/private/intake", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      })
    );

    return {
      childId: data.child_id,
      schoolDetail: data.school_detail ?? "",
      weeklySchedule: data.weekly_schedule ?? "",
      importantDates: data.important_dates ?? "",
      currentGoals: data.current_goals ?? "",
      parentConcerns: data.parent_concerns ?? "",
      privateNotes: data.private_notes ?? "",
      updatedAt: data.updated_at ?? undefined
    };
  }

  async createCalendarEvent(event: Omit<CalendarEvent, "id">) {
    const data = await parseJsonResponse<{
      id: string;
      title: string;
      category: CalendarEvent["category"];
      starts_at: string;
      ends_at: string | null;
      location: string | null;
      childIds: string[];
    }>(
      await fetch("/api/private/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      })
    );

    return {
      id: data.id,
      title: data.title,
      category: data.category,
      startsAt: data.starts_at,
      endsAt: data.ends_at ?? undefined,
      location: data.location ?? "",
      childIds: data.childIds
    };
  }

  async deleteCalendarEvent(eventId: string) {
    const response = await fetch(`/api/private/events?eventId=${encodeURIComponent(eventId)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Delete private event failed");
    }
  }
}
