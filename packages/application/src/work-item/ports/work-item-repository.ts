import type { WorkItem, WorkItemId } from "@your-harness/domain";
import type { Repository } from "../../shared/ports/repository.js";

export interface WorkItemRepository extends Repository<WorkItem, WorkItemId> {}
