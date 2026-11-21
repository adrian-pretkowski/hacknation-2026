// Kontrola słownika kroków (bez przeglądarki): każdy przykład z listy KROKI musi trafić we własny krok,
// a daty pisane po ludzku muszą dawać RRRR-MM-DD.
import { expect, test } from "@playwright/test";
import { KROKI, data, dopasuj } from "./kroki";

test.describe("słownik kroków", () => {
  for (const krok of KROKI) {
    // Opis może zawierać kilka przykładów rozdzielonych „ / ” i dopisek w nawiasie po dwóch spacjach.
    for (const przyklad of krok.opis.split("  ")[0].split(" / ")) {
      test(przyklad, () => {
        const pelny = przyklad.startsWith("że ") ? `Sprawdź, ${przyklad}` : przyklad;
        expect(dopasuj(pelny)?.krok.opis).toBe(krok.opis);
      });
    }
  }

  test("daty", () => {
    expect(data("2026-12-01")).toBe("2026-12-01");
    expect(data("01.03.2019")).toBe("2019-03-01");
    expect(data("1 maja 2020")).toBe("2020-05-01");
    const dzis = new Date();
    const za = new Date(dzis); za.setDate(za.getDate() + 14);
    expect(data("za 2 tygodnie")).toBe(`${za.getFullYear()}-${String(za.getMonth() + 1).padStart(2, "0")}-${String(za.getDate()).padStart(2, "0")}`);
    expect(() => data("jutro rano")).toThrow(/Nie rozumiem daty/);
  });

  test("wartości z cudzysłowów są argumentami", () => {
    expect(dopasuj("W polu „Data porodu” wpisz „za 60 dni”.")?.args).toEqual(["Data porodu", "za 60 dni"]);
    expect(dopasuj('Wybierz "Mamą"')?.args).toEqual(["Mamą"]);
    expect(dopasuj("Sprawdź, że nie można przejść dalej")?.args).toEqual(["nie "]);
    expect(dopasuj("Zrób kawę")).toBeNull();
  });
});
