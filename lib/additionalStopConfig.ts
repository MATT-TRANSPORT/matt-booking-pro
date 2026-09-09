export const ADDITIONAL_STOP_FEE_B2C = 20;
export const ADDITIONAL_STOP_FEE_B2B_NET = 20;
export const ADDITIONAL_STOP_B2C_KM_RATE = 2.4;

export const AIRPORT_ROUTE_ADDRESSES: Record<string, string> = {
  pyrzowice: "Katowice Airport, Wolności 90, 42-625 Pyrzowice, Polska",
  balice: "Kraków Airport, Kapitana Mieczysława Medweckiego 1, 32-083 Balice, Polska",
  ostrawa: "Leoš Janáček Airport Ostrava, 742 51 Mošnov, Czechy",
  wroclaw: "Port Lotniczy Wrocław, Graniczna 190, 54-530 Wrocław, Polska",
  warszawa: "Lotnisko Chopina w Warszawie, Żwirki i Wigury 1, 00-906 Warszawa, Polska",
  prague: "Václav Havel Airport Prague, Aviatická, 161 00 Praha 6, Czechy",
  vienna: "Vienna International Airport, 1300 Schwechat, Austria"
};

export function additionalStopDirectionCount(input: {
  serviceType: string;
  primary: boolean;
  returnLeg: boolean;
}) {
  if (!input.primary && !input.returnLeg) return 0;
  if (input.serviceType !== "roundtrip") return input.primary ? 1 : 0;
  return Number(Boolean(input.primary)) + Number(Boolean(input.returnLeg));
}
