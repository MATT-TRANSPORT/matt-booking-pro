# MATT Driver 5.0

Jedna aplikacja dla kierowcy. Istniejący panel MATT Driver jest ładowany w WebView, a natywny moduł Stripe Terminal udostępnia Tap to Pay bez drugiej aplikacji.

## Płatność

1. Kierowca otwiera kurs w MATT Driver.
2. Naciska **POBIERZ KARTĄ**.
3. Aplikacja pokazuje kwotę z rezerwacji.
4. Kierowca może wpisać **DOPŁATĘ / DODATKOWĄ KWOTĘ**.
5. Jeśli dopłata > 0, wymagany jest **POWÓD DOPŁATY**.
6. Backend tworzy PaymentIntent z kwotą wyliczoną po stronie serwera.
7. Stripe Terminal Tap to Pay pobiera płatność.
8. Webhook Stripe zapisuje wynik w `driver_card_payments` i aktualizuje rezerwację.
9. MATT Driver automatycznie odświeża widok.

## Wymagania

- Stripe Terminal włączony dla konta MATT.
- Polska lokalizacja Stripe Terminal oraz `STRIPE_TERMINAL_LOCATION_ID` w Vercel.
- Fizyczny telefon zgodny z Tap to Pay.
- Android: aktualny system i aktualne poprawki bezpieczeństwa.
- iPhone: urządzenie zgodne z Tap to Pay on iPhone.
- Do testów natywnych potrzebny jest development build, nie Expo Go.

## Zmienne

Skopiuj `.env.example` do `.env` i uzupełnij wartości.

## Build

```bash
npm install
npx expo prebuild
npx expo run:android
npx expo run:ios
```

Do dystrybucji użyj EAS:

```bash
eas build --profile preview --platform android
eas build --profile production --platform all
```

Sekret Stripe nigdy nie trafia do aplikacji. Aplikacja otrzymuje wyłącznie krótkotrwały Connection Token z backendu.
