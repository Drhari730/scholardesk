export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export const EVENT_CHECKLIST_TEMPLATES: Record<string, string[]> = {
  CONFERENCE: [
    "Abstract & slides prepared",
    "Conference registration completed",
    "Travel booked",
    "Hotel / accommodation confirmed",
    "Presentation rehearsed",
    "Poster / handouts printed (if needed)",
  ],
  GUEST_LECTURE: [
    "Lecture slides ready",
    "Invitation letter saved",
    "Honorarium / TA confirmed with host",
    "Travel & accommodation sorted",
    "Tech requirements sent to host",
    "Reading material shared with students",
  ],
  TRAVEL: [
    "Tickets booked",
    "Hotel confirmed",
    "Itinerary saved",
    "Travel insurance checked",
    "Packing list prepared",
    "Emergency contacts noted",
  ],
  LEAVE: [
    "HOD / Dean informed",
    "Classes covered or rescheduled",
    "Handover notes for colleagues",
    "Out-of-office email set",
    "Urgent tasks delegated",
  ],
  WORKSHOP: [
    "Workshop materials prepared",
    "Venue & AV confirmed",
    "Participant list ready",
    "Certificates / feedback forms",
    "Honorarium / fee confirmed",
  ],
};

export function buildDefaultChecklist(type: string): ChecklistItem[] {
  const labels = EVENT_CHECKLIST_TEMPLATES[type] ?? EVENT_CHECKLIST_TEMPLATES.CONFERENCE;
  return labels.map((label, i) => ({
    id: `item-${i}`,
    label,
    done: false,
  }));
}

export function parseChecklist(json: string | null | undefined): ChecklistItem[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as ChecklistItem[];
  } catch {
    return [];
  }
}

export function serializeChecklist(items: ChecklistItem[]): string {
  return JSON.stringify(items);
}
