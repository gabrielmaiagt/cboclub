import type { Decision, Offer, Task } from "@/types/domain";

export interface UserOption {
  id: string;
  name: string;
}

export interface TaskRow {
  task: Task;
  responsibleName: string | null;
  offerCode: string | null;
}

export interface TasksData {
  rows: TaskRow[];
  decisions: Decision[];
  offers: Pick<Offer, "id" | "code" | "name">[];
  users: UserOption[];
  currentUid: string;
}
