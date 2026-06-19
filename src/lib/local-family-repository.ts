"use client";

import type { CalendarEvent } from "@/lib/types";
import type { ChildIntakeProfile, FamilyRepository, FamilySnapshot } from "@/lib/core-types";
import { pilotSnapshot } from "@/lib/pilot-snapshot";

const snapshotKey = "family-education-private-snapshot-v1";

function readSnapshot(): FamilySnapshot {
  const raw = window.localStorage.getItem(snapshotKey);
  if (!raw) return pilotSnapshot;

  try {
    return { ...pilotSnapshot, ...JSON.parse(raw) } as FamilySnapshot;
  } catch {
    return pilotSnapshot;
  }
}

function writeSnapshot(snapshot: FamilySnapshot) {
  window.localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
}

export class LocalFamilyRepository implements FamilyRepository {
  async getSnapshot() {
    return readSnapshot();
  }

  async saveChildIntakeProfile(profile: ChildIntakeProfile) {
    const snapshot = readSnapshot();
    const nextProfiles = snapshot.childIntakeProfiles.some((item) => item.childId === profile.childId)
      ? snapshot.childIntakeProfiles.map((item) => (item.childId === profile.childId ? profile : item))
      : [...snapshot.childIntakeProfiles, profile];

    writeSnapshot({ ...snapshot, childIntakeProfiles: nextProfiles });
    return profile;
  }

  async createCalendarEvent(event: Omit<CalendarEvent, "id">) {
    const snapshot = readSnapshot();
    const nextEvent: CalendarEvent = {
      ...event,
      id: `local-${Date.now()}`
    };

    writeSnapshot({
      ...snapshot,
      calendarEvents: [...snapshot.calendarEvents, nextEvent].sort(
        (a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)
      )
    });

    return nextEvent;
  }

  async deleteCalendarEvent(eventId: string) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      calendarEvents: snapshot.calendarEvents.filter((event) => event.id !== eventId)
    });
  }
}
