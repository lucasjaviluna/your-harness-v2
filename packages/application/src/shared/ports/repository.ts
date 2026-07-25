/**
 * Generic repository contract.
 */
export interface Repository<
  TAggregate,
  TId
> {
  findById(id: TId): Promise<TAggregate | null>;

  save(aggregate: TAggregate): Promise<void>;

  delete(id: TId): Promise<void>;
}
