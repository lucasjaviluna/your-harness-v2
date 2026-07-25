import { AggregateRoot } from "@your-harness/shared";

import { IntentId } from "../intent/index.js";

import { WorkItemId } from "./work-item-id.js";
import { WorkItemStatus } from "./work-item-status.js";
import { WorkItemTitle } from "./work-item-title.js";
import { InvalidWorkItemTransitionError } from "./errors/index.js";

/**
 * Represents an executable engineering work item.
 *
 * Every Work Item belongs to exactly one Intent.
 */
export class WorkItem extends AggregateRoot<WorkItemId> {
  readonly #intentId: IntentId;
  readonly #title: WorkItemTitle;
  readonly #status: WorkItemStatus;

  constructor(
    id: WorkItemId,
    intentId: IntentId,
    title: WorkItemTitle,
    status: WorkItemStatus = WorkItemStatus.Todo
  ) {
    super(id);

    this.#intentId = intentId;
    this.#title = title;
    this.#status = status;
  }

  get intentId(): IntentId {
    return this.#intentId;
  }

  get title(): WorkItemTitle {
    return this.#title;
  }

  get status(): WorkItemStatus {
    return this.#status;
  }

  rename(title: WorkItemTitle): WorkItem {
    return new WorkItem(
      this.id,
      this.intentId,
      title,
      this.status
    );
  }

  start(): WorkItem {
    if (this.status !== WorkItemStatus.Todo) {
    throw new InvalidWorkItemTransitionError(
      this.status,
      WorkItemStatus.InProgress
    );
  }

  return new WorkItem(
    this.id,
    this.intentId,
    this.title,
    WorkItemStatus.InProgress
  );
  }

  block(): WorkItem {
    if (this.status !== WorkItemStatus.InProgress) {
    throw new InvalidWorkItemTransitionError(
      this.status,
      WorkItemStatus.Blocked
    );
  }

  return new WorkItem(
    this.id,
    this.intentId,
    this.title,
    WorkItemStatus.Blocked
  );
  }

  resume(): WorkItem {
    if (this.status !== WorkItemStatus.Blocked) {
    throw new InvalidWorkItemTransitionError(
      this.status,
      WorkItemStatus.InProgress
    );
  }

  return new WorkItem(
    this.id,
    this.intentId,
    this.title,
    WorkItemStatus.InProgress
  );
  }

  complete(): WorkItem {
    if (this.status !== WorkItemStatus.InProgress) {
    throw new InvalidWorkItemTransitionError(
      this.status,
      WorkItemStatus.Done
    );
  }

  return new WorkItem(
    this.id,
    this.intentId,
    this.title,
    WorkItemStatus.Done
  );
  }

  cancel(): WorkItem {
    if (this.status === WorkItemStatus.Done) {
    throw new InvalidWorkItemTransitionError(
      this.status,
      WorkItemStatus.Cancelled
    );
  }

  return new WorkItem(
    this.id,
    this.intentId,
    this.title,
    WorkItemStatus.Cancelled
  );
  }
}
