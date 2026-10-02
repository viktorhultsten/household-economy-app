import { redirect } from "next/navigation";

// Återkommande bor under Analys; den gamla adressen leder dit.
export default function RecurringPage() {
  redirect("/analys/aterkommande");
}
