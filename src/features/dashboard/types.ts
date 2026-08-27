import type { DerivedMetrics } from "@/lib/metrics";
import type { ChipStatus, Decision, Offer, Task } from "@/types/domain";

export interface TodayCard {
  today: DerivedMetrics;
  yesterday: DerivedMetrics | null;
}

export interface RunningOfferRow {
  offer: Offer;
  today: DerivedMetrics;
}

export interface Alert {
  id: string;
  severity: "warn" | "danger";
  message: string;
  href: string | null;
}

export interface DashboardData {
  todayCard: TodayCard;
  running: RunningOfferRow[];
  launchQueue: Offer[];
  chipCapacity: (Record<ChipStatus, number> & { total: number }) | null;
  chipsTarget: number;
  decisions: Decision[];
  myTasks: Task[];
  alerts: Alert[];
}
