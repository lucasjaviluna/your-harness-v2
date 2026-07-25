/**
 * Input required to create a Work Item.
 */
export interface CreateWorkItemInput {
  /**
   * Work Item identifier.
   */
  id: string;

  /**
   * Intent to which the Work Item belongs.
   */
  intentId: string;

  /**
   * Work Item title.
   */
  title: string;
}
