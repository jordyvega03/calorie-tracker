"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // El offline básico es un extra: si falla el registro, la app sigue
        // funcionando normal con conexión, así que no hace falta mostrar nada.
      });
    }
  }, []);

  return null;
}
