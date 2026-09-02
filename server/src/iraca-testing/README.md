# iraca-testing

Cómo se testea un Usecase de Iraca: **sin HTTP**, assert del `DomainEvent`.

El framework no exporta un `./testing`. Este folder es el candidato: `call()` ya es el seam; falta el assert.

En otro proyecto:

```ts
import { callUsecase, assertDomainEvent, payloadOf, assertHttpEvent } from "./iraca-testing";

const result = await callUsecase(usecase, { name: "Ana" });
assertDomainEvent(result, HelloSaidDomainEvent);
const payload = payloadOf<{ name: string }>(result, HelloSaidDomainEvent);

// Si alguien pega contra el puerto (Iraca siempre responde 200):
assertHttpEvent(json, HelloSaidDomainEvent);
// meta.code = "Greetings:HelloSaidDomainEvent" → se compara solo el EventName
```

- No hay Jest ni runner propio: funciona con `node:test` o con el Jest de Iraca.
- El Usecase se instancia a mano con contratos fake. El contenedor no entra.
- El dominio de la app (boletas, etc.) **no** va aquí.

Candidato a `@scifamek-open-source/iraca/testing`.
