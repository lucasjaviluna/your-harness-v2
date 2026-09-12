import type { WorkItem, WorkItemId } from "../../../../domain/src/work-item/index.js";
import type { Repository } from "../../shared/ports/repository.js";

export interface WorkItemRepository extends Repository<WorkItem, WorkItemId> {}
