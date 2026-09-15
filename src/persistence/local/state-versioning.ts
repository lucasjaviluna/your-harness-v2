import { z } from "zod";

/** Versión actual del contrato físico de un registro operacional. */
export const CURRENT_STATE_FORMAT_VERSION = 1;

const persistedEnvelopeSchema = z.object({
  formatVersion: z.number().int().positive(),
  payload: z.unknown(),
});

export type PersistedEnvelope = z.infer<typeof persistedEnvelopeSchema>;

export interface StateMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(payload: unknown): unknown;
}

/**
 * Registro explícito de migraciones. La versión inicial no necesita una
 * transformación: los registros legacy sin envelope se consideran v1.
 * Las próximas versiones deben agregar aquí una migración reversible en
 * intención y cubierta por pruebas antes de cambiar CURRENT_STATE_FORMAT_VERSION.
 */
export const stateMigrations: ReadonlyArray<StateMigration> = [];

const isPersistedEnvelope = (value: unknown): value is PersistedEnvelope =>
  persistedEnvelopeSchema.safeParse(value).success;

const migrationFor = (fromVersion: number): StateMigration => {
  const migration = stateMigrations.find((candidate) => candidate.fromVersion === fromVersion);
  if (!migration) {
    throw new Error(
      `No state migration is registered from format version ${fromVersion} to ${CURRENT_STATE_FORMAT_VERSION}.`,
    );
  }
  return migration;
};

export const encodePersistedRecord = (payload: unknown): PersistedEnvelope => ({
  formatVersion: CURRENT_STATE_FORMAT_VERSION,
  payload,
});

/**
 * Decodifica registros nuevos y legacy. Un objeto sin envelope conserva la
 * compatibilidad con el estado creado antes de introducir este contrato.
 */
export const decodePersistedRecord = <T>(value: unknown): T => {
  if (!isPersistedEnvelope(value)) return value as T;

  if (value.formatVersion > CURRENT_STATE_FORMAT_VERSION) {
    throw new Error(
      `Persisted state format version ${value.formatVersion} is newer than the supported version ${CURRENT_STATE_FORMAT_VERSION}.`,
    );
  }

  let version = value.formatVersion;
  let payload = value.payload;
  while (version < CURRENT_STATE_FORMAT_VERSION) {
    const migration = migrationFor(version);
    if (migration.toVersion <= version) {
      throw new Error(`Invalid state migration from format version ${version}.`);
    }
    payload = migration.migrate(payload);
    version = migration.toVersion;
  }
  return payload as T;
};
