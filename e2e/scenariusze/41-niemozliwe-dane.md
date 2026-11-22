# Walidacja niemożliwych danych w kreatorze (FE1-57)

> Daty i liczby, które nie mogą być prawdziwe (zwolnienie kończące się przed początkiem, cały macierzyński
> wykorzystany kilka tygodni po porodzie, pobyt w szpitalu dłuższy niż czas od porodu), blokują „Dalej” z komunikatem przy polu.

1. Otwórz stronę główną.
2. Kliknij „Zaczynamy”.
3. Wybierz „Mamą”.
4. Przejdź dalej.
5. Wybierz „Jestem w ciąży”.
6. Przejdź dalej.
7. W polu „Planowana data porodu” wpisz „za 60 dni”.
8. W pytaniu „Czy jesteś teraz (albo byłaś) na zwolnieniu lekarskim” wybierz „Tak”.
9. W polu „Zwolnienie od” wpisz „za 5 dni”.
10. Sprawdź, że widać „Zwolnienie nie może zaczynać się w przyszłości”.
11. Sprawdź, że nie można przejść dalej.
12. W polu „Zwolnienie od” wpisz „3 tygodnie temu”.
13. W polu „Zwolnienie do” wpisz „4 tygodnie temu”.
14. Sprawdź, że widać „Koniec zwolnienia nie może być wcześniejszy niż jego początek”.
15. Sprawdź, że nie można przejść dalej.
16. W polu „Zwolnienie do” wpisz „dziś”.
17. Sprawdź, że można przejść dalej.
18. W polu „Planowana data porodu” wpisz „za 400 dni”.
19. Sprawdź, że widać „Planowana data porodu jest za ponad”.
20. Sprawdź, że nie można przejść dalej.
21. Sprawdź, że strona nie przewija się w poziomie.
