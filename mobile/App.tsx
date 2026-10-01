import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { StatusBar } from "react-native";
import {
  StripeTerminalProvider,
  useStripeTerminal
} from "@stripe/stripe-terminal-react-native";
import {
  WebView,
  type WebViewMessageEvent
} from "react-native-webview";

type PaymentRequest = {
  handoffToken: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  leg: "primary" | "return";
  baseAmountCents: number;
};

const APP_URL =
  process.env.EXPO_PUBLIC_APP_URL ||
  "https://booking.matt-transport.pl/kierowca";
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://booking.matt-transport.pl";
const ALLOWED_ORIGIN = "https://booking.matt-transport.pl";
const TERMINAL_LOCATION_ID =
  process.env.EXPO_PUBLIC_STRIPE_TERMINAL_LOCATION_ID ||
  "tml_GrarABsrx26Go1";

function parseMoney(value: string) {
  const normalized = value.replace(/\\s/g, "").replace(",", ".");
  if (!normalized) return 0;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return NaN;
  return Math.round(amount * 100);
}

function formatMoney(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} zł`;
}

function TerminalPaymentModal({
  request,
  onClose,
  onSuccess
}: {
  request: PaymentRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [surcharge, setSurcharge] = useState("");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");

  const baseCents = request.baseAmountCents;
  const surchargeCents = useMemo(() => parseMoney(surcharge), [surcharge]);
  const totalCents =
    Number.isFinite(surchargeCents)
      ? baseCents + surchargeCents
      : baseCents;

  const tokenProvider = async () => {
    const response = await fetch(
      `${API_URL}/api/driver/terminal/connection-token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.handoffToken}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.secret) {
      throw new Error(data.error || "Nie udało się połączyć z terminalem Stripe.");
    }

    return data.secret;
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={processing ? undefined : onClose}>
      <StripeTerminalProvider tokenProvider={tokenProvider}>
        <TerminalPaymentBody
          request={request}
          surcharge={surcharge}
          setSurcharge={setSurcharge}
          reason={reason}
          setReason={setReason}
          surchargeCents={surchargeCents}
          totalCents={totalCents}
          processing={processing}
          setProcessing={setProcessing}
          statusText={statusText}
          setStatusText={setStatusText}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </StripeTerminalProvider>
    </Modal>
  );
}

function TerminalPaymentBody({
  request,
  surcharge,
  setSurcharge,
  reason,
  setReason,
  surchargeCents,
  totalCents,
  processing,
  setProcessing,
  statusText,
  setStatusText,
  onClose,
  onSuccess
}: {
  request: PaymentRequest;
  surcharge: string;
  setSurcharge: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  surchargeCents: number;
  totalCents: number;
  processing: boolean;
  setProcessing: (value: boolean) => void;
  statusText: string;
  setStatusText: (value: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const {
    initialize,
    easyConnect,
    retrievePaymentIntent,
    processPaymentIntent,
    disconnectReader
  } = useStripeTerminal();

  useEffect(() => {
    console.log("[MATT Stripe] initialize START");
    initialize({
      localeConfig: {
        type: "hardcoded",
        locale: "pl-PL"
      }
    })
      .then(() => console.log("[MATT Stripe] initialize OK"))
      .catch((error) => console.error("[MATT Stripe] initialize ERROR:", error));
  }, [initialize]);

  async function pay() {
    console.log("[MATT Stripe] PAY CLICK", {
      bookingId: request.bookingId,
      baseAmountCents: request.baseAmountCents,
      surchargeCents,
      totalCents
    });

    if (processing) {
      console.log("[MATT Stripe] PAY BLOCKED: already processing");
      return;
    }

    if (!Number.isFinite(surchargeCents)) {
      Alert.alert("Nieprawidłowa kwota", "Wpisz poprawną kwotę dopłaty.");
      return;
    }

    if (surchargeCents > 0 && !reason.trim()) {
      Alert.alert(
        "Brak powodu dopłaty",
        "Przy każdej dopłacie kierowca musi wpisać jej powód."
      );
      return;
    }

    if (totalCents <= 0) {
      Alert.alert("Brak kwoty", "Nie ma kwoty do pobrania.");
      return;
    }

    setProcessing(true);
    setStatusText("Sprawdzam uprawnienie lokalizacji…");

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      console.log("[MATT Stripe] location permission:", permission.status);

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        const requested = await Location.requestForegroundPermissionsAsync();
        console.log("[MATT Stripe] location permission request:", requested.status);
        if (requested.status !== Location.PermissionStatus.GRANTED) {
          throw new Error("Aby korzystać z Tap to Pay, MATT Driver potrzebuje dostępu do lokalizacji.");
        }
      }
    } catch (locationError) {
      console.error("[MATT Stripe] LOCATION ERROR:", locationError);
      setProcessing(false);
      setStatusText("");
      Alert.alert("Wymagana lokalizacja", locationError instanceof Error ? locationError.message : "Zezwól aplikacji na dostęp do lokalizacji.");
      return;
    }

    setStatusText("Przygotowuję płatność…");
    console.log("[MATT Stripe] payment-intent START");

    try {
      const intentResponse = await fetch(
        `${API_URL}/api/driver/terminal/payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${request.handoffToken}`
          },
          body: JSON.stringify({
            bookingId: request.bookingId,
            leg: request.leg,
            surchargeAmountCents: surchargeCents,
            surchargeReason: reason.trim()
          })
        }
      );

      console.log("[MATT Stripe] payment-intent HTTP", intentResponse.status);
      const intentData = await intentResponse.json();
      console.log("[MATT Stripe] payment-intent DATA", {
        ok: intentResponse.ok,
        hasClientSecret: Boolean(intentData?.clientSecret),
        error: intentData?.error || null
      });

      if (!intentResponse.ok) {
        throw new Error(intentData.error || "Nie udało się przygotować płatności.");
      }

      setStatusText("Łączę Tap to Pay…");

      const connectParams = {
        discoveryMethod: "tapToPay" as const,
        merchantDisplayName: "MATT TRANSPORT",
        autoReconnectOnUnexpectedDisconnect: true,
        simulated: __DEV__,
        locationId: TERMINAL_LOCATION_ID
      };

      console.log("[MATT Stripe] easyConnect START", connectParams);
      const connected = await easyConnect(connectParams);
      console.log("[MATT Stripe] easyConnect RESULT", {
        hasError: Boolean(connected.error),
        error: connected.error?.message || null,
        hasReader: Boolean(connected.reader)
      });

      if (connected.error) {
        throw new Error(connected.error.message || "Nie udało się połączyć Tap to Pay.");
      }

      setStatusText("Przyłóż kartę lub telefon klienta do urządzenia…");

      console.log("[MATT Stripe] retrievePaymentIntent START");
      const retrieved = await retrievePaymentIntent(intentData.clientSecret);
      console.log("[MATT Stripe] retrievePaymentIntent RESULT", {
        hasError: Boolean(retrieved.error),
        error: retrieved.error?.message || null,
        hasPaymentIntent: Boolean(retrieved.paymentIntent)
      });

      if (retrieved.error || !retrieved.paymentIntent) {
        throw new Error(
          retrieved.error?.message || "Nie udało się pobrać PaymentIntent."
        );
      }

      console.log("[MATT Stripe] processPaymentIntent START");
      const processed = await processPaymentIntent({
        paymentIntent: retrieved.paymentIntent
      });
      console.log("[MATT Stripe] processPaymentIntent RESULT", {
        hasError: Boolean(processed.error),
        error: processed.error?.message || null,
        status: processed.paymentIntent?.status || null
      });

      if (processed.error) {
        throw new Error(
          processed.error.message || "Płatność została odrzucona."
        );
      }

      if (processed.paymentIntent?.status !== "succeeded") {
        throw new Error(
          `Płatność nie została zakończona. Status: ${processed.paymentIntent?.status || "nieznany"}`
        );
      }

      setStatusText("✓ Płatność zakończona");
      await disconnectReader().catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 800));
      onSuccess();
    } catch (error) {
      console.error("[MATT Stripe] PAY ERROR:", error);
      await disconnectReader().catch(() => null);
      setStatusText("");
      Alert.alert(
        "Płatność nieudana",
        error instanceof Error ? error.message : "Spróbuj ponownie."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <SafeAreaView style={styles.modalRoot}>
      <View style={styles.modalCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>MATT DRIVER · PŁATNOŚĆ</Text>
            <Text style={styles.title}>{request.bookingNumber}</Text>
            <Text style={styles.muted}>{request.customerName}</Text>
          </View>
          {!processing && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.label}>KWOTA Z REZERWACJI</Text>
          <Text style={styles.baseAmount}>
            {request.baseAmountCents > 0
              ? formatMoney(request.baseAmountCents)
              : "0,00 zł · JUŻ OPŁACONA"}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>DOPŁATA / DODATKOWA KWOTA</Text>
          <TextInput
            value={surcharge}
            onChangeText={setSurcharge}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor="#7b8391"
            editable={!processing}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            POWÓD DOPŁATY {surchargeCents > 0 ? "*" : "(opcjonalnie)"}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="np. dodatkowy adres / postój"
            placeholderTextColor="#7b8391"
            editable={!processing}
            multiline
            maxLength={500}
            style={[styles.input, styles.reasonInput]}
          />
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>DO ZAPŁATY</Text>
          <Text style={styles.total}>{formatMoney(totalCents)}</Text>
        </View>

        {statusText ? (
          <View style={styles.statusBox}>
            {processing && <ActivityIndicator />}
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.payButton,
            processing || totalCents <= 0 ? styles.payButtonDisabled : null
          ]}
          disabled={processing || totalCents <= 0}
          onPress={pay}
        >
          <Text style={styles.payButtonText}>
            {processing
              ? "TRWA PŁATNOŚĆ…"
              : `💳 POBIERZ ${formatMoney(totalCents)}`}
          </Text>
        </TouchableOpacity>

        {!processing && (
          <Text style={styles.helpText}>
            Płatność zostanie automatycznie przypisana do tej rezerwacji i kierowcy.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);

  const handleMessage = (event: WebViewMessageEvent) => {
    const rawMessage = event.nativeEvent.data;
    console.log("[MATT Driver] WebView message:", rawMessage);

    try {
      const message = JSON.parse(rawMessage);

      if (message?.type !== "MATT_TERMINAL_PAYMENT") return;

      const authToken = message.handoffToken || message.accessToken;

      if (!authToken || !message.bookingId) {
        console.warn("[MATT Driver] Invalid terminal payment message:", message);
        return;
      }

      const request: PaymentRequest = {
        handoffToken: String(authToken),
        bookingId: String(message.bookingId),
        bookingNumber: String(message.bookingNumber || ""),
        customerName: String(message.customerName || ""),
        leg: message.leg === "return" ? "return" : "primary",
        baseAmountCents: Math.max(0, Number(message.baseAmountCents || 0))
      };

      console.log("[MATT Driver] Opening Tap to Pay modal:", {
        bookingId: request.bookingId,
        bookingNumber: request.bookingNumber,
        leg: request.leg,
        baseAmountCents: request.baseAmountCents
      });

      setPaymentRequest(request);
    } catch (error) {
      console.error("[MATT Driver] Invalid WebView message:", error);
    }
  };

  const closePayment = () => setPaymentRequest(null);

  const finishPayment = () => {
    setPaymentRequest(null);
    webViewRef.current?.reload();
  };

  const handleNavigation = (request: { url: string }) => {
    const url = request.url;

    if (
      url === "about:blank" ||
      url.startsWith(ALLOWED_ORIGIN)
    ) {
      return true;
    }

    Linking.openURL(url).catch(() => null);
    return false;
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0e13" />
      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        originWhitelist={["https://*"]}
        onMessage={handleMessage}
        onError={(event) =>
          console.error("[MATT Driver] WebView error:", event.nativeEvent)
        }
        onHttpError={(event) =>
          console.error("[MATT Driver] WebView HTTP error:", event.nativeEvent)
        }
        onShouldStartLoadWithRequest={handleNavigation}
        onOpenWindow={(event) =>
          Linking.openURL(event.nativeEvent.targetUrl).catch(() => null)
        }
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <Text style={styles.logo}>MATT</Text>
            <Text style={styles.loadingText}>Ładowanie MATT Driver…</Text>
          </View>
        )}
      />

      {paymentRequest && (
        <TerminalPaymentModal
          request={paymentRequest}
          onClose={closePayment}
          onSuccess={finishPayment}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b0e13"
  },
  webview: {
    flex: 1
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b0e13"
  },
  logo: {
    color: "#d4af37",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 3
  },
  loadingText: {
    marginTop: 12,
    color: "#f5f5f5",
    fontSize: 16
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(11,14,19,0.98)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: "#151923",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: "#343b49"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  kicker: {
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2
  },
  title: {
    marginTop: 5,
    color: "#fff",
    fontSize: 23,
    fontWeight: "800"
  },
  muted: {
    marginTop: 4,
    color: "#aeb5c0",
    fontSize: 14
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#232936",
    alignItems: "center",
    justifyContent: "center"
  },
  closeText: {
    color: "#fff",
    fontSize: 18
  },
  amountBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0f131b",
    borderWidth: 1,
    borderColor: "#2a303c"
  },
  label: {
    color: "#9ba3af",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  baseAmount: {
    marginTop: 7,
    color: "#fff",
    fontSize: 20,
    fontWeight: "800"
  },
  field: {
    marginTop: 14
  },
  input: {
    marginTop: 7,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a424f",
    backgroundColor: "#0f131b",
    color: "#fff",
    paddingHorizontal: 14,
    fontSize: 17
  },
  reasonInput: {
    minHeight: 76,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  totalRow: {
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#343b49",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  totalLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  },
  total: {
    color: "#d4af37",
    fontSize: 28,
    fontWeight: "900"
  },
  statusBox: {
    marginTop: 15,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#0f131b",
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  statusText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "700"
  },
  payButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#d4af37",
    alignItems: "center",
    justifyContent: "center"
  },
  payButtonDisabled: {
    opacity: 0.45
  },
  payButtonText: {
    color: "#0b0e13",
    fontSize: 16,
    fontWeight: "900"
  },
  helpText: {
    marginTop: 12,
    color: "#8f97a4",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center"
  }
});
