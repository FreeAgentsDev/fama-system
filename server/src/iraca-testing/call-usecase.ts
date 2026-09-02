import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { describeValue } from "./describe";
import { CallableUsecase } from "./types";

/**
 * Llama el Usecase sin HTTP ni contenedor. El test inyecta fakes en el constructor.
 */
export async function callUsecase<Param>(
  usecase: CallableUsecase<Param>,
  param?: Param,
): Promise<DomainEvent> {
  const result = await usecase.call(param);
  if (!(result instanceof DomainEvent)) {
    throw new Error(
      `Usecase.call() debe devolver un DomainEvent, se obtuvo ${describeValue(result)}`,
    );
  }
  return result;
}
