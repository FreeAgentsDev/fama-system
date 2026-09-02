import { Usecase } from "@scifamek-open-source/iraca/config";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export interface GetEventBoxOfficeParam {
  id: string;
}

export abstract class GetEventBoxOfficeUsecase extends Usecase<
  GetEventBoxOfficeParam,
  unknown
> {
  abstract call(param: GetEventBoxOfficeParam): Promise<DomainEvent>;
}
