import { AggregateRoot } from "@your-harness/shared";

import { ReleaseId } from "./release-id.js";
import { ReleaseStatus } from "./release-status.js";
import { ReleaseVersion } from "./release-version.js";
import { InvalidReleaseTransitionError } from "./errors/index.js";

/**
 * Represents a consistent engineering baseline ready to be published.
 */
export class Release extends AggregateRoot<ReleaseId> {
  readonly #version: ReleaseVersion;
  readonly #status: ReleaseStatus;

  constructor(
    id: ReleaseId,
    version: ReleaseVersion,
    status: ReleaseStatus = ReleaseStatus.Draft
  ) {
    super(id);

    this.#version = version;
    this.#status = status;
  }

  get version(): ReleaseVersion {
    return this.#version;
  }

  get status(): ReleaseStatus {
    return this.#status;
  }

  markReady(): Release {
  if (this.status !== ReleaseStatus.Draft) {
    throw new InvalidReleaseTransitionError(
      this.status,
      ReleaseStatus.Ready
    );
  }

  return new Release(
    this.id,
    this.version,
    ReleaseStatus.Ready
  );
}

  publish(): Release {
  if (this.status !== ReleaseStatus.Ready) {
    throw new InvalidReleaseTransitionError(
      this.status,
      ReleaseStatus.Released
    );
  }

  return new Release(
    this.id,
    this.version,
    ReleaseStatus.Released
  );
}

  deprecate(): Release {
  if (this.status !== ReleaseStatus.Released) {
    throw new InvalidReleaseTransitionError(
      this.status,
      ReleaseStatus.Deprecated
    );
  }

  return new Release(
    this.id,
    this.version,
    ReleaseStatus.Deprecated
  );
}
}
