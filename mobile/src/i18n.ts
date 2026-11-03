import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'hi' | 'gu';
const KEY = 'ncode_lang';

let lang: Lang = 'en';
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

// Saved choice loads asynchronously (SecureStore); the UI re-renders when it arrives.
SecureStore.getItemAsync(KEY)
  .then((v) => {
    if (v === 'hi' || v === 'gu') {
      lang = v;
      emit();
    }
  })
  .catch(() => {});

export function setLang(l: Lang) {
  lang = l;
  SecureStore.setItemAsync(KEY, l).catch(() => {});
  emit();
}

const D: Record<string, [string, string, string]> = {
  // key: [English, Hindi, Gujarati]
  attendance: ['Attendance', 'उपस्थिति', 'હાજરી'],
  fieldVisits: ['Field Visits', 'फ़ील्ड विज़िट', 'ફીલ્ડ વિઝિટ'],
  history: ['History', 'इतिहास', 'ઇતિહાસ'],
  profile: ['Profile', 'प्रोफ़ाइल', 'પ્રોફાઇલ'],
  offDuty: ['Off duty', 'ड्यूटी बंद', 'ડ્યુટી બંધ'],
  onDuty: ['On duty', 'ड्यूटी पर', 'ડ્યુટી પર'],
  thisMonth: ['This month', 'इस महीने', 'આ મહિને'],
  daysPresent: ['Days Present', 'उपस्थित दिन', 'હાજર દિવસો'],
  leaveBalance: ['Leave balance', 'छुट्टी शेष', 'રજા બાકી'],
  daysAvailable: ['Days Available', 'उपलब्ध दिन', 'ઉપલબ્ધ દિવસો'],
  lastPunch: ['Last punch', 'अंतिम पंच', 'છેલ્લી પંચ'],
  none: ['None', 'कोई नहीं', 'કોઈ નહીં'],
  myWork: ['My Work', 'मेरा काम', 'મારું કામ'],
  myHr: ['My HR', 'मेरा HR', 'મારું HR'],
  updates: ['Updates', 'अपडेट', 'અપડેટ'],
  account: ['Account', 'खाता', 'ખાતું'],
  viewAttendance: ['View Attendance', 'उपस्थिति देखें', 'હાજરી જુઓ'],
  requestLeave: ['Request Leave', 'छुट्टी का अनुरोध', 'રજાની વિનંતી'],
  holidayList: ['Holiday List', 'अवकाश सूची', 'રજાઓની યાદી'],
  notes: ['Notes', 'नोट्स', 'નોંધો'],
  myRoute: ['My Route', 'मेरा मार्ग', 'મારો માર્ગ'],
  hrProfile: ['HR Profile', 'HR प्रोफ़ाइल', 'HR પ્રોફાઇલ'],
  myDocuments: ['My Documents', 'मेरे दस्तावेज़', 'મારા દસ્તાવેજો'],
  announcements: ['Announcements', 'घोषणाएँ', 'જાહેરાતો'],
  password: ['Password', 'पासवर्ड', 'પાસવર્ડ'],
  language: ['Language', 'भाषा', 'ભાષા'],
  punchReminder: ['Punch Reminder', 'पंच रिमाइंडर', 'પંચ રિમાઇન્ડર'],
  logout: ['Logout', 'लॉगआउट', 'લૉગઆઉટ'],
  save: ['Save', 'सहेजें', 'સાચવો'],
  back: ['Back', 'वापस', 'પાછા'],
  chooseLanguage: ['Choose Display Language', 'भाषा चुनें', 'ભાષા પસંદ કરો'],
  todaysShift: ["Today's Shift Activity", 'आज की शिफ्ट गतिविधि', 'આજની શિફ્ટ પ્રવૃત્તિ'],
  loggedHours: ['Logged Hours', 'दर्ज घंटे', 'નોંધાયેલા કલાકો'],
  shifts: ['Shifts', 'शिफ्ट', 'શિફ્ટ'],
  gpsDrops: ['GPS Drops', 'GPS ड्रॉप', 'GPS ડ્રોપ'],
  fieldNotes: ["Today's Field Notes & Shift Log", 'आज के फ़ील्ड नोट्स', 'આજની ફીલ્ડ નોંધો'],
  saveNotes: ['Save Notes', 'नोट्स सहेजें', 'નોંધો સાચવો'],
  recentShifts: ['Recent Attendance Shifts', 'हाल की उपस्थिति', 'તાજેતરની હાજરી'],
  viewAll: ['View All History →', 'पूरा इतिहास →', 'આખો ઇતિહાસ →'],
  changePassword: ['Change password', 'पासवर्ड बदलें', 'પાસવર્ડ બદલો'],
  changePasswordSub: ['Change your login password', 'अपना लॉगिन पासवर्ड बदलें', 'તમારો લૉગિન પાસવર્ડ બદલો'],
  currentPassword: ['Current password', 'वर्तमान पासवर्ड', 'વર્તમાન પાસવર્ડ'],
  newPassword: ['New password', 'नया पासवर्ड', 'નવો પાસવર્ડ'],
  confirmPassword: ['Confirm new password', 'नए पासवर्ड की पुष्टि करें', 'નવા પાસવર્ડની પુષ્ટિ કરો'],
  show: ['Show', 'दिखाएँ', 'બતાવો'],
  hide: ['Hide', 'छिपाएँ', 'છુપાવો'],
  pwHint: ['At least 8 characters. Not too common, not all numbers, and not similar to your username.', 'कम से कम 8 अक्षर। बहुत आम या केवल अंकों वाला नहीं, और यूज़रनेम से मिलता-जुलता नहीं।', 'ઓછામાં ઓછા 8 અક્ષર. બહુ સામાન્ય કે ફક્ત અંકોનો નહીં, અને યુઝરનેમ જેવો નહીં.'],
  pwEmpty: ['Fill in all three fields.', 'तीनों फ़ील्ड भरें।', 'ત્રણેય વિગતો ભરો.'],
  pwShort: ['New password must be at least 8 characters.', 'नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।', 'નવો પાસવર્ડ ઓછામાં ઓછા 8 અક્ષરનો હોવો જોઈએ.'],
  pwSame: ['New password must be different from the current one.', 'नया पासवर्ड वर्तमान पासवर्ड से अलग होना चाहिए।', 'નવો પાસવર્ડ વર્તમાન પાસવર્ડથી અલગ હોવો જોઈએ.'],
  pwMismatch: ['New passwords do not match.', 'नए पासवर्ड मेल नहीं खाते।', 'નવા પાસવર્ડ મેળ ખાતા નથી.'],
  pwDone: ['Password changed. Please log in again.', 'पासवर्ड बदल गया। कृपया फिर से लॉगिन करें।', 'પાસવર્ડ બદલાઈ ગયો. કૃપા કરીને ફરી લૉગિન કરો.'],
  ok: ['OK', 'ठीक है', 'બરાબર'],
  langNote: ['The menus, headings and the attendance and history screens follow your language. Messages from the server stay in English.', 'मेनू, शीर्षक तथा उपस्थिति और इतिहास स्क्रीन आपकी भाषा में दिखेंगे। सर्वर के संदेश अंग्रेज़ी में रहेंगे।', 'મેનુ, મથાળાં તથા હાજરી અને ઇતિહાસ સ્ક્રીન તમારી ભાષામાં દેખાશે. સર્વરના સંદેશા અંગ્રેજીમાં રહેશે.'],
  punchInTitle: ['Attendance Punch-In', 'उपस्थिति पंच-इन', 'હાજરી પંચ-ઇન'],
  punchInSub: ['Verify consent, acquire GPS lock, and capture front selfie', 'सहमति दें, GPS लोकेशन लें और फ्रंट सेल्फ़ी लें', 'સંમતિ આપો, GPS લોકેશન મેળવો અને ફ્રન્ટ સેલ્ફી લો'],
  stepConsent: ['Session Location & Selfie Consent', 'सत्र लोकेशन और सेल्फ़ी की सहमति', 'સત્ર લોકેશન અને સેલ્ફીની સંમતિ'],
  consentText: ['I consent to session-scoped location tracking and selfie attendance verification for my shift (Policy v1.0).', 'मैं अपनी शिफ्ट के लिए सत्र-आधारित लोकेशन ट्रैकिंग और सेल्फ़ी से उपस्थिति सत्यापन की सहमति देता/देती हूँ (नीति v1.0)।', 'હું મારી શિફ્ટ માટે સત્ર આધારિત લોકેશન ટ્રેકિંગ અને સેલ્ફીથી હાજરી ચકાસણીની સંમતિ આપું છું (નીતિ v1.0).'],
  stepGps: ['GPS Position Fix', 'GPS लोकेशन', 'GPS લોકેશન'],
  stepLocation: ['Location & Consent', 'लोकेशन और सहमति', 'લોકેશન અને સંમતિ'],
  agreeGps: ['Agree & Get GPS', 'सहमत हों और GPS लें', 'સંમત થાઓ અને GPS મેળવો'],
  acquireGps: ['Acquire GPS', 'GPS लें', 'GPS મેળવો'],
  locating: ['Locating…', 'लोकेशन खोज रहे हैं…', 'લોકેશન શોધી રહ્યા છીએ…'],
  refresh: ['Refresh', 'रीफ़्रेश', 'રીફ્રેશ'],
  stepSelfie: ['Front Selfie Verification', 'फ्रंट सेल्फ़ी सत्यापन', 'ફ્રન્ટ સેલ્ફી ચકાસણી'],
  openCamera: ['Open Camera', 'कैमरा खोलें', 'કૅમેરા ખોલો'],
  retake: ['Retake', 'दोबारा लें', 'ફરી લો'],
  snapPhoto: ['Snap Photo', 'फ़ोटो लें', 'ફોટો લો'],
  cancel: ['Cancel', 'रद्द करें', 'રદ કરો'],
  tapToOpenCamera: ['Tap to open camera', 'कैमरा खोलने के लिए टैप करें', 'કૅમેરા ખોલવા માટે ટૅપ કરો'],
  faceInOval: ['Keep your face inside the oval, then snap.', 'चेहरा अंडाकार के अंदर रखें, फिर फ़ोटो लें।', 'ચહેરો અંડાકારની અંદર રાખો, પછી ફોટો લો.'],
  cameraPermission: ['Camera permission is required to take a selfie.', 'सेल्फ़ी के लिए कैमरा की अनुमति ज़रूरी है।', 'સેલ્ફી માટે કૅમેરાની પરવાનગી જરૂરી છે.'],
  allowCamera: ['Allow camera', 'कैमरा की अनुमति दें', 'કૅમેરાની પરવાનગી આપો'],
  cameraFailed: ['Could not take the photo. Try again.', 'फ़ोटो नहीं ली जा सकी। दोबारा कोशिश करें।', 'ફોટો લઈ શકાયો નહીં. ફરી પ્રયાસ કરો.'],
  requirements: ['PUNCH-IN REQUIREMENTS', 'पंच-इन की आवश्यकताएँ', 'પંચ-ઇનની આવશ્યકતાઓ'],
  reqConsent: ['Privacy & Tracking Policy Consent', 'गोपनीयता और ट्रैकिंग नीति की सहमति', 'ગોપનીયતા અને ટ્રેકિંગ નીતિની સંમતિ'],
  reqGps: ['Accurate GPS Location', 'सटीक GPS लोकेशन', 'ચોક્કસ GPS લોકેશન'],
  reqSelfie: ['Front Selfie / Verification Photo', 'फ्रंट सेल्फ़ी / सत्यापन फ़ोटो', 'ફ્રન્ટ સેલ્ફી / ચકાસણી ફોટો'],
  punchInBtn: ['PUNCH IN (START SHIFT)', 'पंच इन (शिफ्ट शुरू करें)', 'પંચ ઇન (શિફ્ટ શરૂ કરો)'],
  punchOutBtn: ['PUNCH OUT (END SHIFT)', 'पंच आउट (शिफ्ट समाप्त करें)', 'પંચ આઉટ (શિફ્ટ પૂરી કરો)'],
  keepTracking: ['Keep the app installed and background location allowed so tracking continues.', 'ट्रैकिंग जारी रखने के लिए ऐप इंस्टॉल रखें और बैकग्राउंड लोकेशन की अनुमति दें।', 'ટ્રેકિંગ ચાલુ રાખવા માટે ઍપ ઇન્સ્ટૉલ રાખો અને બૅકગ્રાઉન્ડ લોકેશનની પરવાનગી આપો.'],
  noRecent: ['No previous sessions recorded.', 'कोई पिछला सत्र दर्ज नहीं है।', 'કોઈ અગાઉનું સત્ર નોંધાયેલું નથી.'],
  historyTitle: ['Attendance History', 'उपस्थिति इतिहास', 'હાજરી ઇતિહાસ'],
  noSessions: ['No past sessions yet.', 'अभी तक कोई सत्र नहीं।', 'હજી સુધી કોઈ સત્ર નથી.'],
  inLabel: ['In', 'इन', 'ઇન'],
  outLabel: ['Out', 'आउट', 'આઉટ'],
  durationLabel: ['Duration', 'अवधि', 'સમયગાળો'],
  trackingLabel: ['Tracking', 'ट्रैकिंग', 'ટ્રેકિંગ'],
  trackActive: ['Tracking active', 'ट्रैकिंग चालू', 'ટ્રેકિંગ ચાલુ'],
  trackPaused: ['Tracking paused', 'ट्रैकिंग रुकी', 'ટ્રેકિંગ અટક્યું'],
  trackPunchedOut: ['Punched out', 'पंच आउट हो गया', 'પંચ આઉટ થઈ ગયું'],
  st_LOCATION_UNAVAILABLE: ['Location unavailable', 'लोकेशन उपलब्ध नहीं', 'લોકેશન ઉપલબ્ધ નથી'],
  st_PERMISSION_DENIED: ['Permission denied', 'अनुमति नहीं मिली', 'પરવાનગી મળી નથી'],
  st_OFFLINE: ['Offline', 'ऑफ़लाइन', 'ઓફલાઇન'],
  logoutOnDuty: ['You are still on duty. Logging out stops location tracking. Punch out first, or log out anyway?', 'आप अभी ड्यूटी पर हैं। लॉगआउट करने पर लोकेशन ट्रैकिंग बंद हो जाएगी। पहले पंच आउट करें, या फिर भी लॉगआउट करें?', 'તમે હજી ડ્યુટી પર છો. લૉગઆઉટ કરવાથી લોકેશન ટ્રેકિંગ બંધ થઈ જશે. પહેલા પંચ આઉટ કરો, કે છતાં લૉગઆઉટ કરો?'],
  logoutAnyway: ['Log out anyway', 'फिर भी लॉगआउट करें', 'છતાં લૉગઆઉટ કરો'],
  staffEyebrow: ['Staff access', 'स्टाफ एक्सेस', 'સ્ટાફ એક્સેસ'],
  staffHeading: ['Welcome, Field Officer', 'स्वागत है, फ़ील्ड ऑफ़िसर', 'સ્વાગત છે, ફીલ્ડ ઓફિસર'],
  staffHelper: ['Sign in to manage attendance and tracking.', 'उपस्थिति और ट्रैकिंग प्रबंधित करने के लिए साइन इन करें।', 'હાજરી અને ટ્રેકિંગ સંભાળવા માટે સાઇન ઇન કરો.'],
  loginLead: ['Enterprise management for live attendance, tracking, and remote field operations.', 'लाइव उपस्थिति, ट्रैकिंग और दूरस्थ फ़ील्ड संचालन के लिए एंटरप्राइज़ प्रबंधन।', 'લાઇવ હાજરી, ટ્રેકિંગ અને રિમોટ ફીલ્ડ ઓપરેશન માટે એન્ટરપ્રાઇઝ મેનેજમેન્ટ.'],
  loginFieldId: ['Enter your username', 'अपना यूज़रनेम दर्ज करें', 'તમારું યુઝરનેમ દાખલ કરો'],
  loginFieldPw: ['Enter your Password', 'अपना पासवर्ड दर्ज करें', 'તમારો પાસવર્ડ દાખલ કરો'],
  phId: ['Enter Login ID', 'लॉगिन आईडी दर्ज करें', 'લૉગિન આઈડી દાખલ કરો'],
  phPw: ['Enter Password', 'पासवर्ड दर्ज करें', 'પાસવર્ડ દાખલ કરો'],
  loginBtn: ['Login', 'लॉगिन', 'લૉગિન'],
  resetBtn: ['Reset', 'रीसेट', 'રીસેટ'],
  loginTitle: ['Welcome back', 'वापसी पर स्वागत है', 'ફરી સ્વાગત છે'],
  loginSub: ['Sign in with your username and password.', 'अपने यूज़रनेम और पासवर्ड से साइन इन करें।', 'તમારા યુઝરનેમ અને પાસવર્ડથી સાઇન ઇન કરો.'],
};

export function useT() {
  const current = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => lang,
  );
  const idx = current === 'hi' ? 1 : current === 'gu' ? 2 : 0;
  return { t: (k: string) => D[k]?.[idx] ?? D[k]?.[0] ?? k, lang: current };
}
