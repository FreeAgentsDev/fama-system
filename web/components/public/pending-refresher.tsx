"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * El webhook de Wompi puede tardar unos segundos en llegar después del redirect. Mientras la
 * boleta siga `pending`, refresca la página sola cada 3s para que el QR aparezca sin que el
 * comprador tenga que recargar a mano.
 */
export function PendingRefresher() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
