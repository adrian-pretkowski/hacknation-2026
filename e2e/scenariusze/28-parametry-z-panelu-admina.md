# Kreator liczy na parametrach z panelu admina (FE1-37)

> Stawka za cały okres zmieniona „w panelu” z 81,5% na 90% (podmiana odpowiedzi API tylko w tej przeglądarce, bez zapisu w backendzie). Kreator pobiera parametry ponownie po powrocie do karty - wynik przelicza się bez utraty odpowiedzi. Wartość spoza zakresu (0 dni w miesiącu) jest ignorowana - wynik nadal się wyświetla.

1. Otwórz stronę główną.
2. Kliknij „Zaczynamy”.
3. Wybierz „Mamą”.
4. Przejdź dalej.
5. Wybierz „Jestem w ciąży”.
6. Przejdź dalej.
7. W polu „Planowana data porodu” wpisz „za 60 dni”.
8. Przejdź dalej.
9. Przejdź dalej.
10. Wybierz „Umowa o pracę”.
11. W polu „Od kiedy podlegasz ubezpieczeniu chorobowemu?” wpisz „01.03.2019”.
12. Wybierz „Na czas nieokreślony”.
13. W pytaniu „Czy umowa ustała” wybierz „Nie”.
14. Wybierz „Więcej niż 20”.
15. Przejdź dalej.
16. Przejdź dalej.
17. W polu „Wynagrodzenie brutto (zł / miesiąc)” wpisz „6000”.
18. Przejdź dalej.
19. Przejdź dalej.
20. Sprawdź, że nagłówek to „Twój plan”.
21. Sprawdź, że widać „81,5%”.
22. Sprawdź, że nie widać „90%”.
23. W API ustaw parametr „MAT_RATE_COMBINED” na „0.9”.
24. Przełącz się na inną kartę i wróć.
25. Sprawdź, że widać „90%”.
26. Sprawdź, że nagłówek to „Twój plan”.
27. Sprawdź, że strona nie przewija się w poziomie.
28. W API ustaw parametr „MONTH_AS_DAYS” na „0”.
29. Przełącz się na inną kartę i wróć.
30. Sprawdź, że nagłówek to „Twój plan”.
31. Sprawdź, że widać „Łącznie dla Ciebie”.
