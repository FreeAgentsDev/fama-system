import type { PriceStage, PublicEvent } from "./api";

export interface AdminEventSummary {
  id: string;
  name: string;
  slug: string;
  date: string;
  venue: string;
  status: "published" | "sold-out" | "cancelled";
  currentStageName: string | null;
  sold: number;
  capacity: number;
  revenue: number;
}

export interface GateScan {
  at: string;
  gate: string;
  result: "admitted" | "exited" | "rejected-voided";
}

export interface AdminTicket {
  id: string;
  code: string;
  attendeeName: string;
  phone: string;
  createdAt: string;
  stage: string;
  pricePaid: number;
  publicPrice: number;
  paymentRef?: string;
  paymentStatus: "pending" | "approved" | "rejected";
  whatsappSent: boolean;
  status: "issued" | "checked-in" | "voided";
  presence: "outside" | "inside";
  entryCount: number;
  scans: GateScan[];
  checkedInAt?: string;
  lastScanAt?: string;
}

export interface AdminEvent {
  id: string;
  name: string;
  slug: string;
  date: string;
  venue: string;
  coverImageUrl?: string;
  stages: PriceStage[];
  status: "published" | "sold-out" | "cancelled";
  tickets: AdminTicket[];
}

export interface BoxOfficeStats {
  sold: number;
  remaining: number;
  inside: number;
  outside: number;
  neverEntered: number;
  voided: number;
  entries: number;
  scans: number;
  checkedIn: number;
  pendingEntry: number;
  revenue: number;
}

export interface RecentScan extends GateScan {
  ticketId: string;
  attendeeName: string;
  code: string;
}

export interface BoxOfficeSnapshot {
  event: AdminEvent;
  stats: BoxOfficeStats;
  recentScans: RecentScan[];
}

export interface CreateEventStageInput {
  name: string;
  price: number;
  capacity: number;
}

export interface CreateEventInput {
  name: string;
  slug?: string;
  date: string;
  venue?: string;
  coverImageUrl?: string;
  stages: CreateEventStageInput[];
}

export type { PublicEvent };
