import { API_MODE } from "@/lib/api";

export function DemoModeBanner() {
  if (API_MODE !== "mock") return null;
  return (
    <div role="status" className="w-full bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
      TRYB DEMO - dane przykładowe z kontraktu API, bez połączenia z backendem.
    </div>
  );
}
