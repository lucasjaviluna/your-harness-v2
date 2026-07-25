import {
    Repository
} from "../../shared/index.js";

import {
    Project,
    ProjectId
} from "@your-harness/domain";

/**
 * Project repository contract.
 */
export interface ProjectRepository
    extends Repository<Project, ProjectId> {}
