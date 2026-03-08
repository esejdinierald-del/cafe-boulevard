import { useState, useCallback } from "react";

// Boulevard Café Elbasan approximate coordinates
const CAFE_LAT = 41.114871;
const CAFE_LNG = 20.088804;
const MAX_DISTANCE_METERS = 75;

function getDistanceInMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type GeoResult = {
  allowed: boolean;
  error?: string;
};

const translations = {
  sq: {
    notSupported: "Pajisja juaj nuk e mbështet gjeolokacionin.",
    denied: "Ju lutem lejoni aksesin në vendndodhje për të përdorur këtë shërbim.",
    tooFar: "Duhet të jeni fizikisht në lokal për të përdorur këtë shërbim.",
    error: "Gabim në marrjen e vendndodhjes. Provoni përsëri.",
  },
  en: {
    notSupported: "Your device doesn't support geolocation.",
    denied: "Please allow location access to use this service.",
    tooFar: "You must be physically at the café to use this service.",
    error: "Error getting location. Please try again.",
  },
};

export function useGeolocation() {
  const [checking, setChecking] = useState(false);

  const checkLocation = useCallback((language: "sq" | "en"): Promise<GeoResult> => {
    const t = translations[language];
    setChecking(true);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setChecking(false);
        resolve({ allowed: false, error: t.notSupported });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const distance = getDistanceInMeters(
            position.coords.latitude,
            position.coords.longitude,
            CAFE_LAT,
            CAFE_LNG
          );
          setChecking(false);
          if (distance <= MAX_DISTANCE_METERS) {
            resolve({ allowed: true });
          } else {
            resolve({ allowed: false, error: t.tooFar });
          }
        },
        (error) => {
          setChecking(false);
          if (error.code === error.PERMISSION_DENIED) {
            resolve({ allowed: false, error: t.denied });
          } else {
            resolve({ allowed: false, error: t.error });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return { checkLocation, checking };
}
