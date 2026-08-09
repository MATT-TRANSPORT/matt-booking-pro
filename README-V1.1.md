# MATT Booking PRO v1.1

## Gotowe moduły rdzenia
- publiczna rezerwacja klienta,
- Google Places + Routes (po dodaniu klucza),
- automatyczne liczenie trasy bez przycisku,
- cena live, strefa 20 km, 2,40 zł/km, faktura +8%,
- Supabase Auth + baza danych,
- panel administratora,
- rezerwacje, dyspozytor, kierowcy, pojazdy,
- kalendarz i raporty,
- panel kierowcy,
- endpoint GPS i tabela historii lokalizacji,
- PWA manifest.

## Przygotowane integracje wymagające dostawcy
- SMS: `SMS_PROVIDER_API_KEY`,
- monitoring lotów: `FLIGHT_PROVIDER_API_KEY`,
- płatności: `PAYMENT_PROVIDER_API_KEY`,
- e-mail: `RESEND_API_KEY`.

Endpointy `/api/integrations/sms`, `/flight`, `/payment` zwracają stan konfiguracji. Po wyborze dostawcy podpinamy jego adapter bez przebudowy rdzenia.
