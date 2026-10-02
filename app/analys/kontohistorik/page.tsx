import { Suspense } from "react";
import Kontohistorik from "./Kontohistorik";

export default function KontohistorikPage() {
  return (
    <Suspense>
      <Kontohistorik />
    </Suspense>
  );
}
