let map;
let fountainMarker;
let stationLayer;
let userMarker;
let userRangeCircle;
let detailMap;
let detailRouteLayer;
let detailUserMarker;
let detailStationMarker;
let visibleStations = [];
let lastUserCoordinates = null;
let selectedStation = null;
let osmLoadTimer = null;
let isLoadingOsmStations = false;
let lastOsmBoundsKey = "";
let currentLanguage = getSavedLanguage();
let isLoggedIn = false;
let isDemoMode = false;
let authMode = "register";
let fbDb = null;
let currentUser = null;
let currentImpact = getDefaultImpactData();
let currentStationComments = [];

// ── Firebase setup ────────────────────────────────────────────────────────────
// HOW TO GET YOUR CONFIG (5 minutes):
//   1. Go to https://console.firebase.google.com → click "Add project" → name it "rewater"
//   2. In your project: click the </> (Web) icon → register the app → copy the config below
//   3. Left sidebar → Build → Authentication → Get started
//      → Sign-in method → enable "Google" and "Email/Password"
//   4. Authentication → Settings → Authorized domains
//      → add your Cloudflare / GitHub Pages domain
// Then paste your values here:
const firebaseConfig = {
  apiKey:            "AIzaSyANkFJ9JhC3RSMdoNUot_faQsdw_dVGiQg",
  authDomain:        "rewater-a4a5c.firebaseapp.com",
  projectId:         "rewater-a4a5c",
  storageBucket:     "rewater-a4a5c.firebasestorage.app",
  messagingSenderId: "210338409760",
  appId:             "1:210338409760:web:0cabeaa550f5b23745bb45",
  measurementId:     "G-M08EWCF6FL"
};

const firebaseReady = Boolean(firebaseConfig.apiKey);
let fbAuth = null;
let googleProvider = null;

if (firebaseReady) {
  firebase.initializeApp(firebaseConfig);
  fbAuth = firebase.auth();
  fbDb = firebase.firestore();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.addScope("email");
  googleProvider.addScope("profile");
}

const nearMeRadiusMeters = 10000;
const baselFountainsUrl = "https://data.bs.ch/api/explore/v2.1/catalog/datasets/100008/records";
const overpassUrls = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
const baselCityBounds = {
  south: 47.51,
  west: 7.54,
  north: 47.61,
  east: 7.7
};
const osmStationIds = new Set();
const refillStations = [
  {
    name: "Bürkliterrasse Brunnen",
    coordinates: [47.3669, 8.5412],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Lindenhof Brunnen",
    coordinates: [47.3732, 8.5408],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Sechseläutenplatz Fountain",
    coordinates: [47.3654, 8.5461],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Bern Bundesplatz Brunnen",
    coordinates: [46.9476, 7.4446],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Basel Münsterplatz Brunnen",
    coordinates: [47.5567, 7.5923],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Genève Jardin Anglais Fontaine",
    coordinates: [46.2044, 6.1505],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Lausanne Riponne Fontaine",
    coordinates: [46.5232, 6.6327],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Lugano Piazza Riforma Fountain",
    coordinates: [46.0037, 8.9511],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Luzern Kapellplatz Brunnen",
    coordinates: [47.0527, 8.3074],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "St. Gallen Marktplatz Brunnen",
    coordinates: [47.4245, 9.3767],
    color: "#2eb872",
    drinkable: true,
    free: true
  },
  {
    name: "Station cafe refill",
    coordinates: [47.3785, 8.5392],
    color: "#2f8fcb",
    drinkable: true,
    free: false
  },
  {
    name: "Museum lobby refill",
    coordinates: [46.9489, 7.4474],
    color: "#2f8fcb",
    drinkable: true,
    free: false
  },
  {
    name: "Decorative fountain",
    coordinates: [47.3659, 8.5408],
    color: "#e74c3c",
    drinkable: false,
    free: true
  },
  {
    name: "Unconfirmed refill point",
    coordinates: [47.3663, 8.5424],
    color: "#8d8d8d",
    drinkable: false,
    free: true
  }
];
const swissSearchPlaces = [
  {
    name: "Zürich",
    coordinates: [47.3769, 8.5417],
    aliases: ["zurich", "zuerich", "zürich"]
  },
  {
    name: "Genève",
    coordinates: [46.2044, 6.1432],
    aliases: ["geneva", "geneve", "genève", "genf"]
  },
  {
    name: "Bern",
    coordinates: [46.9481, 7.4474],
    aliases: ["bern", "berne"]
  },
  {
    name: "Basel",
    coordinates: [47.5596, 7.5886],
    aliases: ["basel", "bale"]
  },
  {
    name: "Lausanne",
    coordinates: [46.5197, 6.6323],
    aliases: ["lausanne"]
  },
  {
    name: "Winterthur",
    coordinates: [47.4999, 8.7376],
    aliases: ["winterthur"]
  },
  {
    name: "Luzern",
    coordinates: [47.0502, 8.3093],
    aliases: ["luzern", "lucerne", "luzeren"]
  },
  {
    name: "St. Gallen",
    coordinates: [47.4245, 9.3767],
    aliases: ["st gallen", "st. gallen", "sankt gallen"]
  },
  {
    name: "Lugano",
    coordinates: [46.0037, 8.9511],
    aliases: ["lugano"]
  },
  {
    name: "Biel/Bienne",
    coordinates: [47.1368, 7.2468],
    aliases: ["biel", "bienne", "biel bienne"]
  },
  {
    name: "Thun",
    coordinates: [46.7580, 7.6280],
    aliases: ["thun"]
  },
  {
    name: "Köniz",
    coordinates: [46.9244, 7.4146],
    aliases: ["koeniz", "köniz"]
  },
  {
    name: "La Chaux-de-Fonds",
    coordinates: [47.1035, 6.8328],
    aliases: ["la chaux de fonds", "chaux de fonds"]
  },
  {
    name: "Fribourg",
    coordinates: [46.8065, 7.1619],
    aliases: ["fribourg", "freiburg"]
  },
  {
    name: "Schaffhausen",
    coordinates: [47.6973, 8.6349],
    aliases: ["schaffhausen"]
  },
  {
    name: "Chur",
    coordinates: [46.8508, 9.5320],
    aliases: ["chur", "coire"]
  },
  {
    name: "Neuchâtel",
    coordinates: [46.9929, 6.9310],
    aliases: ["neuchatel", "neuchâtel"]
  },
  {
    name: "Sion",
    coordinates: [46.2331, 7.3606],
    aliases: ["sion", "sitten"]
  },
  {
    name: "Uster",
    coordinates: [47.3492, 8.7190],
    aliases: ["uster"]
  },
  {
    name: "Zug",
    coordinates: [47.1662, 8.5155],
    aliases: ["zug"]
  },
  {
    name: "Yverdon-les-Bains",
    coordinates: [46.7785, 6.6412],
    aliases: ["yverdon", "yverdon les bains"]
  },
  {
    name: "Rapperswil-Jona",
    coordinates: [47.2267, 8.8174],
    aliases: ["rapperswil", "rapperswil jona", "jona"]
  },
  {
    name: "Montreux",
    coordinates: [46.4312, 6.9107],
    aliases: ["montreux"]
  },
  {
    name: "Vevey",
    coordinates: [46.4628, 6.8419],
    aliases: ["vevey"]
  },
  {
    name: "Aarau",
    coordinates: [47.3925, 8.0442],
    aliases: ["aarau"]
  },
  {
    name: "Solothurn",
    coordinates: [47.2088, 7.5323],
    aliases: ["solothurn", "soleure"]
  },
  {
    name: "Olten",
    coordinates: [47.3490, 7.9033],
    aliases: ["olten"]
  },
  {
    name: "Baden",
    coordinates: [47.4738, 8.3088],
    aliases: ["baden"]
  },
  {
    name: "Frauenfeld",
    coordinates: [47.5578, 8.8989],
    aliases: ["frauenfeld"]
  },
  {
    name: "Bellinzona",
    coordinates: [46.1956, 9.0238],
    aliases: ["bellinzona"]
  },
  {
    name: "Locarno",
    coordinates: [46.1690, 8.7957],
    aliases: ["locarno"]
  },
  {
    name: "Davos",
    coordinates: [46.8027, 9.8359],
    aliases: ["davos"]
  },
  {
    name: "Interlaken",
    coordinates: [46.6863, 7.8632],
    aliases: ["interlaken"]
  }
];
let allStations = [...refillStations];

function getSavedLanguage() {
  try {
    return localStorage.getItem("rewater-language") || "en";
  } catch (error) {
    return "en";
  }
}

function saveLanguage(language) {
  try {
    localStorage.setItem("rewater-language", language);
  } catch (error) {
    // Some local previews block storage; the toggle should still work for the session.
  }
}

const translations = {
  en: {
    searchPlaceholder: "Search water station...",
    drinkable: "Drinkable",
    nearMe: "Near me",
    free: "Free",
    drinkableMapReady: "Showing drinkable refill stations across Switzerland.",
    freeMapReady: "Showing only public, free and drinkable refill stations within 10 km of you.",
    baselMapReady: "Showing real Basel public fountains from data.bs.ch.",
    baselMapFallback: "Basel live data could not be loaded, so saved demo stations are shown.",
    swissMapReady: "Showing Basel official fountains plus Swiss refill stations from OpenStreetMap.",
    swissMapFallback: "Swiss OpenStreetMap refill stations could not be loaded yet.",
    loadingPlaceStations: "Loading water stations near {place}...",
    noPhotoYet: "No photo yet",
    locating: "Asking for your location...",
    locationFound: "Showing refill stations within 10 km of you.",
    locationDenied: "Location permission is needed to show refill stations near you.",
    locationUnavailable: "Your location could not be found. Please check browser location settings.",
    noNearbyStations: "No saved station data was found nearby, so demo refill points are shown within 10 km.",
    findNearest: "Find nearest water",
    drinkableDistance: "Drinkable — 220 m away",
    fountainType: "Type: public fountain",
    route: "Route",
    details: "Details",
    backToMap: "← Back to map",
    safeToDrink: "Safe to drink",
    detailDescription: "Traditional flowing fountain.<br />Continuously running, always free.<br />Swiss public water network.",
    address: "Address",
    hours: "Hours",
    alwaysOpen: "Always open",
    lastChecked: "Last checked",
    communityChecked: "Community · 2 days ago",
    startNavigation: "Start navigation",
    recordRefill: "I refilled here",
    refillSaved: "Refill saved to your impact.",
    refillSaving: "Saving your refill...",
    refillRegistered: "Refill registered: {amount} ml saved {co2} kg CO₂ and CHF {money}.",
    refillSaveFailed: "Refill could not be saved. Please try again.",
    chooseRefillAmount: "How much did you refill?",
    customRefillLabel: "Custom amount in ml",
    saveCustomRefill: "Save",
    invalidRefillAmount: "Please enter a refill amount greater than 0 ml.",
    signInToTrack: "Sign in to track your refill impact.",
    reportIssue: "Report issue",
    commentsTitle: "Community notes",
    noCommentsYet: "No notes yet.",
    reportCommentLabel: "Share your experience",
    reportCommentPlaceholder: "Write up to 30 words",
    postComment: "Post",
    commentPosted: "Thanks, your note was posted.",
    commentPostFailed: "Your note could not be posted: {reason}",
    commentTooLong: "Please keep your note to 30 words or fewer.",
    readMore: "Read more",
    showLess: "Show less",
    savedTitle: "Saved fountains",
    savedSubtitle: "Your favorite refill spots",
    drinkableZurich: "Drinkable · Zürich",
    openDetails: "Open details",
    guideTitle: "Water guide",
    guideSubtitle: "For visitors to Switzerland",
    markersMean: "MAP MARKERS MEAN",
    safeUse: "Safe — use your bottle freely",
    notDrinkable: "Not drinkable",
    decorativeOnly: "Decorative only — do not drink",
    unclear: "Unclear",
    statusUnconfirmed: "Status not confirmed yet",
    goodToKnow: "GOOD TO KNOW",
    guideTipOne: "In Switzerland, most street fountains provide clean drinking water from the public network. Look for continuously flowing water — this is a good sign.",
    guideTipTwo: "Tap water in Switzerland meets very high standards. Refilling is free, safe, and avoids plastic waste.",
    openMap: "Open map",
    impactTitle: "My impact",
    impactSubtitle: "Track your refills & savings",
    welcomeBack: "Welcome back, {name}",
    signOut: "Sign out",
    demoSubtitle: "Demo preview",
    demoLabel: "Want to see what it looks like?",
    tryDemo: "Preview as demo user",
    demoBanner: "This is a preview — create an account to track your own impact.",
    exitDemo: "← Back to sign in",
    signInTitle: "Sign in to see your saved refills",
    signInText: "Your saved water refills, CO₂ saved and badges stay with your account.",
    signIn: "Sign in",
    createAccount: "Create account",
    backToImpact: "← Back",
    welcomeLabel: "Welcome",
    registerIntro: "Register to access your saved refills, impact stats, and refill history.",
    signInIntro: "Sign in to access your saved refills, impact stats, and refill history.",
    continueGoogle: "Continue with Google",
    continueEmail: "Use another email",
    emailAddress: "Email address",
    password: "Password",
    providerSuccess: "Signed in with {provider}. Your saved impact is ready.",
    emailSuccess: "Account ready. Welcome to ReWater!",
    accountOptional: "No account? You can still use the map — stats are optional.",
    bottlesRefilled: "Bottles refilled",
    co2Saved: "CO₂ saved",
    moneySaved: "Money saved",
    fountainsFound: "Fountains found",
    thisWeek: "THIS WEEK",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    badgesTitle: "BADGES",
    firstRefill: "First refill",
    tenBottles: "10 bottles",
    explorer: "Explorer",
    fiftyBottles: "50 bottles",
    swissLocal: "Swiss local",
    away: "away",
    allowLocationDistance: "Allow location for distance",
    loadingDistance: "Loading distance",
    searchResultsCount: "{count} matching fountains found.",
    authEmailInUse: "An account with this email already exists. Try signing in instead.",
    authInvalidEmail: "Please enter a valid email address.",
    authWeakPassword: "Password must be at least 6 characters.",
    authUserNotFound: "No account found for this email.",
    authWrongPassword: "Incorrect password. Please try again.",
    authInvalidCredential: "Incorrect email or password.",
    authFirebaseNotConfigured: "Firebase is not configured yet. Add your firebaseConfig values in script.js.",
    authGoogleFailed: "Google sign-in failed: ",
    navMap: "Maps",
    navSaved: "Saved",
    navInfo: "Info"
  },
  de: {
    searchPlaceholder: "Wasserstation suchen...",
    drinkable: "Trinkbar",
    nearMe: "In der Nähe",
    free: "Kostenlos",
    drinkableMapReady: "Trinkbare Nachfüllstationen in der ganzen Schweiz werden angezeigt.",
    freeMapReady: "Es werden nur öffentliche, kostenlose und trinkbare Nachfüllstationen im Umkreis von 10 km angezeigt.",
    baselMapReady: "Echte öffentliche Basler Brunnen von data.bs.ch werden angezeigt.",
    baselMapFallback: "Basel-Livedaten konnten nicht geladen werden, daher werden gespeicherte Demo-Stationen angezeigt.",
    swissMapReady: "Offizielle Basler Brunnen plus Schweizer Nachfüllstationen von OpenStreetMap werden angezeigt.",
    swissMapFallback: "Schweizer OpenStreetMap-Nachfüllstationen konnten noch nicht geladen werden.",
    loadingPlaceStations: "Wasserstationen in der Nähe von {place} werden geladen...",
    noPhotoYet: "Noch kein Foto",
    locating: "Standort wird angefragt...",
    locationFound: "Nachfüllstationen im Umkreis von 10 km werden angezeigt.",
    locationDenied: "Standortzugriff wird benötigt, um Nachfüllstationen in deiner Nähe zu zeigen.",
    locationUnavailable: "Dein Standort konnte nicht gefunden werden. Bitte prüfe die Standort-Einstellungen im Browser.",
    noNearbyStations: "Keine gespeicherten Stationsdaten in der Nähe gefunden, daher werden Demo-Nachfüllpunkte im Umkreis von 10 km angezeigt.",
    findNearest: "Nächstes Wasser finden",
    drinkableDistance: "Trinkbar — 220 m entfernt",
    fountainType: "Typ: öffentlicher Brunnen",
    route: "Route",
    details: "Details",
    backToMap: "← Zurück zur Karte",
    safeToDrink: "Trinkwasser",
    detailDescription: "Traditioneller Laufbrunnen.<br />Läuft dauerhaft und ist immer kostenlos.<br />Schweizer öffentliches Wassernetz.",
    address: "Adresse",
    hours: "Öffnungszeiten",
    alwaysOpen: "Immer geöffnet",
    lastChecked: "Zuletzt geprüft",
    communityChecked: "Community · vor 2 Tagen",
    startNavigation: "Navigation starten",
    recordRefill: "Hier nachgefüllt",
    refillSaved: "Nachfüllung wurde deinem Impact hinzugefügt.",
    refillSaving: "Deine Nachfüllung wird gespeichert...",
    refillRegistered: "Nachfüllung registriert: {amount} ml sparen {co2} kg CO₂ und CHF {money}.",
    refillSaveFailed: "Nachfüllung konnte nicht gespeichert werden. Bitte versuche es erneut.",
    chooseRefillAmount: "Wie viel hast du nachgefüllt?",
    customRefillLabel: "Eigene Menge in ml",
    saveCustomRefill: "Speichern",
    invalidRefillAmount: "Bitte gib eine Nachfüllmenge über 0 ml ein.",
    signInToTrack: "Melde dich an, um deinen Nachfüll-Impact zu speichern.",
    reportIssue: "Problem melden",
    commentsTitle: "Community-Notizen",
    noCommentsYet: "Noch keine Notizen.",
    reportCommentLabel: "Teile deine Erfahrung",
    reportCommentPlaceholder: "Schreibe bis zu 30 Wörter",
    postComment: "Posten",
    commentPosted: "Danke, deine Notiz wurde gepostet.",
    commentPostFailed: "Deine Notiz konnte nicht gepostet werden: {reason}",
    commentTooLong: "Bitte halte deine Notiz bei maximal 30 Wörtern.",
    readMore: "Mehr lesen",
    showLess: "Weniger anzeigen",
    savedTitle: "Gespeicherte Brunnen",
    savedSubtitle: "Deine liebsten Nachfüllorte",
    drinkableZurich: "Trinkbar · Zürich",
    openDetails: "Details öffnen",
    guideTitle: "Wasser-Guide",
    guideSubtitle: "Für Besucher der Schweiz",
    markersMean: "KARTENMARKIERUNGEN",
    safeUse: "Sicher — Flasche frei auffüllen",
    notDrinkable: "Nicht trinkbar",
    decorativeOnly: "Nur dekorativ — nicht trinken",
    unclear: "Unklar",
    statusUnconfirmed: "Status noch nicht bestätigt",
    goodToKnow: "GUT ZU WISSEN",
    guideTipOne: "In der Schweiz liefern die meisten Strassenbrunnen sauberes Trinkwasser aus dem öffentlichen Netz. Dauerhaft fliessendes Wasser ist ein gutes Zeichen.",
    guideTipTwo: "Leitungswasser in der Schweiz erfüllt sehr hohe Standards. Nachfüllen ist kostenlos, sicher und vermeidet Plastikabfall.",
    openMap: "Karte öffnen",
    impactTitle: "Mein Beitrag",
    impactSubtitle: "Nachfüllungen und Ersparnisse verfolgen",
    welcomeBack: "Willkommen zurück, {name}",
    signOut: "Abmelden",
    demoSubtitle: "Demo-Vorschau",
    demoLabel: "Möchtest du sehen, wie es aussieht?",
    tryDemo: "Als Demo-Nutzer ansehen",
    demoBanner: "Dies ist eine Vorschau — erstelle ein Konto, um deinen eigenen Impact zu tracken.",
    exitDemo: "← Zurück zur Anmeldung",
    signInTitle: "Einloggen, um gespeicherte Nachfüllungen zu sehen",
    signInText: "Deine gespeicherten Wasser-Nachfüllungen, CO₂-Ersparnis und Abzeichen bleiben in deinem Konto.",
    signIn: "Einloggen",
    createAccount: "Konto erstellen",
    backToImpact: "← Zurück",
    welcomeLabel: "Willkommen",
    registerIntro: "Registriere dich, um auf gespeicherte Nachfüllungen, Impact-Statistiken und Verlauf zuzugreifen.",
    signInIntro: "Melde dich an, um auf gespeicherte Nachfüllungen, Impact-Statistiken und Verlauf zuzugreifen.",
    continueGoogle: "Mit Google fortfahren",
    continueEmail: "Andere E-Mail verwenden",
    emailAddress: "E-Mail-Adresse",
    password: "Passwort",
    providerSuccess: "Mit {provider} angemeldet. Dein gespeicherter Impact ist bereit.",
    emailSuccess: "Konto bereit. Willkommen bei ReWater!",
    accountOptional: "Kein Konto? Du kannst die Karte trotzdem nutzen — Statistiken sind optional.",
    bottlesRefilled: "Flaschen nachgefüllt",
    co2Saved: "CO₂ gespart",
    moneySaved: "Geld gespart",
    fountainsFound: "Brunnen gefunden",
    thisWeek: "DIESE WOCHE",
    monday: "Mo",
    tuesday: "Di",
    wednesday: "Mi",
    thursday: "Do",
    friday: "Fr",
    badgesTitle: "ABZEICHEN",
    firstRefill: "Erste Nachfüllung",
    tenBottles: "10 Flaschen",
    explorer: "Entdecker",
    fiftyBottles: "50 Flaschen",
    swissLocal: "Schweizer Local",
    away: "entfernt",
    allowLocationDistance: "Standort für Distanz erlauben",
    loadingDistance: "Distanz wird geladen",
    searchResultsCount: "{count} passende Brunnen gefunden.",
    authEmailInUse: "Ein Konto mit dieser E-Mail existiert bereits. Bitte einloggen.",
    authInvalidEmail: "Bitte eine gültige E-Mail-Adresse eingeben.",
    authWeakPassword: "Passwort muss mindestens 6 Zeichen haben.",
    authUserNotFound: "Kein Konto für diese E-Mail gefunden.",
    authWrongPassword: "Falsches Passwort. Bitte erneut versuchen.",
    authInvalidCredential: "Falsche E-Mail oder falsches Passwort.",
    authFirebaseNotConfigured: "Firebase ist noch nicht konfiguriert. Bitte firebaseConfig in script.js ergänzen.",
    authGoogleFailed: "Google-Anmeldung fehlgeschlagen: ",
    navMap: "Maps",
    navSaved: "Gespeichert",
    navInfo: "Info"
  }
};

function applyLanguage(language) {
  const dictionary = translations[language];

  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.innerHTML = dictionary[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    const key = element.dataset.i18nPlaceholder;
    if (dictionary[key]) {
      element.placeholder = dictionary[key];
    }
  });

  document.querySelectorAll(".language-toggle").forEach(button => {
    button.textContent = language === "en" ? "🇨🇭" : "🇬🇧";
    button.setAttribute("aria-label", language === "en" ? "Auf Deutsch wechseln" : "Switch to English");
    button.title = language === "en" ? "Deutsch" : "English";
  });

  const impactSubtitle = document.getElementById("impact-subtitle");
  impactSubtitle.textContent = isLoggedIn
    ? dictionary.welcomeBack.replace("{name}", document.getElementById("user-display-name").textContent.split(" ")[0] || "")
    : dictionary.impactSubtitle;

  const authView = document.getElementById("auth-view");
  const authIntro = document.getElementById("auth-intro");

  if (authView && authIntro && !authView.classList.contains("hidden")) {
    const introKey = authMode === "signin" ? "signInIntro" : "registerIntro";
    authIntro.textContent = dictionary[introKey];
  }

  renderStationComments(currentStationComments);
  updateReportWordCount();
}

function toggleLanguage() {
  currentLanguage = currentLanguage === "en" ? "de" : "en";
  saveLanguage(currentLanguage);
  applyLanguage(currentLanguage);
}

function initMap() {
  const basel = [47.5596, 7.5886];

  map = L.map("map", {
    zoomControl: false
  }).setView(basel, 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  stationLayer = L.layerGroup().addTo(map);
  showDrinkableStations();
  loadBaselFountains();
  setupVisibleSwissStationLoading();
}

function createMarkerIcon(color) {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 26px;
        height: 26px;
        background: ${color};
        border: 3px solid #f4f1ec;
        border-radius: 50%;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.25);
      "></div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function createPersonLocationIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="person-location-marker"><span></span></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function renderStations(stations) {
  stationLayer.clearLayers();
  visibleStations = stations;
  fountainMarker = null;

  stations.forEach((station, index) => {
    const marker = L.marker(station.coordinates, { icon: createMarkerIcon(station.color) }).addTo(stationLayer);
    marker.on("click", () => showMarkerCard(station));

    if (index === 0 || station.name === "Bürkliterrasse Brunnen") {
      fountainMarker = marker;
    }

    marker.bindPopup(`<strong>${escapeHtml(station.name)}</strong>`);
  });
}

async function loadBaselFountains() {
  let baselStations = [];

  try {
    const records = await fetchBaselFountainRecords();
    baselStations = normalizeBaselRecords(records);

    if (baselStations.length === 0) {
      throw new Error("No Basel fountain coordinates found");
    }

    allStations = baselStations;
    renderStations(allStations);
    fitMapToStations(allStations, 15);
    showNearMeStatus(translations[currentLanguage].baselMapReady);
  } catch (error) {
    console.warn(error);
    showNearMeStatus(translations[currentLanguage].baselMapFallback);
  }
}

async function fetchBaselFountainRecords() {
  const pageSize = 100;
  let offset = 0;
  let totalCount = Infinity;
  const records = [];

  while (offset < totalCount) {
    const url = `${baselFountainsUrl}?limit=${pageSize}&offset=${offset}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Basel data request failed with ${response.status}`);
    }

    const data = await response.json();
    const pageRecords = data.results || data.records || [];
    totalCount = data.total_count || records.length + pageRecords.length;
    records.push(...pageRecords);

    if (pageRecords.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return records;
}

function normalizeBaselRecords(records) {
  return records
    .map((record, index) => {
      const fields = record.fields || record.record?.fields || record;
      const coordinates = getRecordCoordinates(record, fields);

      if (!coordinates) {
        return null;
      }

      const stationType = getFirstTextValue(fields, [
        "typ",
        "brunnentyp",
        "kategorie",
        "art",
        "nutzung"
      ]) || "public fountain";

      return {
        name: getFirstTextValue(fields, [
          "name",
          "brunnenname",
          "bezeichnung",
          "objektname",
          "standort",
          "adresse"
        ]) || `Basel fountain ${index + 1}`,
        coordinates,
        color: "#2eb872",
        drinkable: true,
        free: true,
        type: stationType,
        description: getFirstTextValue(fields, ["desc", "beschreibung", "adresse", "standort"]),
        imageUrl: getRecordImageUrl(fields),
        source: "data.bs.ch"
      };
    })
    .filter(Boolean);
}

function setupVisibleSwissStationLoading() {
  map.on("moveend zoomend", scheduleVisibleSwissStationLoad);
}

function scheduleVisibleSwissStationLoad() {
  clearTimeout(osmLoadTimer);
  osmLoadTimer = setTimeout(loadVisibleSwissOsmFountains, 700);
}

async function loadVisibleSwissOsmFountains() {
  if (!map || isLoadingOsmStations || map.getZoom() < 12) {
    return;
  }

  const bounds = map.getBounds();

  if (!boundsTouchesSwitzerland(bounds) || isBoundsInsideBaselCity(bounds)) {
    return;
  }

  const boundsKey = getBoundsCacheKey(bounds);
  if (boundsKey === lastOsmBoundsKey) {
    return;
  }

  lastOsmBoundsKey = boundsKey;
  isLoadingOsmStations = true;

  try {
    const osmStations = normalizeOsmElements(await fetchSwissOsmFountains(bounds));
    const nonBaselOsmStations = osmStations.filter(station => !isInsideBaselCity(station.coordinates));
    const newStations = nonBaselOsmStations.filter(station => {
      if (osmStationIds.has(station.osmId)) {
        return false;
      }

      osmStationIds.add(station.osmId);
      return true;
    });

    if (newStations.length > 0) {
      allStations = [...allStations, ...newStations];
      renderStations(allStations.filter(station => station.drinkable));
    }
  } catch (error) {
    console.warn(error);
  } finally {
    isLoadingOsmStations = false;
  }
}

async function fetchSwissOsmFountains(bounds) {
  const bbox = getOverpassBounds(bounds);
  const query = `
    [out:json][timeout:12];
    area["ISO3166-1"="CH"][admin_level=2]->.switzerland;
    (
      node(area.switzerland)(${bbox})["amenity"="drinking_water"];
      node(area.switzerland)(${bbox})["man_made"="water_tap"];
      node(area.switzerland)(${bbox})["amenity"="fountain"]["drinking_water"="yes"];
    )->.refillStations;
    (
      .refillStations;
      way(around.refillStations:55)["highway"]["name"];
    );
    out geom 360;
  `;
  for (const url of overpassUrls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`OpenStreetMap request failed with ${response.status}`);
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      console.warn(error);
    }
  }

  throw new Error("All OpenStreetMap refill station requests failed");
}

function normalizeOsmElements(elements) {
  const seenCoordinates = new Set();
  const nearbyStreets = getOsmStreetContexts(elements);

  return elements
    .filter(element => element.type === "node")
    .map((element, index) => {
      const coordinates = getOsmCoordinates(element);

      if (!coordinates || !isInsideSwitzerlandBounds(coordinates)) {
        return null;
      }

      const coordinateKey = coordinates.map(value => value.toFixed(5)).join(",");
      if (seenCoordinates.has(coordinateKey)) {
        return null;
      }
      seenCoordinates.add(coordinateKey);

      const tags = element.tags || {};
      const nearestStreet = findNearestOsmStreet(coordinates, nearbyStreets);
      const stationName = getOsmStationName(tags, coordinates, nearestStreet);
      const description = getOsmStationDescription(tags, stationName, nearestStreet);

      return {
        osmId: `${element.type}-${element.id}`,
        name: stationName,
        coordinates,
        color: "#2eb872",
        drinkable: true,
        free: true,
        type: tags.amenity === "fountain" ? "public fountain" : "drinking water refill point",
        description,
        imageUrl: getOsmImageUrl(tags),
        source: "OpenStreetMap"
      };
    })
    .filter(Boolean);
}

function getOsmCoordinates(element) {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) {
    return [element.lat, element.lon];
  }

  if (element.center && Number.isFinite(element.center.lat) && Number.isFinite(element.center.lon)) {
    return [element.center.lat, element.center.lon];
  }

  return null;
}

function getOsmImageUrl(tags) {
  const image = tags.image || tags.wikimedia_commons;

  if (typeof image === "string" && /^https?:\/\//i.test(image)) {
    return image;
  }

  return "";
}

function getOsmStationName(tags, coordinates, nearestStreet) {
  const explicitName = getFirstTextValue(tags, [
    "name",
    "name:de",
    "name:fr",
    "name:it",
    "official_name",
    "operator",
    "brand"
  ]);

  if (explicitName) {
    return explicitName;
  }

  const addressStreet = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  if (addressStreet) {
    return `Refill station at ${addressStreet}`;
  }

  if (nearestStreet) {
    return `Refill station at ${nearestStreet.name}`;
  }

  const placeName = getFirstTextValue(tags, [
    "addr:place",
    "addr:city",
    "addr:village",
    "addr:municipality",
    "place",
    "loc_name"
  ]);

  if (placeName) {
    return `Refill station in ${placeName}`;
  }

  const context = getFirstTextValue(tags, [
    "tourism",
    "leisure",
    "amenity",
    "man_made"
  ]).replace(/_/g, " ");

  if (context) {
    return `${capitalizeWords(context)} refill station`;
  }

  return `Refill station near ${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}`;
}

function getOsmStationDescription(tags, stationName, nearestStreet) {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const place = [tags["addr:postcode"], tags["addr:city"] || tags["addr:village"] || tags["addr:municipality"]].filter(Boolean).join(" ");
  const address = [street, place].filter(Boolean).join(", ");

  if (address) {
    return address;
  }

  if (stationName.startsWith("Refill station in ")) {
    return stationName.replace("Refill station in ", "");
  }

  if (stationName.startsWith("Refill station at ")) {
    return stationName.replace("Refill station at ", "");
  }

  const operator = getFirstTextValue(tags, ["operator", "brand"]);
  if (operator) {
    return `${operator} refill point`;
  }

  if (nearestStreet) {
    return `Near ${nearestStreet.name}`;
  }

  const stationType = getFirstTextValue(tags, ["amenity", "man_made"]).replace(/_/g, " ");
  return stationType
    ? `OpenStreetMap ${stationType} in Switzerland.`
    : "OpenStreetMap refill point in Switzerland.";
}

function getOsmStreetContexts(elements) {
  return elements
    .filter(element => element.type === "way" && element.tags?.name && Array.isArray(element.geometry))
    .map(element => ({
      name: element.tags.name.trim(),
      geometry: element.geometry
        .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon))
        .map(point => [point.lat, point.lon])
    }))
    .filter(street => street.name && street.geometry.length > 0);
}

function findNearestOsmStreet(coordinates, streets) {
  let nearestStreet = null;
  let nearestDistance = Infinity;

  streets.forEach(street => {
    street.geometry.forEach(point => {
      const distance = getApproximateDistanceMeters(coordinates, point);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestStreet = street;
      }
    });
  });

  return nearestDistance <= 80 ? nearestStreet : null;
}

function getApproximateDistanceMeters(firstCoordinates, secondCoordinates) {
  const [firstLat, firstLng] = firstCoordinates;
  const [secondLat, secondLng] = secondCoordinates;
  const latMeters = (firstLat - secondLat) * 111320;
  const lngMeters = (firstLng - secondLng) * 111320 * Math.cos(firstLat * Math.PI / 180);
  return Math.sqrt((latMeters * latMeters) + (lngMeters * lngMeters));
}

function capitalizeWords(value) {
  return value.replace(/\b\w/g, character => character.toUpperCase());
}

function isInsideBaselCity(coordinates) {
  const [lat, lng] = coordinates;
  return lat >= baselCityBounds.south
    && lat <= baselCityBounds.north
    && lng >= baselCityBounds.west
    && lng <= baselCityBounds.east;
}

function isBoundsInsideBaselCity(bounds) {
  return bounds.getSouth() >= baselCityBounds.south
    && bounds.getNorth() <= baselCityBounds.north
    && bounds.getWest() >= baselCityBounds.west
    && bounds.getEast() <= baselCityBounds.east;
}

function boundsTouchesSwitzerland(bounds) {
  return bounds.getNorth() >= 45.75
    && bounds.getSouth() <= 47.85
    && bounds.getEast() >= 5.85
    && bounds.getWest() <= 10.65;
}

function getOverpassBounds(bounds) {
  const south = Math.max(bounds.getSouth(), 45.75).toFixed(5);
  const west = Math.max(bounds.getWest(), 5.85).toFixed(5);
  const north = Math.min(bounds.getNorth(), 47.85).toFixed(5);
  const east = Math.min(bounds.getEast(), 10.65).toFixed(5);
  return `${south},${west},${north},${east}`;
}

function getBoundsCacheKey(bounds) {
  const center = bounds.getCenter();
  return `${map.getZoom()}-${center.lat.toFixed(2)}-${center.lng.toFixed(2)}`;
}

function isInsideSwitzerlandBounds(coordinates) {
  const [lat, lng] = coordinates;
  return lat >= 45.75 && lat <= 47.85 && lng >= 5.85 && lng <= 10.65;
}

function getRecordImageUrl(fields) {
  const mediaUrl = fields.gx_media_links?.url;

  if (typeof mediaUrl === "string" && mediaUrl.trim()) {
    return mediaUrl.trim();
  }

  const pictureLink = fields.picture_link;

  if (typeof pictureLink === "string" && pictureLink.trim()) {
    return pictureLink.trim();
  }

  return "";
}

function getRecordCoordinates(record, fields) {
  const geometryCoordinates = record.geometry?.coordinates
    || record.geometry?.geometry?.coordinates
    || fields.geometry?.geometry?.coordinates
    || fields.geo_shape?.geometry?.coordinates;

  if (Array.isArray(geometryCoordinates) && geometryCoordinates.length >= 2) {
    return [geometryCoordinates[1], geometryCoordinates[0]];
  }

  const point = fields.geo_point_2d || fields.geopoint || fields.geo_point || fields.koordinaten;

  if (Array.isArray(point) && point.length >= 2) {
    return [Number(point[0]), Number(point[1])];
  }

  if (point && typeof point === "object" && "lat" in point && "lon" in point) {
    return [Number(point.lat), Number(point.lon)];
  }

  if (typeof point === "string") {
    const [lat, lng] = point.split(",").map(value => Number(value.trim()));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }
  }

  return null;
}

function getFirstTextValue(fields, keys) {
  for (const key of keys) {
    const value = fields[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function selectDrinkable(chip) {
  setActiveFilterChip(chip);
  showDrinkableStations();
}

function selectFree(chip) {
  setActiveFilterChip(chip);

  if (lastUserCoordinates) {
    showNearbyStationsFromCoordinates(lastUserCoordinates, true);
    return;
  }

  showNearMeStatus(translations[currentLanguage].locating);

  if (!navigator.geolocation) {
    showNearMeStatus(translations[currentLanguage].locationUnavailable);
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    const userCoordinates = [position.coords.latitude, position.coords.longitude];
    lastUserCoordinates = userCoordinates;
    showNearbyStationsFromCoordinates(userCoordinates, true);
  }, handleLocationError, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000
  });
}

function showDrinkableStations() {
  clearUserRange();

  const drinkableStations = allStations.filter(station => station.drinkable);
  renderStations(drinkableStations);
  fitMapToStations(drinkableStations, 15);
  const message = allStations.some(station => station.source === "data.bs.ch")
    ? translations[currentLanguage].baselMapReady
    : translations[currentLanguage].drinkableMapReady;
  showNearMeStatus(message);
}

function fitMapToStations(stations, maxZoom = 13) {
  if (stations.length === 0) {
    return;
  }

  const bounds = L.latLngBounds(stations.map(station => station.coordinates));
  map.fitBounds(bounds, { padding: [28, 28], maxZoom });
}

function selectNearMe(chip) {
  setActiveFilterChip(chip);

  if (lastUserCoordinates) {
    showNearbyStationsFromCoordinates(lastUserCoordinates);
    return;
  }

  showNearMeStatus(translations[currentLanguage].locating);

  if (!navigator.geolocation) {
    showNearMeStatus(translations[currentLanguage].locationUnavailable);
    return;
  }

  navigator.geolocation.getCurrentPosition(showNearbyStations, handleLocationError, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000
  });
}

function showNearbyStations(position) {
  const userCoordinates = [position.coords.latitude, position.coords.longitude];
  lastUserCoordinates = userCoordinates;
  showNearbyStationsFromCoordinates(userCoordinates);
}

function showNearbyStationsFromCoordinates(userCoordinates, freeOnly = false) {
  const nearbyStations = allStations.filter(station => {
    const isInsideRange = map.distance(userCoordinates, station.coordinates) <= nearMeRadiusMeters;
    const matchesFreeFilter = !freeOnly || (station.drinkable && station.free);
    return isInsideRange && matchesFreeFilter;
  });
  const demoStations = createDemoStationsNear(userCoordinates);
  const demoStationsToRender = freeOnly
    ? demoStations.filter(station => station.drinkable && station.free)
    : demoStations;
  const stationsToRender = nearbyStations.length > 0 ? nearbyStations : demoStationsToRender;

  renderStations(stationsToRender);
  drawUserRange(userCoordinates);

  const bounds = L.latLngBounds([userCoordinates]);
  stationsToRender.forEach(station => bounds.extend(station.coordinates));
  bounds.extend(userRangeCircle.getBounds().getNorthEast());
  bounds.extend(userRangeCircle.getBounds().getSouthWest());
  map.fitBounds(bounds, { padding: [22, 22], maxZoom: 13 });

  const message = freeOnly
    ? translations[currentLanguage].freeMapReady
    : nearbyStations.length > 0
      ? translations[currentLanguage].locationFound
      : translations[currentLanguage].noNearbyStations;
  showNearMeStatus(message);
}

function setActiveFilterChip(chip) {
  document.querySelectorAll(".filter-row .chip").forEach(item => item.classList.remove("active"));
  chip.classList.add("active");
}

function clearUserRange() {
  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }

  if (userRangeCircle) {
    userRangeCircle.remove();
    userRangeCircle = null;
  }
}

function drawUserRange(userCoordinates) {
  clearUserRange();

  userMarker = L.marker(userCoordinates, {
    icon: L.divIcon({
      className: "",
      html: '<div class="user-location-marker"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    })
  }).addTo(map);

  userRangeCircle = L.circle(userCoordinates, {
    radius: nearMeRadiusMeters,
    color: "#287cff",
    weight: 2,
    fillColor: "#287cff",
    fillOpacity: 0.09
  }).addTo(map);
}

function createDemoStationsNear(userCoordinates) {
  const [lat, lng] = userCoordinates;

  return [
    {
      name: "Nearby refill point",
      coordinates: [lat + 0.009, lng + 0.006],
      color: "#2eb872",
      drinkable: true,
      free: true
    },
    {
      name: "Park water fountain",
      coordinates: [lat - 0.014, lng + 0.01],
      color: "#2eb872",
      drinkable: true,
      free: true
    },
    {
      name: "Public square fountain",
      coordinates: [lat + 0.018, lng - 0.012],
      color: "#2eb872",
      drinkable: true,
      free: true
    },
    {
      name: "Unconfirmed refill point",
      coordinates: [lat - 0.022, lng - 0.014],
      color: "#8d8d8d",
      drinkable: false,
      free: true
    }
  ];
}

function handleLocationError(error) {
  const permissionDenied = error.code === error.PERMISSION_DENIED;
  const message = permissionDenied
    ? translations[currentLanguage].locationDenied
    : translations[currentLanguage].locationUnavailable;

  showNearMeStatus(message);
}

function showNearMeStatus(message) {
  const status = document.getElementById("near-me-status");
  status.textContent = message;
  status.classList.remove("hidden");
}

function showMarkerCard(station = selectedStation || visibleStations[0]) {
  if (!station) {
    return;
  }

  selectedStation = station;
  const markerCard = document.getElementById("marker-card");
  markerCard.querySelector("h2").textContent = station.name;
  markerCard.querySelector("[data-i18n='drinkableDistance']").textContent = getStationStatusText(station);
  markerCard.querySelector(".info-box").textContent = station.description || `Type: ${station.type || "public fountain"}`;
  markerCard.classList.remove("hidden");
}

function hideMarkerCard() {
  document.getElementById("marker-card").classList.add("hidden");
}

function startNavigationToSelectedStation() {
  const station = selectedStation || visibleStations[0];

  if (!station) {
    return;
  }

  selectedStation = station;
  openGoogleMapsDirections(station);
}

function openGoogleMapsDirections(station) {
  const [lat, lng] = station.coordinates;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener");
}

function findNearestWater() {
  showMarkerCard();

  if (!map || visibleStations.length === 0) {
    return;
  }

  let nearestStation = visibleStations[0];

  if (userMarker) {
    const userCoordinates = userMarker.getLatLng();
    nearestStation = visibleStations.reduce((nearest, station) => {
      const nearestDistance = map.distance(userCoordinates, nearest.coordinates);
      const stationDistance = map.distance(userCoordinates, station.coordinates);
      return stationDistance < nearestDistance ? station : nearest;
    }, visibleStations[0]);
  }

  map.setView(nearestStation.coordinates, 16);
  showMarkerCard(nearestStation);
}

function handleStationSearch(event) {
  const query = event.target.value.trim().toLowerCase();

  if (!query) {
    showDrinkableStations();
    return;
  }

  clearUserRange();
  const matchingStations = allStations.filter(station => {
    const searchableText = `${station.name} ${station.description || ""} ${station.type || ""}`.toLowerCase();
    return searchableText.includes(query);
  });

  if (matchingStations.length === 0) {
    const matchingPlace = getMatchingSwissSearchPlace(query);
    if (matchingPlace) {
      focusSwissSearchPlace(matchingPlace);
      return;
    }
  }

  renderStations(matchingStations);
  fitMapToStations(matchingStations, 16);
  const countLabel = translations[currentLanguage].searchResultsCount.replace("{count}", matchingStations.length);
  showNearMeStatus(countLabel);
}

function getMatchingSwissSearchPlace(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 3) {
    return null;
  }

  return swissSearchPlaces.find(place =>
    place.aliases.some(alias => {
      const normalizedAlias = normalizeSearchText(alias);
      return normalizedAlias === normalizedQuery
        || normalizedAlias.startsWith(normalizedQuery)
        || normalizedQuery.startsWith(normalizedAlias);
    })
  );
}

function normalizeSearchText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function focusSwissSearchPlace(place) {
  clearUserRange();
  map.setView(place.coordinates, 14);
  showNearMeStatus(translations[currentLanguage].loadingPlaceStations.replace("{place}", place.name));
  scheduleVisibleSwissStationLoad();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function showPage(pageName) {
  const pages = document.querySelectorAll(".page");
  pages.forEach(page => page.classList.remove("active"));

  document.getElementById(`page-${pageName}`).classList.add("active");

  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => item.classList.remove("active"));

  const navMap = {
    map: 0,
    saved: 1,
    info: 2,
    me: 1,
    detail: 0
  };

  navItems[navMap[pageName]].classList.add("active");

  if (pageName === "me") {
    // Demo mode is NOT preserved when nav is tapped — always reset to sign-in
    if (!isLoggedIn) {
      isDemoMode = false;
      showLoggedOutView();
    }
    // If truly logged in, the logged-in-view is already visible — do nothing extra
  }

  if (pageName === "map") {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }

  if (pageName === "detail") {
    updateDetailPage();
    setTimeout(() => {
      renderDetailRouteMap();
    }, 100);
  }
}

function updateDetailPage() {
  if (!selectedStation) {
    return;
  }

  const detailPage = document.getElementById("page-detail");
  detailPage.querySelector("h1").textContent = selectedStation.name;
  detailPage.querySelector(".dashed-box").textContent = selectedStation.description || "Public Basel fountain. Data source: data.bs.ch.";

  const values = detailPage.querySelectorAll(".value");
  values[0].textContent = selectedStation.description || "Basel";
  values[1].textContent = translations[currentLanguage].alwaysOpen;
  values[2].textContent = selectedStation.source || "Community data";
  updateStationPhoto(selectedStation);

  const navigationButton = detailPage.querySelector(".primary-btn");
  navigationButton.onclick = () => openGoogleMapsDirections(selectedStation);

  resetRefillConfirmation();
  setDetailRefillStatus("");
  hideRefillAmountOptions();
  hideReportIssueBox();
  loadStationComments(selectedStation);
}

function initDetailMap() {
  if (detailMap) {
    return;
  }

  detailMap = L.map("detail-route-map", {
    zoomControl: false,
    dragging: true,
    scrollWheelZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(detailMap);

  detailRouteLayer = L.layerGroup().addTo(detailMap);
}

function renderDetailRouteMap() {
  if (!selectedStation) {
    return;
  }

  initDetailMap();
  detailMap.invalidateSize();
  detailRouteLayer.clearLayers();
  updateDetailDistanceBadge(null);

  detailStationMarker = L.marker(selectedStation.coordinates, {
    icon: createMarkerIcon(selectedStation.color || "#2eb872"),
    zIndexOffset: 500
  }).addTo(detailRouteLayer);

  const knownUserCoordinates = lastUserCoordinates || null;

  if (knownUserCoordinates) {
    drawDetailRoute(knownUserCoordinates, selectedStation.coordinates);
    return;
  }

  if (!navigator.geolocation) {
    detailMap.setView(selectedStation.coordinates, 16);
    updateDetailDistanceBadge(null, true);
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    const userCoordinates = [position.coords.latitude, position.coords.longitude];
    lastUserCoordinates = userCoordinates;
    drawDetailRoute(userCoordinates, selectedStation.coordinates);
  }, () => {
    detailMap.setView(selectedStation.coordinates, 16);
    updateDetailDistanceBadge(null, true);
  }, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000
  });
}

function drawDetailRoute(userCoordinates, stationCoordinates) {
  detailUserMarker = L.marker(userCoordinates, {
    icon: createPersonLocationIcon(),
    zIndexOffset: 600
  }).addTo(detailRouteLayer);

  L.polyline([userCoordinates, stationCoordinates], {
    color: "#287cff",
    weight: 4,
    opacity: 0.72,
    dashArray: "8 8",
    lineCap: "round",
    lineJoin: "round"
  }).addTo(detailRouteLayer);
  detailStationMarker.bringToFront();
  detailUserMarker.bringToFront();
  updateDetailDistanceBadge(detailMap.distance(userCoordinates, stationCoordinates));

  const bounds = L.latLngBounds([userCoordinates, stationCoordinates]);
  bounds.extend(userCoordinates);
  bounds.extend(stationCoordinates);
  detailMap.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
}

function updateDetailDistanceBadge(distanceMeters, unavailable = false) {
  const badge = document.getElementById("detail-distance-badge");

  if (!badge) {
    return;
  }

  if (unavailable) {
    badge.textContent = translations[currentLanguage].allowLocationDistance;
    return;
  }

  if (typeof distanceMeters !== "number") {
    badge.textContent = translations[currentLanguage].loadingDistance;
    return;
  }

  const distanceText = distanceMeters >= 1000
    ? `${(distanceMeters / 1000).toFixed(1)} km`
    : `${Math.round(distanceMeters)} m`;
  badge.textContent = `${distanceText} ${translations[currentLanguage].away}`;
}

function updateStationPhoto(station) {
  const photoWrap = document.getElementById("station-photo-wrap");
  const photo = document.getElementById("station-photo");
  const placeholder = document.getElementById("station-photo-placeholder");

  if (!station.imageUrl) {
    photo.removeAttribute("src");
    photo.alt = "";
    photo.classList.add("hidden");
    placeholder.textContent = translations[currentLanguage].noPhotoYet;
    placeholder.classList.remove("hidden");
    photoWrap.classList.remove("hidden");
    return;
  }

  photo.src = station.imageUrl;
  photo.alt = station.name;
  photo.classList.remove("hidden");
  placeholder.classList.add("hidden");
  photoWrap.classList.remove("hidden");
}

function getStationStatusText(station) {
  if (!station.drinkable) {
    return translations[currentLanguage].notDrinkable;
  }

  if (lastUserCoordinates && map) {
    const distance = map.distance(lastUserCoordinates, station.coordinates);
    const distanceText = distance >= 1000
      ? `${(distance / 1000).toFixed(1)} km`
      : `${Math.round(distance)} m`;
    return `${translations[currentLanguage].drinkable} - ${distanceText} ${translations[currentLanguage].away}`;
  }

  return `${translations[currentLanguage].drinkable} - Basel`;
}

function getDefaultImpactData() {
  return {
    bottlesRefilled: 0,
    co2SavedKg: 0,
    moneySavedChf: 0,
    totalRefillMl: 0,
    savedStationIds: [],
    savedStations: [],
    weeklyRefills: {
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0
    }
  };
}

function normalizeImpactData(data = {}) {
  const defaults = getDefaultImpactData();
  return {
    bottlesRefilled: Number(data.bottlesRefilled) || defaults.bottlesRefilled,
    co2SavedKg: Number(data.co2SavedKg) || defaults.co2SavedKg,
    moneySavedChf: Number(data.moneySavedChf) || defaults.moneySavedChf,
    totalRefillMl: Number(data.totalRefillMl) || defaults.totalRefillMl,
    savedStationIds: Array.isArray(data.savedStationIds) ? data.savedStationIds : defaults.savedStationIds,
    savedStations: Array.isArray(data.savedStations) ? data.savedStations : defaults.savedStations,
    weeklyRefills: {
      ...defaults.weeklyRefills,
      ...(data.weeklyRefills || {})
    }
  };
}

async function loadUserImpact(user) {
  if (!fbDb || !user) {
    currentImpact = getDefaultImpactData();
    updateImpactDashboard(currentImpact);
    return;
  }

  const userRef = fbDb.collection("users").doc(user.uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    currentImpact = getDefaultImpactData();
    await userRef.set({
      ...currentImpact,
      email: user.email || "",
      displayName: user.displayName || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    currentImpact = normalizeImpactData(snapshot.data());
    await userRef.set({
      email: user.email || "",
      displayName: user.displayName || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  updateImpactDashboard(currentImpact);
}

async function saveUserImpact() {
  if (!fbDb || !currentUser) {
    return;
  }

  await fbDb.collection("users").doc(currentUser.uid).set({
    ...currentImpact,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

function showRefillAmountOptions() {
  if (!selectedStation) {
    return;
  }

  if (!currentUser) {
    showPage("me");
    showAuthOptions("signin");
    setAuthStatus(translations[currentLanguage].signInToTrack);
    return;
  }

  const panel = document.getElementById("refill-amount-panel");
  if (panel) {
    panel.classList.remove("hidden");
  }
  setDetailRefillStatus(translations[currentLanguage].chooseRefillAmount);
}

function hideRefillAmountOptions() {
  const panel = document.getElementById("refill-amount-panel");
  if (panel) {
    panel.classList.add("hidden");
  }
}

function recordCustomRefillAmount() {
  const input = document.getElementById("custom-refill-ml");
  const amountMl = Number(input?.value);
  recordRefillAtSelectedStation(amountMl);
}

async function recordRefillAtSelectedStation(amountMl) {
  if (!selectedStation) {
    return;
  }

  if (!currentUser) {
    showPage("me");
    showAuthOptions("signin");
    setAuthStatus(translations[currentLanguage].signInToTrack);
    return;
  }

  const refillMl = Math.round(Number(amountMl));
  if (!Number.isFinite(refillMl) || refillMl <= 0) {
    setDetailRefillStatus(translations[currentLanguage].invalidRefillAmount);
    return;
  }

  const recordButton = document.getElementById("record-refill-btn");
  if (recordButton) {
    recordButton.disabled = true;
    recordButton.textContent = translations[currentLanguage].refillSaving;
  }
  setDetailRefillStatus(translations[currentLanguage].refillSaving);

  const stationId = getStationStorageId(selectedStation);
  const savedStationIds = new Set(currentImpact.savedStationIds || []);
  savedStationIds.add(stationId);

  const savedStations = [...(currentImpact.savedStations || [])];
  if (!savedStations.some(station => station.id === stationId)) {
    savedStations.push({
      id: stationId,
      name: selectedStation.name,
      description: selectedStation.description || "",
      coordinates: selectedStation.coordinates,
      source: selectedStation.source || "Community data"
    });
  }

  const weeklyRefills = {
    ...getDefaultImpactData().weeklyRefills,
    ...(currentImpact.weeklyRefills || {})
  };
  const weekdayKey = getWeekdayKey(new Date());
  if (weekdayKey) {
    weeklyRefills[weekdayKey] = (Number(weeklyRefills[weekdayKey]) || 0) + 1;
  }

  const refillLiters = refillMl / 1000;
  const refillCo2SavedKg = Number((refillLiters * 0.03).toFixed(3));
  const refillMoneySavedChf = Math.round(refillLiters * 100) / 100;
  const bottlesRefilled = (Number(currentImpact.bottlesRefilled) || 0) + 1;
  const previousImpact = { ...currentImpact };
  currentImpact = {
    ...currentImpact,
    bottlesRefilled,
    totalRefillMl: (Number(currentImpact.totalRefillMl) || 0) + refillMl,
    co2SavedKg: Number(((Number(currentImpact.co2SavedKg) || 0) + refillCo2SavedKg).toFixed(3)),
    moneySavedChf: Number(((Number(currentImpact.moneySavedChf) || 0) + refillMoneySavedChf).toFixed(2)),
    savedStationIds: [...savedStationIds],
    savedStations,
    weeklyRefills,
    lastRefillAt: new Date().toISOString()
  };

  updateImpactDashboard(currentImpact);
  try {
    await saveUserImpact();
    showNearMeStatus(translations[currentLanguage].refillSaved);
    hideRefillAmountOptions();
    showRefillRegisteredConfirmation(recordButton, {
      amountMl: refillMl,
      co2SavedKg: refillCo2SavedKg,
      moneySavedChf: refillMoneySavedChf
    });
  } catch (error) {
    console.error(error);
    currentImpact = previousImpact;
    updateImpactDashboard(currentImpact);
    setDetailRefillStatus(translations[currentLanguage].refillSaveFailed);
    resetRefillConfirmation(recordButton);
  }
}

function showRefillRegisteredConfirmation(button, refill) {
  const message = translations[currentLanguage].refillRegistered
    .replace("{amount}", refill.amountMl)
    .replace("{co2}", refill.co2SavedKg.toFixed(3))
    .replace("{money}", refill.moneySavedChf.toFixed(2));

  setDetailRefillStatus(message);

  if (!button) {
    return;
  }

  button.disabled = false;
  button.classList.add("refill-confirmed");
  button.textContent = translations[currentLanguage].refillSaved;

  window.setTimeout(() => {
    resetRefillConfirmation(button);
  }, 2400);
}

function resetRefillConfirmation(button = document.getElementById("record-refill-btn")) {
  if (!button) {
    return;
  }

  button.disabled = false;
  button.classList.remove("refill-confirmed");
  button.textContent = translations[currentLanguage].recordRefill;
}

function setDetailRefillStatus(message) {
  const status = document.getElementById("detail-refill-status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("hidden", !message);
}

function showReportIssueBox() {
  if (!selectedStation) {
    return;
  }

  if (!currentUser) {
    showPage("me");
    showAuthOptions("signin");
    setAuthStatus(translations[currentLanguage].signInToTrack);
    return;
  }

  const panel = document.getElementById("report-issue-panel");
  if (panel) {
    panel.classList.remove("hidden");
  }
  updateReportWordCount();
  setReportStatus("");
}

function hideReportIssueBox() {
  const panel = document.getElementById("report-issue-panel");
  if (panel) {
    panel.classList.add("hidden");
  }

  const textarea = document.getElementById("report-comment");
  if (textarea) {
    textarea.value = "";
  }
  updateReportWordCount();
  setReportStatus("");
}

function getCommentWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}

function updateReportWordCount() {
  const textarea = document.getElementById("report-comment");
  const counter = document.getElementById("report-word-count");
  if (!textarea || !counter) {
    return;
  }

  const words = getCommentWords(textarea.value);
  if (words.length > 30) {
    textarea.value = words.slice(0, 30).join(" ");
  }
  counter.textContent = `${getCommentWords(textarea.value).length}/30`;
}

async function postStationComment() {
  if (!selectedStation) {
    return;
  }

  if (!currentUser) {
    showPage("me");
    showAuthOptions("signin");
    setAuthStatus(translations[currentLanguage].signInToTrack);
    return;
  }

  const textarea = document.getElementById("report-comment");
  const words = getCommentWords(textarea?.value);
  if (!words.length || words.length > 30) {
    setReportStatus(translations[currentLanguage].commentTooLong);
    return;
  }

  const comment = {
    id: `${currentUser.uid}-${Date.now()}`,
    uid: currentUser.uid,
    author: currentUser.displayName || currentUser.email || "Community member",
    text: words.join(" "),
    createdAt: new Date().toISOString()
  };

  try {
    if (!fbDb) {
      throw new Error("Firestore unavailable");
    }

    await fbDb.collection("stationComments").doc(getStationCommentDocId(selectedStation)).set({
      stationId: getStationStorageId(selectedStation),
      stationName: selectedStation.name,
      comments: firebase.firestore.FieldValue.arrayUnion(comment),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    currentStationComments = [comment, ...currentStationComments];
    renderStationComments(currentStationComments);
    hideReportIssueBox();
    setDetailRefillStatus(translations[currentLanguage].commentPosted);
  } catch (error) {
    console.error(error);
    setReportStatus(translations[currentLanguage].commentPostFailed.replace("{reason}", error.message || "Please try again."));
  }
}

async function loadStationComments(station) {
  currentStationComments = [];
  renderStationComments(currentStationComments);

  if (!fbDb || !station) {
    return;
  }

  try {
    const snapshot = await fbDb.collection("stationComments").doc(getStationCommentDocId(station)).get();
    const comments = snapshot.exists && Array.isArray(snapshot.data().comments)
      ? snapshot.data().comments
      : [];
    currentStationComments = comments.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    renderStationComments(currentStationComments);
  } catch (error) {
    console.error(error);
  }
}

function renderStationComments(comments) {
  const list = document.getElementById("station-comments-list");
  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "empty-comments";
    empty.textContent = translations[currentLanguage].noCommentsYet;
    list.appendChild(empty);
    return;
  }

  const shouldCollapse = comments.length > 4;
  comments.forEach(comment => {
    const item = document.createElement("article");
    item.className = "station-comment";

    const author = document.createElement("strong");
    author.textContent = comment.author || "Community member";

    const text = document.createElement("span");
    const words = getCommentWords(comment.text);
    const needsReadMore = shouldCollapse && words.length > 12;
    text.textContent = needsReadMore ? `${words.slice(0, 12).join(" ")}...` : comment.text;

    item.append(author, text);

    if (needsReadMore) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = translations[currentLanguage].readMore;
      toggle.onclick = () => {
        const expanded = toggle.dataset.expanded === "true";
        toggle.dataset.expanded = expanded ? "false" : "true";
        text.textContent = expanded ? `${words.slice(0, 12).join(" ")}...` : comment.text;
        toggle.textContent = expanded ? translations[currentLanguage].readMore : translations[currentLanguage].showLess;
      };
      item.appendChild(toggle);
    }

    list.appendChild(item);
  });
}

function setReportStatus(message) {
  const status = document.getElementById("report-status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("hidden", !message);
}

function getStationCommentDocId(station) {
  return encodeURIComponent(getStationStorageId(station));
}

function getStationStorageId(station) {
  if (station.osmId) {
    return station.osmId;
  }

  const coordinates = Array.isArray(station.coordinates)
    ? station.coordinates.map(value => Number(value).toFixed(5)).join(",")
    : "";
  return `${station.source || "station"}-${station.name}-${coordinates}`.toLowerCase();
}

function getWeekdayKey(date) {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
}

function updateImpactDashboard(impact) {
  const data = normalizeImpactData(impact);
  const uniqueStations = new Set(data.savedStationIds || []);

  setElementText("stat-bottles", data.bottlesRefilled);
  setElementText("stat-co2", `${data.co2SavedKg.toFixed(3)} kg`);
  setElementText("stat-money", `CHF ${data.moneySavedChf.toFixed(2)}`);
  setElementText("stat-fountains", uniqueStations.size);

  const weekdays = ["mon", "tue", "wed", "thu", "fri"];
  const maxCount = Math.max(1, ...weekdays.map(day => Number(data.weeklyRefills[day]) || 0));
  weekdays.forEach(day => {
    const count = Number(data.weeklyRefills[day]) || 0;
    const bar = document.getElementById(`bar-${day}`);
    if (bar) {
      bar.style.width = `${Math.round((count / maxCount) * 100)}%`;
    }
    setElementText(`cnt-${day}`, count);
  });

  updateImpactBadges(data);
}

function updateImpactBadges(impact) {
  const loggedInBadges = document.querySelectorAll("#logged-in-view .badges span");
  const unlocks = [
    impact.bottlesRefilled >= 1,
    impact.bottlesRefilled >= 10,
    (impact.savedStationIds || []).length >= 3,
    impact.bottlesRefilled >= 50,
    (impact.savedStationIds || []).length >= 10
  ];

  loggedInBadges.forEach((badge, index) => {
    badge.classList.toggle("locked", !unlocks[index]);
  });
}

function setElementText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function showAuthOptions(mode) {
  authMode = mode;
  document.getElementById("logged-out-view").classList.add("hidden");
  document.getElementById("logged-in-view").classList.add("hidden");
  document.getElementById("auth-view").classList.remove("hidden");
  document.getElementById("email-auth-form").classList.add("hidden");
  document.getElementById("auth-status").textContent = "";

  const introKey = mode === "signin" ? "signInIntro" : "registerIntro";
  document.getElementById("auth-intro").textContent = translations[currentLanguage][introKey];
}

function showLoggedOutView() {
  isDemoMode = false;
  document.getElementById("auth-view").classList.add("hidden");
  document.getElementById("logged-in-view").classList.add("hidden");
  document.getElementById("demo-view").classList.add("hidden");
  document.getElementById("logged-out-view").classList.remove("hidden");
  document.getElementById("impact-subtitle").textContent = translations[currentLanguage].impactSubtitle;
}

function enterDemoMode() {
  isDemoMode = true;
  // Switch to the me page without triggering showPage's auth reset logic
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-me").classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelectorAll(".nav-item")[1].classList.add("active");

  document.getElementById("logged-out-view").classList.add("hidden");
  document.getElementById("auth-view").classList.add("hidden");
  document.getElementById("logged-in-view").classList.add("hidden");
  document.getElementById("demo-view").classList.remove("hidden");
  document.getElementById("impact-subtitle").textContent = translations[currentLanguage].demoSubtitle;
}

function exitDemoMode() {
  showLoggedOutView();
}

function showEmailRegister() {
  document.getElementById("email-auth-form").classList.remove("hidden");
  document.getElementById("auth-status").textContent = "";

  const btn = document.getElementById("email-submit-btn");
  const dict = translations[currentLanguage];
  if (btn) {
    btn.textContent = authMode === "register" ? dict.createAccount : dict.signIn;
    btn.dataset.i18n = authMode === "register" ? "createAccount" : "signIn";
  }

  document.getElementById("auth-email").focus();
}

function loginWithProvider(provider) {
  if (provider === "Google") {
    signInWithGoogle();
  }
}

async function signInWithGoogle() {
  if (!firebaseReady) {
    setAuthStatus(translations[currentLanguage].authFirebaseNotConfigured);
    return;
  }
  try {
    const result = await fbAuth.signInWithPopup(googleProvider);
    await completeLogin(result.user);
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
      setAuthStatus(translations[currentLanguage].authGoogleFailed + err.message);
    }
  }
}

async function submitEmailAuth(event) {
  event.preventDefault();
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  if (!firebaseReady) {
    setAuthStatus(translations[currentLanguage].authFirebaseNotConfigured);
    return;
  }

  setAuthStatus("");
  try {
    let result;
    if (authMode === "register") {
      result = await fbAuth.createUserWithEmailAndPassword(email, password);
    } else {
      result = await fbAuth.signInWithEmailAndPassword(email, password);
    }
    await completeLogin(result.user);
  } catch (err) {
    const dict = translations[currentLanguage];
    const messages = {
      "auth/email-already-in-use": dict.authEmailInUse,
      "auth/invalid-email":        dict.authInvalidEmail,
      "auth/weak-password":        dict.authWeakPassword,
      "auth/user-not-found":       dict.authUserNotFound,
      "auth/wrong-password":       dict.authWrongPassword,
      "auth/invalid-credential":   dict.authInvalidCredential
    };
    setAuthStatus(messages[err.code] || err.message);
  }
}

async function signOutUser() {
  if (fbAuth) {
    await fbAuth.signOut();
  }
  isLoggedIn = false;
  currentUser = null;
  currentImpact = getDefaultImpactData();
  updateImpactDashboard(currentImpact);
  showLoggedOutView();
}

async function completeLogin(user) {
  isLoggedIn = true;
  currentUser = user;
  const dict = translations[currentLanguage];

  // Show real user info from Google/email
  const displayName = user.displayName || user.email.split("@")[0];
  const firstName   = displayName.split(" ")[0];

  const avatarEl = document.getElementById("user-avatar");
  if (user.photoURL) {
    avatarEl.src = user.photoURL;
    avatarEl.style.display = "block";
  } else {
    avatarEl.style.display = "none";
  }
  document.getElementById("user-display-name").textContent = displayName;
  document.getElementById("user-email-label").textContent  = user.email || "";

  isDemoMode = false;
  document.getElementById("auth-view").classList.add("hidden");
  document.getElementById("logged-out-view").classList.add("hidden");
  document.getElementById("demo-view").classList.add("hidden");
  document.getElementById("logged-in-view").classList.remove("hidden");
  document.getElementById("impact-subtitle").textContent =
    dict.welcomeBack.replace("{name}", firstName);

  try {
    await loadUserImpact(user);
  } catch (error) {
    console.warn(error);
    updateImpactDashboard(currentImpact);
  }
}

function setAuthStatus(msg) {
  document.getElementById("auth-status").textContent = msg;
}

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage(currentLanguage);
  initMap();
  document.querySelector(".search-box input").addEventListener("input", handleStationSearch);
  document.getElementById("report-comment")?.addEventListener("input", updateReportWordCount);

  // Restore session automatically on every page load
  if (firebaseReady) {
    fbAuth.onAuthStateChanged(async user => {
      if (user) {
        await completeLogin(user);
        // Make sure we land on the me page if it's already active
        const mePage = document.getElementById("page-me");
        if (mePage && mePage.classList.contains("active")) {
          // already visible — completeLogin already updated the view
        }
      } else {
        isLoggedIn = false;
        currentUser = null;
        currentImpact = getDefaultImpactData();
        updateImpactDashboard(currentImpact);
      }
    });
  }
});

async function submitFeedback(e) {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById('feedback-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  const showFeedbackError = (message) => {
    status.textContent = message;
    status.style.background = '#fdecea';
    status.style.borderColor = '#e57373';
    status.style.color = '#b71c1c';
    status.classList.remove('hidden');
  };

  const getFeedbackErrorMessage = (err) => {
    if (!firebaseReady || !fbDb) {
      return 'Firebase ist nicht verbunden. Bitte prüfen Sie die Konfiguration.';
    }

    if (err && err.code === 'permission-denied') {
      return 'Feedback konnte nicht gespeichert werden: Firestore-Regeln blockieren die Anfrage.';
    }

    if (err && (err.code === 'unavailable' || err.code === 'deadline-exceeded')) {
      return 'Keine Verbindung zu Firebase. Bitte Internetverbindung prüfen und erneut versuchen.';
    }

    if (err && err.code === 'resource-exhausted') {
      return 'Firebase-Limit erreicht. Bitte versuchen Sie es später erneut.';
    }

    return 'Fehler beim Senden. Bitte versuchen Sie es erneut.';
  };

  const allRadios = ['ziel1', 'ziel2', 'ziel3'];
  for (const name of allRadios) {
    if (!form.querySelector(`input[name="${name}"]:checked`)) {
      showFeedbackError('Bitte beantworten Sie alle Pflichtfragen (Ziel 1-3).');
      return;
    }
  }

  const entry = {
    ziel1: parseInt(form.querySelector('input[name="ziel1"]:checked').value),
    ziel2: parseInt(form.querySelector('input[name="ziel2"]:checked').value),
    ziel3: parseInt(form.querySelector('input[name="ziel3"]:checked').value),
    improve:    form.querySelector('#fb-improve').value.trim(),
    recommend:  form.querySelector('#fb-recommend').value.trim(),
    likelihood: form.querySelector('#fb-likelihood').value.trim(),
    strengths:  form.querySelector('#fb-strengths').value.trim(),
    userId:     currentUser ? currentUser.uid : null,
    userEmail:  currentUser ? currentUser.email : null,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Wird gesendet…';

  try {
    await fbDb.collection('feedback').add(entry);
    status.textContent = 'Vielen Dank für Ihr Feedback!';
    status.style.background = '#dff8ee';
    status.style.borderColor = '#47c89f';
    status.style.color = '#12664f';
    status.classList.remove('hidden');
    form.reset();
  } catch (err) {
    console.error('Feedback save failed:', err);
    showFeedbackError(getFeedbackErrorMessage(err));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Feedback absenden';
  }
}
