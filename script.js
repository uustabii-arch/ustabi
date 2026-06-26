import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  PhoneAuthProvider,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  updatePhoneNumber,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwp9YGeVKFQwi2FuVPCILzTkqvi87xAFw",
  authDomain: "ustabi.firebaseapp.com",
  projectId: "ustabi",
  storageBucket: "ustabi.firebasestorage.app",
  messagingSenderId: "957540789690",
  appId: "1:957540789690:web:a260ca0816b7eaecc8c183",
  measurementId: "G-PCN294TD1D",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
auth.languageCode = "tr";
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const DATA_RESET_AT = Date.parse("2026-05-24T15:11:45+03:00");
const DATA_RESET_STORAGE_KEY = "ustaDataResetAt";
const ADMIN_EMAIL = "sayedarman1352@gmail.com";
const IMAGE_UPLOAD_MAX_BYTES = 1024 * 1024;
const IMAGE_UPLOAD_MIME_TYPE = "image/jpeg";
const CREDIT_TOPUP_ENABLED = false;
const AUTO_MODERATOR_NAME = "ustabii-auto-moderator";

isAnalyticsSupported().then((supported) => {
  if (supported) getAnalytics(firebaseApp);
});

const toast = document.querySelector("#toast");

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function getFirebaseAuthMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/timeout": "Firebase yanıt vermedi. Birkaç saniye sonra tekrar dene.",
    "auth/email-already-in-use":
      "Bu e-posta ile kayıtlı bir hesap var. Şifreni hatırlamıyorsan Şifremi unuttum alanından sıfırlama maili gönder.",
    "auth/configuration-not-found":
      "Firebase Authentication açık değil. Console'da Authentication > Email/Password sağlayıcısını etkinleştir.",
    "auth/invalid-email": "E-posta adresi geçerli görünmüyor.",
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/user-not-found": "Bu e-posta ile kayıtlı hesap bulunamadı.",
    "auth/wrong-password": "Şifre hatalı. Şifreni hatırlamıyorsan sıfırlama maili gönderebilirsin.",
    "auth/weak-password": "Şifre en az 6 karakter olmalı.",
    "auth/network-request-failed": "Bağlantı hatası oldu. İnternetini kontrol et.",
    "auth/app-not-authorized":
      "Firebase telefon doğrulama için bu alan adına izin vermiyor. Authentication > Settings > Authorized domains kısmına site alan adını ekle.",
    "auth/captcha-check-failed": "reCAPTCHA doğrulaması geçilemedi. Sayfayı yenileyip tekrar dene.",
    "auth/invalid-phone-number": "Telefon numarası geçerli değil. 05xx xxx xx xx formatında yaz.",
    "auth/invalid-verification-code": "SMS kodu hatalı görünüyor.",
    "auth/missing-verification-code": "SMS kodunu yazman gerekiyor.",
    "auth/quota-exceeded": "SMS kotası doldu. Biraz sonra tekrar dene.",
    "auth/requires-recent-login": "Telefonu değiştirmek için önce çıkış yapıp tekrar giriş yapmalısın.",
    "auth/requires-login": "Telefon doğrulamak için önce hesaba giriş yapmalısın.",
    "permission-denied": "Firestore yazma izni reddedildi. Firebase kurallarını kontrol etmek gerekiyor.",
    "auth/operation-not-allowed":
      "Firebase'de gerekli giriş sağlayıcısı kapalı. Authentication > Sign-in method bölümünden Anonymous ve Telefon sağlayıcılarını kontrol et.",
  };

  return messages[code] || `Kayıt tamamlanamadı: ${error?.message || "Bilinmeyen hata"}`;
}

function getFirestoreErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "permission-denied":
      "Firestore izni reddedildi. Firebase Console > Firestore > Rules kısmına firestore.rules dosyasını yapıştırıp yayınla.",
    "invalid-argument": "İlan verisi Firestore'a uygun değil. Fotoğrafı küçültüp tekrar dene.",
    "unavailable": "Firestore şu an ulaşılamıyor. Birkaç saniye sonra tekrar dene.",
    "resource-exhausted": "İlan çok büyük. Daha küçük bir fotoğraf seç.",
    "auth/operation-not-allowed":
      "Anonim giriş kapalı. Firebase Console > Authentication > Anonymous sağlayıcısını etkinleştir.",
  };

  return messages[code] || error?.message || "Bilinmeyen Firestore hatası";
}

function sanitizeFirestoreData(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeFirestoreData);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, sanitizeFirestoreData(entry)]),
    );
  }

  return value;
}

function getRecordTimestamp(record) {
  const value = record?.resubmittedAt || record?.createdAt || record?.respondedAt || record?.updatedAt || record?.time;
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

function isAfterDataReset(record) {
  return getRecordTimestamp(record) >= DATA_RESET_AT;
}

function resetLegacyWorkspaceData() {
  const appliedAt = Number(localStorage.getItem(DATA_RESET_STORAGE_KEY) || 0);
  if (appliedAt >= DATA_RESET_AT) return;

  ["ustaOffers", "ustaListings", "ustaRatings"].forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter(
      (key) =>
        key.startsWith("ustaNotificationInbox:") ||
        key.startsWith("ustaReadNotifications:"),
    )
    .forEach((key) => localStorage.removeItem(key));

  localStorage.setItem(DATA_RESET_STORAGE_KEY, String(DATA_RESET_AT));
}

resetLegacyWorkspaceData();

function getDataUrlByteSize(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function isDataImageUrl(value) {
  return String(value || "").startsWith("data:image/");
}

function getShareableImageValue(value) {
  const image = String(value || "").trim();
  return image && !isDataImageUrl(image) ? image : "";
}

function renderSiteFooter() {
  if (document.querySelector(".site-footer")) return;

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div>
      <strong>ustabii</strong>
      <span>Usta bulma, günlük iş ve yerel hizmet ilan platformu.</span>
      <span>© ${new Date().getFullYear()} Tüm hakları saklıdır.</span>
    </div>
    <nav aria-label="Site politikaları">
      <a href="kullanim-kosullari.html">Kullanım koşulları</a>
      <a href="topluluk-kurallari.html">Topluluk kuralları</a>
      <a href="gizlilik-politikasi.html">Gizlilik politikası</a>
      <a href="odeme-guvence.html">Güvenli ödeme</a>
      <a href="guvenlik.html">Güvenlik</a>
      <a href="bildirim-ayarlari.html">Bildirim tercihleri</a>
      <span>Gizlilik ve kullanım politikalarımız saklıdır.</span>
    </nav>
  `;
  document.body.appendChild(footer);
}

renderSiteFooter();

async function ensureFirestoreAuth() {
  if (auth.currentUser) return auth.currentUser;

  const credential = await withTimeout(signInAnonymously(auth), 12000);
  return credential.user;
}

function buildSharedListingPayload(listingData, image = "") {
  const { id, createdAt, image: storedImage, ...listingWithoutLocalMeta } = listingData;
  const safeImage = image || storedImage || "";

  return sanitizeFirestoreData({
    ...listingWithoutLocalMeta,
    image: getShareableImageValue(safeImage),
    createdAt: Date.now(),
  });
}

async function publishSharedListing(listingData, image) {
  const payloads = [
    buildSharedListingPayload(listingData, image),
    buildSharedListingPayload({ ...listingData, image: "" }, ""),
  ];

  let lastError = null;

  for (const payload of payloads) {
    try {
      return await withTimeout(addDoc(collection(db, "listings"), payload), 15000);
    } catch (error) {
      lastError = error;
      if (error?.code === "permission-denied") {
        throw error;
      }
    }
  }

  throw lastError || new Error("İlan paylaşılamadı.");
}

function withTimeout(promise, milliseconds, code = "auth/timeout") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      const error = new Error("İstek zaman aşımına uğradı.");
      error.code = code;
      reject(error);
    }, milliseconds);
  });

  return Promise.race([
    promise.finally(() => window.clearTimeout(timeoutId)),
    timeout,
  ]);
}

function injectPageSwitcher() {
  if (document.querySelector(".page-switcher")) return;
  if (getAccountEmail(getCurrentUser()) !== ADMIN_EMAIL) return;

  const pages = [
    { href: "pazar.html", label: "İlan akışı" },
    { href: "kayit.html", label: "Kayıt seçimi" },
    { href: "is-veren-kayit.html", label: "İş veren kaydı" },
    { href: "usta-kayit.html", label: "Hizmet veren kaydı" },
    { href: "giris.html", label: "Giriş yap" },
    { href: "pazar.html", label: "İlanlar" },
    { href: "ilan-koy.html", label: "İlan koy" },
    { href: "ilan-detay.html?id=1", label: "İlan detayı", match: "ilan-detay.html" },
    { href: "ilanlarim.html", label: "İlanlarım" },
    { href: "onceki-islerim.html", label: "Önceki işlerim" },
    { href: "profil-duzenle.html", label: "Profil düzenle" },
    { href: "guvenlik.html", label: "Güvenlik" },
    { href: "teklifler.html", label: "Teklifler" },
    { href: "bildirim-ayarlari.html", label: "Bildirimler" },
    { href: "favori-ustalar.html", label: "Favori hizmet verenler" },
    { href: "odeme-guvence.html", label: "Ödeme güvence" },
    { href: "admin.html", label: "Admin panel" },
  ];
  const currentPage = window.location.pathname.split("/").pop() || "pazar.html";
  const switcher = document.createElement("div");
  switcher.className = "page-switcher";
  switcher.innerHTML = `
    <button class="page-switcher-toggle" type="button" aria-expanded="false">
      <span>Sayfalar</span>
      <span aria-hidden="true">⌁</span>
    </button>
    <nav class="page-switcher-menu" aria-label="Sayfa geçişleri" hidden>
      ${pages
        .map((page) => {
          const isActive = (page.match || page.href) === currentPage;
          return `<a class="${isActive ? "active" : ""}" href="${page.href}">${page.label}</a>`;
        })
        .join("")}
    </nav>
  `;

  document.body.appendChild(switcher);

  const toggle = switcher.querySelector(".page-switcher-toggle");
  const menu = switcher.querySelector(".page-switcher-menu");
  const setOpen = (isOpen) => {
    menu.hidden = !isOpen;
    switcher.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  toggle.addEventListener("click", () => setOpen(menu.hidden));
  document.addEventListener("click", (event) => {
    if (!switcher.contains(event.target)) setOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

injectPageSwitcher();

function handleRegister(form, role) {
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const fullName = formData.get("fullName")?.trim();
    const email = formData.get("email")?.trim();
    const password = formData.get("password");
    const profession =
      formData.get("profession") === "Diğer"
        ? formData.get("customProfession")?.trim()
        : formData.get("profession");
    const userProfile = {
        role,
        fullName,
        email,
        phone: formData.get("phone")?.trim() || "",
        profession,
        city: formData.get("city") || "",
        district: formData.get("district") || "",
        experience: formData.get("experience") || "",
        dailyRate: Number(formData.get("dailyRate") || 0),
        bio: formData.get("bio")?.trim() || "",
      };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Hesap açılıyor...";
      }

      const credential = await withTimeout(
        createUserWithEmailAndPassword(auth, email, password),
        18000,
      );
      let profileSynced = true;

      try {
        await withTimeout(updateProfile(credential.user, { displayName: fullName }), 5000);
      } catch (profileNameError) {
        console.warn("Firebase displayName güncellenemedi:", profileNameError);
      }

      try {
        await withTimeout(
          setDoc(doc(db, "users", credential.user.uid), {
            ...userProfile,
            uid: credential.user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          6000,
        );
      } catch (profileError) {
        profileSynced = false;
        console.warn("Firestore profil kaydı yazılamadı:", profileError);
      }

      localStorage.setItem(
        "ustaUser",
        JSON.stringify({
          ...userProfile,
          uid: credential.user.uid,
        }),
      );

      showToast(
        profileSynced
          ? `${fullName} için ${role === "master" ? "hizmet veren" : "iş veren"} hesabı Firebase'de açıldı.`
          : "Hesap açıldı, profil verisi Firestore izni bekliyor.",
      );
      window.setTimeout(() => {
        window.location.href = `pazar.html?role=${role}`;
      }, 700);
    } catch (error) {
      showToast(getFirebaseAuthMessage(error));
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = role === "master" ? "Hizmet veren hesabı aç" : "İş veren hesabı aç";
      }
    }
  });
}

handleRegister(document.querySelector("#employerRegisterPage"), "employer");
handleRegister(document.querySelector("#masterRegisterPage"), "master");

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const formData = new FormData(loginForm);
    const email = formData.get("email")?.trim();
    const password = formData.get("password");

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Giriş yapılıyor...";
      }

      const credential = await withTimeout(
        signInWithEmailAndPassword(auth, email, password),
        18000,
      );
      let userProfile = {
        uid: credential.user.uid,
        fullName: credential.user.displayName || "Profil",
        email: credential.user.email || email,
        role: "master",
      };

      try {
        const profileSnapshot = await withTimeout(getDoc(doc(db, "users", credential.user.uid)), 6000);
        if (profileSnapshot.exists()) {
          userProfile = {
            ...userProfile,
            ...profileSnapshot.data(),
            uid: credential.user.uid,
          };
        }
      } catch (profileError) {
        console.warn("Firestore profil kaydı okunamadı:", profileError);
      }

      localStorage.setItem("ustaUser", JSON.stringify(userProfile));
      showToast("Giriş başarılı. Panele yönlendiriliyorsun.");
      window.setTimeout(() => {
        window.location.href = `pazar.html?role=${userProfile.role || "master"}`;
      }, 700);
    } catch (error) {
      showToast(getFirebaseAuthMessage(error));
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Giriş yap";
      }
    }
  });
}

document.querySelectorAll("[data-password-reset]").forEach((form) => {
  const toggleButton = form.querySelector("[data-password-reset-toggle]");
  const fields = form.querySelector(".password-reset-fields");

  toggleButton?.addEventListener("click", () => {
    const isOpening = fields?.hidden;
    if (!fields) return;

    fields.hidden = !isOpening;
    form.classList.toggle("open", isOpening);
    toggleButton.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) fields.querySelector("input")?.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const registerForm = form.closest(".auth-card")?.querySelector(".register-form");
    const resetEmail = new FormData(form).get("resetEmail")?.trim();
    const registerEmail = registerForm?.elements.email?.value?.trim();
    const email = resetEmail || registerEmail;

    if (!email) {
      showToast("Şifre sıfırlama linki için e-posta adresini yaz.");
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Mail gönderiliyor...";
      }

      await withTimeout(sendPasswordResetEmail(auth, email), 18000);
      showToast("Şifre sıfırlama maili gönderildi. Gelen kutunu kontrol et.");
      form.reset();
    } catch (error) {
      const messages = {
        "auth/invalid-email": "E-posta adresi geçerli görünmüyor.",
        "auth/user-not-found": "Bu e-posta ile kayıtlı hesap bulunamadı.",
        "auth/configuration-not-found":
          "Firebase Authentication açık değil. Console'da Email/Password sağlayıcısını etkinleştir.",
        "auth/network-request-failed": "Bağlantı hatası oldu. İnternetini kontrol et.",
      };
      showToast(messages[error?.code] || `Şifre sıfırlama maili gönderilemedi: ${error?.message || "Bilinmeyen hata"}`);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Sıfırlama maili gönder";
      }
    }
  });
});

const listingCreateForm = document.querySelector("#listingCreateForm");
const listingImageInput = document.querySelector("#listingImageInput");
const listingImagePreview = document.querySelector("#listingImagePreview");
const listingTitleMaxLength = 72;
const addressNoteField = document.querySelector("#addressNoteField");
const locationPickerCard = document.querySelector("#locationPickerCard");
const customCategoryField = document.querySelector("#customCategoryField");
const customCategoryInput = document.querySelector("#customCategoryInput");
const categorySearchInput = document.querySelector("#categorySearchInput");
const useFeaturedPromotionInput = document.querySelector("#useFeaturedPromotion");
const useColorPromotionInput = document.querySelector("#useColorPromotion");
const highlightColorInput = document.querySelector("#highlightColorInput");
const featuredPromotionMeta = document.querySelector("#featuredPromotionMeta");
const colorPromotionMeta = document.querySelector("#colorPromotionMeta");
const featuredPromotionCard = document.querySelector("#featuredPromotionCard");
const colorPromotionCard = document.querySelector("#colorPromotionCard");
const citySelect = document.querySelector("#citySelect");
const districtSelect = document.querySelector("#districtSelect");
const workDateInput = document.querySelector("#workDateInput");
const profileEditForm = document.querySelector("#profileEditForm");
const profilePhotoInput = document.querySelector("#profilePhotoInput");
const profilePhotoPreview = document.querySelector("#profilePhotoPreview");
const profileCitySelect = document.querySelector("#profileCitySelect");
const profileDistrictSelect = document.querySelector("#profileDistrictSelect");
const portfolioPhotosInput = document.querySelector("#portfolioPhotosInput");
const portfolioPreview = document.querySelector("#portfolioPreview");
const securityForm = document.querySelector("#securityForm");
const verificationGrid = document.querySelector("#verificationGrid");
const securityPhoneInput = document.querySelector("#securityPhoneInput");
const sendPhoneCodeButton = document.querySelector("#sendPhoneCodeButton");
const phoneCodeInput = document.querySelector("#phoneCodeInput");
const confirmPhoneCodeButton = document.querySelector("#confirmPhoneCodeButton");
const identityFileInput = document.querySelector("#identityFileInput");
const identityPreview = document.querySelector("#identityPreview");
const notificationForm = document.querySelector("#notificationForm");
const notificationHistoryList = document.querySelector("#notificationHistoryList");
const offersList = document.querySelector("#offersList");
const paymentForm = document.querySelector("#paymentForm");
const creditTopupGrid = document.querySelector("#creditTopupGrid");
const creditBalanceText = document.querySelector("#creditBalanceText");
const adminModerationList = document.querySelector("#adminModerationList");
const adminModerationSummary = document.querySelector("#adminModerationSummary");
let remoteListings = [];
let remoteNotifications = [];
let sharedListingsUnsubscribe = null;
let sharedNotificationsUnsubscribe = null;
const sharedListingListeners = new Set();
const sharedNotificationListeners = new Set();
let phoneVerificationId = "";
let phoneRecaptchaVerifier = null;

const CREDIT_STORAGE_KEY = "ustaCreditBalance";
const CREDIT_UNIT = "UB";
const promotionCreditCosts = {
  featured: 20,
  colored: 10,
};
const creditPackages = [
  {
    id: "starter",
    title: "Başlangıç",
    credits: 50,
    price: 50,
    badge: "Başla",
    features: ["5 renkli ilan", "2 öne çıkan vitrin"],
  },
  {
    id: "growth",
    title: "Büyüme",
    credits: 120,
    price: 100,
    badge: "Önerilen",
    features: ["12 renkli ilan", "6 öne çıkan vitrin"],
  },
  {
    id: "boost",
    title: "Görünürlük",
    credits: 300,
    price: 200,
    badge: "Güçlü",
    features: ["30 renkli ilan", "15 öne çıkan vitrin"],
  },
];

const professionCategoryGroups = [
  {
    title: "Yazılım ve teknoloji",
    items: [
      "Yazılım geliştirme",
      "Web sitesi",
      "Mobil uygulama",
      "E-ticaret",
      "Backend API",
      "WordPress",
      "Shopify",
      "Oyun geliştirme",
      "Veri analizi",
      "Yapay zeka otomasyonu",
      "Teknik destek",
    ],
  },
  {
    title: "Tasarım ve medya",
    items: [
      "UI/UX tasarım",
      "Grafik tasarım",
      "Logo ve marka",
      "Video kurgu",
      "Fotoğraf çekimi",
      "Animasyon",
      "Sunum tasarımı",
    ],
  },
  {
    title: "Pazarlama ve içerik",
    items: [
      "Sosyal medya",
      "Dijital pazarlama",
      "SEO",
      "Reklam yönetimi",
      "İçerik yazarlığı",
      "Metin yazarlığı",
      "E-posta pazarlama",
    ],
  },
  {
    title: "Eğitim ve danışmanlık",
    items: [
      "Özel ders",
      "Online eğitim",
      "Çeviri",
      "Muhasebe",
      "Hukuk danışmanlığı",
      "İnsan kaynakları",
      "Satış desteği",
      "Müşteri hizmetleri",
      "Veri girişi",
      "Araştırma",
      "Danışmanlık",
    ],
  },
  {
    title: "Giyim, tekstil ve üretim",
    items: [
      "Giyim dikim",
      "Tekstil üretim",
      "Moda tasarım",
      "Terzi",
      "Ürün tasarımı",
      "Paketleme",
    ],
  },
  {
    title: "Lojistik ve saha işleri",
    items: ["Depo ve sevkiyat", "Kurye", "Lojistik", "Şoför", "Taşıma"],
  },
  {
    title: "Etkinlik ve yeme içme",
    items: ["Etkinlik organizasyonu", "Düğün ve davet", "Catering", "Müzik ve sahne"],
  },
  {
    title: "Bakım, sağlık ve güzellik",
    items: [
      "Spor ve antrenörlük",
      "Sağlık ve bakım",
      "Güzellik",
      "Kuaför",
      "Evcil hayvan bakımı",
      "Çocuk bakımı",
      "Yaşlı bakımı",
    ],
  },
  {
    title: "Ev, tadilat ve teknik servis",
    items: [
      "Boya",
      "Tesisat",
      "Elektrik",
      "Montaj",
      "Temizlik",
      "Marangoz",
      "Mobilya montaj",
      "Klima",
      "Kombi",
      "Bahçe",
      "Fayans",
      "Seramik",
      "Parke",
      "Alçıpan",
      "Çatı",
      "Kaynak",
      "Cam balkon",
      "Kapı pencere",
      "Demir doğrama",
      "Anahtarcı",
      "Beyaz eşya",
      "Kamera güvenlik",
      "Uydu anten",
      "İnşaat işçisi",
      "Gündelik yardımcı",
      "Haşere ilaçlama",
    ],
  },
  {
    title: "Diğer",
    items: ["Diğer"],
  },
];

const professionCategories = professionCategoryGroups.flatMap((group) => group.items);
const categoryCodeMap = Object.fromEntries(
  professionCategories.map((category, index) => [category, String(index + 1).padStart(3, "0")]),
);
const categoryByCodeMap = Object.fromEntries(
  Object.entries(categoryCodeMap).map(([category, code]) => [code, category]),
);

function getCategoryCode(category) {
  return categoryCodeMap[category] || "";
}

function getCategoryByCode(value) {
  const code = String(value || "").trim().match(/\d{1,3}/)?.[0];
  if (!code) return "";
  return categoryByCodeMap[code.padStart(3, "0")] || categoryByCodeMap[code] || "";
}

function getOtherCategoryValue() {
  return professionCategoryGroups.at(-1)?.items?.[0] || "Di\u011fer";
}

function getCategoryGroupTitle(category) {
  return professionCategoryGroups.find((group) => group.items.includes(category))?.title || "Diğer";
}

function parseListingTags(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[,;\n]/);
  const seen = new Set();

  return values
    .map((tag) => String(tag).replace(/^#+/, "").trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeListingTitle(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, listingTitleMaxLength);
}

function getListingTags(listing) {
  return parseListingTags(listing?.tags);
}

function renderTagBadges(tags, limit = 6) {
  const visibleTags = parseListingTags(tags).slice(0, limit);
  if (!visibleTags.length) return "";

  return `
    <div class="tag-row" aria-label="İlan etiketleri">
      ${visibleTags.map((tag) => `<span class="tag-badge">#${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

const categoryImageMap = {
  Boya:
    "https://images.unsplash.com/photo-1688372199140-cade7ae820fe?auto=format&fit=crop&q=80&w=1200",
  Tesisat:
    "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=1200",
  Elektrik:
    "https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?auto=format&fit=crop&q=80&w=1200",
  Montaj:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  Taşıma:
    "https://images.unsplash.com/photo-1624137527136-66e631bdaa0e?auto=format&fit=crop&q=80&w=1200",
  Temizlik:
    "https://images.unsplash.com/photo-1740657254989-42fe9c3b8cce?auto=format&fit=crop&q=80&w=1200",
  Marangoz:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  "Mobilya montaj":
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  Klima:
    "https://images.unsplash.com/photo-1660330589693-99889d60181e?auto=format&fit=crop&q=80&w=1200",
  Kombi:
    "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=1200",
  Bahçe:
    "https://images.unsplash.com/photo-1458245201577-fc8a130b8829?auto=format&fit=crop&q=80&w=1200",
  Fayans:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  Seramik:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  Parke:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  Alçıpan:
    "https://images.unsplash.com/photo-1688372199140-cade7ae820fe?auto=format&fit=crop&q=80&w=1200",
  Çatı:
    "https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?auto=format&fit=crop&q=80&w=1200",
  Kaynak:
    "https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?auto=format&fit=crop&q=80&w=1200",
  "Cam balkon":
    "https://images.unsplash.com/photo-1660330589693-99889d60181e?auto=format&fit=crop&q=80&w=1200",
  "Kapı pencere":
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  "Demir doğrama":
    "https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?auto=format&fit=crop&q=80&w=1200",
  Anahtarcı:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
  "Beyaz eşya":
    "https://images.unsplash.com/photo-1660330589693-99889d60181e?auto=format&fit=crop&q=80&w=1200",
  "Kamera güvenlik":
    "https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?auto=format&fit=crop&q=80&w=1200",
  "Uydu anten":
    "https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?auto=format&fit=crop&q=80&w=1200",
  "İnşaat işçisi":
    "https://images.unsplash.com/photo-1646640381839-02748ae8ddf0?auto=format&fit=crop&q=80&w=1200",
  "Gündelik yardımcı":
    "https://images.unsplash.com/photo-1740657254989-42fe9c3b8cce?auto=format&fit=crop&q=80&w=1200",
  "Haşere ilaçlama":
    "https://images.unsplash.com/photo-1740657254989-42fe9c3b8cce?auto=format&fit=crop&q=80&w=1200",
  "Web sitesi":
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
  "Mobil uygulama":
    "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&q=80&w=1200",
  "Yazılım geliştirme":
    "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=1200",
  "E-ticaret":
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200",
  "Backend API":
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200",
  WordPress:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1200",
  Shopify:
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=1200",
  "Oyun geliştirme":
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200",
  "UI/UX tasarım":
    "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&q=80&w=1200",
  "Grafik tasarım":
    "https://images.unsplash.com/photo-1626785774625-0b1c2c4c4a9f?auto=format&fit=crop&q=80&w=1200",
  "Logo ve marka":
    "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&q=80&w=1200",
  "Video kurgu":
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=1200",
  "Sosyal medya":
    "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1200",
  "Dijital pazarlama":
    "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&q=80&w=1200",
  SEO:
    "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&q=80&w=1200",
  "Reklam yönetimi":
    "https://images.unsplash.com/photo-1557838923-2985c318be48?auto=format&fit=crop&q=80&w=1200",
  "İçerik yazarlığı":
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=1200",
  Terzi:
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1200",
  "Giyim dikim":
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=1200",
  "Tekstil üretim":
    "https://images.unsplash.com/photo-1590736704728-f4730bb30770?auto=format&fit=crop&q=80&w=1200",
  "Moda tasarım":
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=1200",
  "Özel ders":
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200",
  Catering:
    "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1200",
  "Fotoğraf çekimi":
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&q=80&w=1200",
  Kuaför:
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200",
  Diğer:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
};

function addGroupedProfessionOptions(select, options = {}) {
  const { excludeOther = false, searchTerm = "" } = options;
  const normalizedSearch = normalizeSearchValue(searchTerm);
  professionCategoryGroups.forEach((group) => {
    const groupMatchesSearch = normalizeSearchValue(group.title).includes(normalizedSearch);
    const groupItems = group.items.filter((item) => {
      if (excludeOther && item === "Diğer") return false;
      if (!normalizedSearch) return true;
      const normalizedItem = normalizeSearchValue(item);
      return groupMatchesSearch || normalizedItem.includes(normalizedSearch) || isCloseSearchMatch(item, normalizedSearch) || getCategoryCode(item).includes(normalizedSearch);
    });
    if (!groupItems.length) return;

    const optionGroup = document.createElement("optgroup");
    optionGroup.label = group.title;
    groupItems.forEach((category) => {
      optionGroup.append(new Option(`${getCategoryCode(category)} - ${category}`, category));
    });
    select.append(optionGroup);
  });
}

function populateCategorySelect(select, options = {}) {
  const { firstValue = "", firstText = "Seç", searchTerm = "" } = options;
  const currentValue = select.value;
  select.innerHTML = `<option value="${firstValue}">${firstText}</option>`;
  addGroupedProfessionOptions(select, { searchTerm });

  const selectableValues = [...select.options].map((option) => option.value).filter(Boolean);
  if (options.includeOtherFallback && String(searchTerm || "").trim() && !selectableValues.length) {
    const otherCategory = getOtherCategoryValue();
    const optionGroup = document.createElement("optgroup");
    optionGroup.label = otherCategory;
    optionGroup.append(new Option(otherCategory, otherCategory));
    select.append(optionGroup);
  }

  const allowedValues = [...select.options].map((option) => option.value);
  if (allowedValues.includes(currentValue)) {
    select.value = currentValue;
  }
}

function populateProfessionSelects() {
  document.querySelectorAll('select[name="category"], #categoryFilter').forEach((select) => {
    const firstValue = select.id === "categoryFilter" ? "Tümü" : "";
    const firstText = select.id === "categoryFilter" ? "Tümü" : "Seç";
    populateCategorySelect(select, { firstValue, firstText });
  });

  const professionSelectEl = document.querySelector("#professionSelect");
  if (professionSelectEl) {
    const currentValue = professionSelectEl.value;
    professionSelectEl.innerHTML = `<option value="">Seç</option><option value="Diğer">Diğer</option>`;
    addGroupedProfessionOptions(professionSelectEl, { excludeOther: true });
    professionSelectEl.value = currentValue;
  }
}

function getListingImage(listing) {
  if (listing.image && !listing.image.startsWith("assets/listing-")) {
    return listing.image;
  }

  return categoryImageMap[listing.category] || categoryImageMap.Diğer || "assets/listing-placeholder.svg";
}

function getListingRoleLabel(listing = {}) {
  return listing.listingRole === "master" || listing.role === "master" || listing.ownerRole === "master"
    ? "Çalışan"
    : "İş veren";
}

populateProfessionSelects();

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function addTwoMonths() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + 2);
  return toDateInputValue(date);
}

function getWorkDateYear() {
  return new Date().getFullYear();
}

function getWorkDateMaxValue() {
  const maxDate = new Date(`${addTwoMonths()}T00:00:00`);
  const yearEnd = new Date(getWorkDateYear(), 11, 31);
  const capped = maxDate > yearEnd ? yearEnd : maxDate;
  return toDateInputValue(capped);
}

function todayValue() {
  return addDays(0);
}

function getTimeLabel(workDate) {
  if (!workDate) return "Esnek";

  const today = new Date(`${todayValue()}T00:00:00`);
  const target = new Date(`${workDate}T00:00:00`);
  const diff = Math.round((target - today) / 86400000);

  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff > 1 && diff <= 7) return "Bu hafta";
  return target.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

function isExpiredListing(listing) {
  return Boolean(listing.workDate && listing.workDate < todayValue());
}

function isAssignedListing(listing) {
  return listing?.status === "assigned" || Boolean(listing?.assignedOfferId);
}

function isCompletedListing(listing) {
  return listing?.status === "completed" || Boolean(listing?.completedAt);
}

function getModerationStatus(listing) {
  return listing?.moderationStatus || "approved";
}

function isPendingModerationListing(listing) {
  return getModerationStatus(listing) === "pending";
}

function isRejectedModerationListing(listing) {
  return getModerationStatus(listing) === "rejected";
}

function isApprovedListing(listing) {
  return getModerationStatus(listing) === "approved";
}

function isUnavailableListing(listing) {
  return isExpiredListing(listing) || isAssignedListing(listing) || isCompletedListing(listing);
}

function getListingStatusLabel(listing) {
  if (isRejectedModerationListing(listing)) return "Reddedildi";
  if (isPendingModerationListing(listing)) return "Onay bekliyor";
  if (isCompletedListing(listing)) return "Tamamlandı";
  if (isAssignedListing(listing)) return "Usta atandı";
  if (isExpiredListing(listing)) return "Pasif ilan";
  return "Aktif ilan";
}

const listingAutoModerationRules = [
  {
    reason: "Yasa dışı ürün, hizmet veya işlem talebi",
    patterns: [
      /\b(uyusturucu|uyuşturucu|esrar|kokain|metamfetamin|bonzai|sahte\s*(kimlik|pasaport|ehliyet|fatura|diploma)|kimlik\s*(sat|kirala|kiralık)|banka\s*hesabı\s*(kirala|sat)|kredi\s*kartı\s*(sat|kopya)|kara\s*para)\b/,
    ],
  },
  {
    reason: "Silah, şiddet veya zarar verme içeriği",
    patterns: [
      /\b(silah|tabanca|tüfek|tufek|bıçakla|bicakla|patlayıcı|patlayici|bomba|darp\s*et|öldür|oldur|yarala|tehdit\s*et)\b/,
    ],
  },
  {
    reason: "Yetişkin/cinsel hizmet veya çıplaklık içeriği",
    patterns: [
      /\b(escort|eskort|fuhuş|fuhus|cinsel\s*hizmet|porno|pornografik|çıplak|ciplak|nude|mutlu\s*son)\b/,
    ],
  },
  {
    reason: "Kumar, bahis veya benzeri riskli işlem",
    patterns: [
      /\b(kumar|bahis|casino|iddaa\s*kupon|kaçak\s*bahis|kacak\s*bahis|slot\s*hesabı|slot\s*hesabi)\b/,
    ],
  },
  {
    reason: "Nefret, hakaret veya ağır küfür içeriği",
    patterns: [
      /\b(orospu|pezevenk|siktir|amk|ırkçı|irkci|nefret\s*söylemi|nefret\s*soylemi|linç\s*et|linc\s*et)\b/,
    ],
  },
  {
    reason: "Dolandırıcılık veya platform güvenliğini aşma girişimi",
    patterns: [
      /\b(dolandır|dolandir|sahte\s*yorum|sahte\s*hesap|hesap\s*çal|hesap\s*cal|şifre\s*kır|sifre\s*kir|hackle|phishing|oltalama)\b/,
    ],
  },
];

function normalizeModerationText(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s+]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getListingModerationText(listing = {}) {
  return [
    listing.title,
    listing.category,
    listing.customCategoryTitle,
    listing.details,
    listing.expectations,
    listing.materials,
    listing.addressNote,
    Array.isArray(listing.tags) ? listing.tags.join(" ") : listing.tags,
  ].join(" ");
}

function moderateListingContent(listing = {}) {
  const text = normalizeModerationText(getListingModerationText(listing));
  const matchedReasons = listingAutoModerationRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
    .map((rule) => rule.reason);

  if (matchedReasons.length) {
    return {
      moderationStatus: "rejected",
      moderationReason: `Otomatik moderasyon: ${[...new Set(matchedReasons)].join("; ")}.`,
      moderatedAt: new Date().toISOString(),
      moderatedBy: AUTO_MODERATOR_NAME,
    };
  }

  return {
    moderationStatus: "approved",
    moderationReason: "",
    moderatedAt: new Date().toISOString(),
    moderatedBy: AUTO_MODERATOR_NAME,
  };
}

function applyAutoModeration(listing = {}) {
  return {
    ...listing,
    ...moderateListingContent(listing),
  };
}

function isAllowedWorkDate(workDate) {
  if (!workDate) return false;
  const year = workDate.slice(0, 4);
  if (year !== String(getWorkDateYear())) return false;
  return workDate >= todayValue() && workDate <= getWorkDateMaxValue();
}

function getRatingStars(score) {
  const normalized = Math.max(0, Math.min(10, Number(score) || 0));
  const fullStars = Math.round(normalized / 2);
  return "★★★★★"
    .split("")
    .map((star, index) => `<span class="${index < fullStars ? "filled" : ""}">${star}</span>`)
    .join("");
}

function getStoredRatings() {
  try {
    return JSON.parse(localStorage.getItem("ustaRatings")) || {};
  } catch {
    return {};
  }
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("ustaUser")) || {};
  } catch {
    return {};
  }
}

function isRegisteredUser(user = getCurrentUser()) {
  return Boolean(user?.email && (user.uid || user.fullName || user.role));
}

function setAvatarElement(element, user) {
  if (!element) return;

  if (user.profilePhoto) {
    element.innerHTML = `<img src="${user.profilePhoto}" alt="${user.fullName || "Profil"} profil fotoğrafı" />`;
  } else {
    element.textContent = (user.fullName || "U").trim().charAt(0).toLocaleUpperCase("tr-TR") || "U";
  }
}

function getSecurityState() {
  try {
    return JSON.parse(localStorage.getItem("ustaSecurity")) || {};
  } catch {
    return {};
  }
}

function saveSecurityState(state) {
  localStorage.setItem("ustaSecurity", JSON.stringify(state));
}

function sanitizeHighlightColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : "#fbcfe8";
}

function hexToRgba(hex, alpha) {
  const safeHex = sanitizeHighlightColor(hex).slice(1);
  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getHighlightStyle(listing) {
  if (!listing?.highlighted) return "";

  const color = sanitizeHighlightColor(listing.highlightColor);
  return ` style="--listing-highlight-border: ${hexToRgba(color, 0.48)}; --listing-highlight-soft: ${hexToRgba(color, 0.36)};"`;
}

function normalizePhoneToE164(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `+90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("905")) return `+${digits}`;
  return "";
}

function waitForSignedInUser(timeout = 6000) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    let timer;
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
    timer = window.setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeout);
  });
}

function getPhoneRecaptchaVerifier() {
  if (phoneRecaptchaVerifier) return phoneRecaptchaVerifier;

  phoneRecaptchaVerifier = new RecaptchaVerifier(auth, "phoneRecaptchaContainer", {
    size: "invisible",
  });
  return phoneRecaptchaVerifier;
}

async function sendPhoneVerificationCode(rawPhone) {
  const phoneNumber = normalizePhoneToE164(rawPhone);
  if (!phoneNumber) {
    throw { code: "auth/invalid-phone-number" };
  }

  const user = await waitForSignedInUser();
  if (!user || user.isAnonymous) {
    throw { code: "auth/requires-login" };
  }

  const provider = new PhoneAuthProvider(auth);
  phoneVerificationId = await provider.verifyPhoneNumber(phoneNumber, getPhoneRecaptchaVerifier());
  return phoneNumber;
}

async function confirmPhoneVerificationCode(verificationCode, phoneNumber) {
  const code = String(verificationCode || "").trim();
  if (!phoneVerificationId || !code) {
    throw { code: "auth/missing-verification-code" };
  }

  const user = await waitForSignedInUser();
  if (!user || user.isAnonymous) {
    throw { code: "auth/requires-login" };
  }

  const normalizedPhone = normalizePhoneToE164(phoneNumber);
  const credential = PhoneAuthProvider.credential(phoneVerificationId, code);
  await updatePhoneNumber(user, credential);

  const nextSecurity = {
    ...getSecurityState(),
    phone: normalizedPhone,
    phoneVerified: true,
    phoneVerifiedAt: new Date().toISOString(),
  };
  saveSecurityState(nextSecurity);

  const currentUser = {
    ...getUser(),
    phone: normalizedPhone,
    phoneVerified: true,
  };
  localStorage.setItem("ustaUser", JSON.stringify(currentUser));

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        phone: normalizedPhone,
        phoneVerified: true,
        phoneVerifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Telefon doğrulama Firestore profiline yazılamadı:", error);
  }

  phoneVerificationId = "";
  return nextSecurity;
}

function getStoredOffers() {
  try {
    return (JSON.parse(localStorage.getItem("ustaOffers")) || []).filter(isAfterDataReset);
  } catch {
    return [];
  }
}

function getStoredInvites() {
  try {
    return JSON.parse(localStorage.getItem("ustaInvites")) || [];
  } catch {
    return [];
  }
}

function saveInvite(masterName) {
  const invites = getStoredInvites();
  const activeInvite = invites.find((invite) => invite.masterName === masterName);
  if (activeInvite) return activeInvite;

  invites.unshift({
    id: Date.now(),
    masterName,
    status: "Davet gönderildi",
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem("ustaInvites", JSON.stringify(invites));
  return invites[0];
}

function saveOffer(offer) {
  const offers = getStoredOffers();
  offers.unshift(offer);
  localStorage.setItem("ustaOffers", JSON.stringify(offers));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("ustaUser")) || {};
  } catch {
    return {};
  }
}

function getCreditBalance() {
  const value = Number(localStorage.getItem(CREDIT_STORAGE_KEY) || 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function saveCreditBalance(value) {
  localStorage.setItem(CREDIT_STORAGE_KEY, String(Math.max(0, Number(value) || 0)));
}

function addCredits(amount) {
  saveCreditBalance(getCreditBalance() + Number(amount || 0));
}

function spendCredits(amount) {
  const cost = Number(amount || 0);
  if (cost <= 0) return true;
  const balance = getCreditBalance();
  if (balance < cost) return false;
  saveCreditBalance(balance - cost);
  return true;
}

function formatCredits(amount) {
  return `${Number(amount || 0).toLocaleString("tr-TR")} ${CREDIT_UNIT}`;
}

function getPromotionCost(requested = {}) {
  return (
    (requested.featured ? promotionCreditCosts.featured : 0) +
    (requested.highlighted ? promotionCreditCosts.colored : 0)
  );
}

function getListingPromotionFromCredits(requested = {}) {
  const featured = Boolean(requested.featured);
  const highlighted = Boolean(requested.highlighted);

  return {
    featured,
    highlighted,
    carouselPriority: featured ? 2 : 0,
    carouselPriorityLabel: featured ? "Krediyle öne çıkan" : "",
    promotionSource: featured || highlighted ? "credits" : "",
    creditCost: getPromotionCost({ featured, highlighted }),
  };
}

function normalizeAccountValue(value) {
  return value ? String(value).trim().toLowerCase() : "";
}

function normalizeSearchValue(value) {
  return normalizeAccountValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

function getSearchDistance(leftValue, rightValue) {
  const left = normalizeSearchValue(leftValue);
  const right = normalizeSearchValue(rightValue);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function isCloseSearchMatch(candidate, query) {
  const normalizedCandidate = normalizeSearchValue(candidate);
  const normalizedQuery = normalizeSearchValue(query);
  if (normalizedQuery.length < 5) return false;
  if (normalizedCandidate.includes(normalizedQuery)) return true;

  const allowedDistance = normalizedQuery.length >= 7 ? 2 : 1;
  return getSearchDistance(normalizedCandidate, normalizedQuery) <= allowedDistance;
}

function getCategoryBySearchTerm(term, categories = professionCategories) {
  const normalizedTerm = normalizeSearchValue(term);
  if (!normalizedTerm) return "";

  const categoryFromCode = getCategoryByCode(term);
  if (categoryFromCode) return categoryFromCode;

  const exactCategory = categories.find((category) => normalizeSearchValue(category) === normalizedTerm);
  if (exactCategory) return exactCategory;

  const startsWithCategory = categories.find((category) => normalizeSearchValue(category).startsWith(normalizedTerm));
  if (startsWithCategory) return startsWithCategory;

  const includesCategory = categories.find((category) => normalizeSearchValue(category).includes(normalizedTerm));
  if (includesCategory) return includesCategory;

  return (
    categories
      .map((category) => ({ category, distance: getSearchDistance(category, normalizedTerm) }))
      .filter((item) => isCloseSearchMatch(item.category, normalizedTerm))
      .sort((left, right) => left.distance - right.distance || left.category.length - right.category.length)[0]?.category || ""
  );
}

function getAccountEmail(user = getCurrentUser()) {
  return normalizeAccountValue(user.email);
}

function isAdminUser(user = getCurrentUser()) {
  return getAccountEmail(user) === ADMIN_EMAIL;
}

function getAccountKey(user = getCurrentUser()) {
  return getAccountEmail(user) || normalizeAccountValue(user.uid) || normalizeAccountValue(user.fullName) || "guest";
}

function getAccountAliases(user = getCurrentUser()) {
  return [
    user.email,
    user.uid,
    user.fullName,
    user.profession,
    user.phone,
    getAccountKey(user),
  ]
    .filter(Boolean)
    .map(normalizeAccountValue);
}

function getNotificationStorageKey(accountKey = getAccountKey()) {
  return `ustaNotificationInbox:${accountKey}`;
}

function getNotificationSettings() {
  try {
    return JSON.parse(localStorage.getItem("ustaNotifications")) || {};
  } catch {
    return {};
  }
}

function getNotificationInbox(accountKey = getAccountKey()) {
  try {
    return JSON.parse(localStorage.getItem(getNotificationStorageKey(accountKey))) || [];
  } catch {
    return [];
  }
}

function saveNotificationInbox(items, accountKey = getAccountKey()) {
  localStorage.setItem(getNotificationStorageKey(accountKey), JSON.stringify(items));
}

function getStoredNotificationsForAccount(user = getCurrentUser()) {
  const aliases = getAccountAliases(user);
  const notificationMap = new Map();

  aliases.forEach((alias) => {
    getNotificationInbox(alias).forEach((notification) => {
      const id = String(notification.id);
      if (!id) return;
      notificationMap.set(id, {
        ...notificationMap.get(id),
        ...notification,
      });
    });
  });

  return [...notificationMap.values()]
    .filter(isAfterDataReset)
    .sort((left, right) => new Date(right.time) - new Date(left.time));
}

function getReadNotificationStorageKey(accountKey = getAccountKey()) {
  return `ustaReadNotifications:${accountKey}`;
}

function getReadNotificationIds(accountKey = getAccountKey()) {
  try {
    return new Set(JSON.parse(localStorage.getItem(getReadNotificationStorageKey(accountKey))) || []);
  } catch {
    return new Set();
  }
}

function saveReadNotificationIds(ids, accountKey = getAccountKey()) {
  localStorage.setItem(getReadNotificationStorageKey(accountKey), JSON.stringify([...ids]));
}

function rememberReadNotification(notificationId, accountKey = getAccountKey()) {
  const readIds = getReadNotificationIds(accountKey);
  readIds.add(String(notificationId));
  saveReadNotificationIds(readIds, accountKey);
}

function getReadNotificationIdsForAccount(user = getCurrentUser()) {
  const readIds = new Set();
  getAccountAliases(user).forEach((alias) => {
    getReadNotificationIds(alias).forEach((id) => readIds.add(String(id)));
  });
  return readIds;
}

function rememberReadNotificationForAccount(notificationId, user = getCurrentUser()) {
  getAccountAliases(user).forEach((alias) => rememberReadNotification(notificationId, alias));
}

function pushNotification(notification, recipientKey = getAccountKey()) {
  if (!recipientKey) return;
  const inbox = getNotificationInbox(recipientKey);
  const withoutDuplicate = inbox.filter((item) => item.id !== notification.id);
  const nextInbox = [notification, ...withoutDuplicate].sort(
    (left, right) => new Date(right.time) - new Date(left.time),
  );
  saveNotificationInbox(nextInbox, recipientKey);
}

function getEmailNotificationOutbox() {
  try {
    return JSON.parse(localStorage.getItem("ustaEmailNotifications")) || [];
  } catch {
    return [];
  }
}

function saveEmailNotificationOutbox(items) {
  localStorage.setItem("ustaEmailNotifications", JSON.stringify(items));
}

async function queueEmailNotification(notification) {
  const recipientEmail = normalizeAccountValue(
    notification.recipientEmail ||
      (Array.isArray(notification.recipientKeys)
        ? notification.recipientKeys.find((key) => String(key).includes("@"))
        : ""),
  );
  if (!recipientEmail) return;

  const emailPayload = sanitizeFirestoreData({
    id: `email-${notification.id}`,
    notificationId: notification.id,
    to: recipientEmail,
    subject: `ustabii: ${notification.title || "Yeni bildirim"}`,
    preview: notification.body || "",
    href: notification.href || "pazar.html",
    status: "queued",
    createdAt: Date.now(),
  });

  const outbox = getEmailNotificationOutbox().filter((item) => item.id !== emailPayload.id);
  saveEmailNotificationOutbox([emailPayload, ...outbox].slice(0, 80));

  try {
    await ensureFirestoreAuth();
    await setDoc(doc(db, "emailNotifications", String(emailPayload.id)), emailPayload, { merge: true });
  } catch (error) {
    console.warn("E-posta bildirim kuyruğu yazılamadı:", error);
  }
}

async function publishNotificationToRecipients(notification, recipientKeys) {
  const cleanRecipientKeys = [...new Set((recipientKeys || []).filter(Boolean).map((key) => String(key)))];
  if (!cleanRecipientKeys.length) return;

  const payload = sanitizeFirestoreData({
    ...notification,
    recipientKey: notification.recipientKey || cleanRecipientKeys[0] || "",
    recipientKeys: cleanRecipientKeys,
    read: false,
    createdAt: Date.now(),
  });

  cleanRecipientKeys.forEach((recipientKey) => {
    pushNotification(payload, recipientKey);
  });

  try {
    await ensureFirestoreAuth();
    await setDoc(doc(db, "notifications", String(payload.id)), payload, { merge: true });
  } catch (error) {
    console.warn("Bildirim Firestore kaydı yazılamadı:", error);
  }

  await queueEmailNotification(payload);
}

function resolveListingOwnerKey(listing) {
  return (
    normalizeAccountValue(listing.ownerEmail) ||
    normalizeAccountValue(listing.owner?.email) ||
    normalizeAccountValue(listing.ownerKey) ||
    normalizeAccountValue(listing.owner?.key) ||
    normalizeAccountValue(listing.ownerUid) ||
    normalizeAccountValue(listing.owner?.uid) ||
    ""
  );
}

function getListingOwnerEmail(listing) {
  return normalizeAccountValue(listing.ownerEmail || listing.owner?.email);
}

function isListingOwnedByUser(listing, user = getCurrentUser()) {
  const ownerEmail = getListingOwnerEmail(listing);
  const accountEmail = getAccountEmail(user);

  if (ownerEmail && accountEmail) return ownerEmail === accountEmail;
  if (ownerEmail || accountEmail) return false;

  const aliases = new Set(getAccountAliases(user));
  return [
    listing.ownerUid ||
    listing.ownerKey ||
    listing.owner?.uid ||
    listing.owner?.key ||
    listing.owner?.email,
  ]
    .map(normalizeAccountValue)
    .filter(Boolean)
    .some((key) => aliases.has(key));
}

function getOwnerRecipientKeys(listing) {
  const keys = new Set();
  [
    listing.ownerEmail,
    listing.owner?.email,
    resolveListingOwnerKey(listing),
    listing.ownerKey,
    listing.owner?.key,
    listing.ownerUid,
    listing.owner?.uid,
  ]
    .filter(Boolean)
    .forEach((key) => keys.add(normalizeAccountValue(key)));
  return [...keys];
}

function getAllOffers() {
  const offerMap = new Map();
  [...getStoredOffers(), ...remoteOffers.filter(isAfterDataReset)].forEach((offer) => {
    offerMap.set(String(offer.id), offer);
  });
  return [...offerMap.values()];
}

function isIncomingOfferForAccount(offer, accountKey = getAccountKey(), user = getCurrentUser()) {
  if (offer.type !== "incoming") return false;

  const aliases = new Set([accountKey, ...getAccountAliases(user)]);

  return [offer.ownerEmail, offer.ownerKey, offer.ownerUid]
    .map(normalizeAccountValue)
    .filter(Boolean)
    .some((key) => aliases.has(key));
}

function buildOfferOwnerNotification(ownerOffer, requesterName, listingTitle, amount, listing) {
  const recipientKeys = getOwnerRecipientKeys(listing);

  return {
    id: `offer-${ownerOffer.id}`,
    type: "offer",
    title: "İlanına yeni teklif",
    body: `${requesterName} "${listingTitle}" ilanına ${amount.toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    })} teklif gönderdi.`,
    time: ownerOffer.createdAt || new Date().toISOString(),
    read: false,
    href: "teklifler.html?filter=incoming",
    offerId: ownerOffer.id,
    listingId: ownerOffer.listingId,
    recipientKey: recipientKeys[0] || "",
    recipientUid: listing.ownerUid || listing.owner?.uid || "",
    recipientEmail: listing.ownerEmail || listing.owner?.email || "",
    recipientKeys,
  };
}

async function publishOwnerNotification(notification, listing) {
  const recipientKeys = notification.recipientKeys?.length
    ? notification.recipientKeys
    : getOwnerRecipientKeys(listing);

  await publishNotificationToRecipients(
    {
      ...notification,
      recipientUid: notification.recipientUid || listing.ownerUid || listing.owner?.uid || "",
      recipientEmail: notification.recipientEmail || listing.ownerEmail || listing.owner?.email || "",
    },
    recipientKeys,
  );
}

function buildListingModerationNotification(listing, moderationStatus, reason = "") {
  const approved = moderationStatus === "approved";
  const recipientKeys = getOwnerRecipientKeys(listing);
  const moderatorLabel = listing.moderatedBy === AUTO_MODERATOR_NAME ? "otomatik kontrol" : "admin";

  return {
    id: `listing-moderation-${listing.id}-${moderationStatus}-${Date.now()}`,
    type: approved ? "approved" : "rejected",
    title: approved ? "İlanın onaylandı" : "İlanın reddedildi",
    body: approved
      ? `"${listing.title}" ilanı ${moderatorLabel} tarafından onaylandı ve ana akışta yayınlandı.`
      : `"${listing.title}" ilanı ${moderatorLabel} tarafından reddedildi.${reason ? ` Sebep: ${reason}` : ""}`,
    time: new Date().toISOString(),
    read: false,
    href: "ilanlarim.html",
    listingId: listing.id,
    recipientKey: recipientKeys[0] || "",
    recipientUid: listing.ownerUid || listing.owner?.uid || "",
    recipientEmail: listing.ownerEmail || listing.owner?.email || "",
    recipientKeys,
  };
}

async function publishOffersToFirestore(sentOffer, ownerOffer) {
  await ensureFirestoreAuth();
  await setDoc(doc(db, "offers", String(sentOffer.id)), sanitizeFirestoreData(sentOffer));
  await setDoc(doc(db, "offers", String(ownerOffer.id)), sanitizeFirestoreData(ownerOffer));
}

function getRequesterRecipientKeys(offer) {
  const keys = new Set();
  [
    ...(Array.isArray(offer.requesterKeys) ? offer.requesterKeys : []),
    offer.requesterUid,
    offer.requesterKey,
    offer.requesterEmail,
    offer.requesterName,
  ]
    .filter(Boolean)
    .forEach((key) => keys.add(String(key)));
  return [...keys];
}

function hasSharedKey(leftKeys, rightKeys) {
  const rightSet = new Set(rightKeys.filter(Boolean).map((key) => String(key)));
  return leftKeys.filter(Boolean).some((key) => rightSet.has(String(key)));
}

function isOfferRequestedByAccount(offer, accountKey = getAccountKey(), user = getCurrentUser()) {
  return hasSharedKey(getRequesterRecipientKeys(offer), [accountKey, ...getAccountAliases(user)]);
}

function hasAccountOfferedToListing(listingId, user = getCurrentUser()) {
  const normalizedListingId = String(listingId || "");
  if (!normalizedListingId) return false;

  const accountKeys = [getAccountKey(user), ...getAccountAliases(user)]
    .map(normalizeAccountValue)
    .filter(Boolean);

  return getAllOffers().some((offer) => {
    if (String(offer.listingId) !== normalizedListingId) return false;
    const requesterKeys = getRequesterRecipientKeys(offer).map(normalizeAccountValue);
    return hasSharedKey(requesterKeys, accountKeys);
  });
}

function findRelatedRequesterOffer(sourceOffer) {
  return getAllOffers().find((offer) => {
    if (offer.type !== "sent") return false;
    const sameListing = String(offer.listingId) === String(sourceOffer.listingId);
    const pairedId =
      String(offer.id) === `${sourceOffer.id}-sent` ||
      String(sourceOffer.id) === String(offer.id).replace(/-sent$/, "");
    const sameRequester =
      offer.requesterKey && sourceOffer.requesterKey && offer.requesterKey === sourceOffer.requesterKey;
    const sameRequesterName =
      offer.requesterName && sourceOffer.requesterName && offer.requesterName === sourceOffer.requesterName;

    return sameListing && (pairedId || sameRequester || sameRequesterName);
  });
}

function enrichRequesterOffer(sourceOffer) {
  const relatedOffer = findRelatedRequesterOffer(sourceOffer) || {};
  const requesterKeys = new Set([
    ...getRequesterRecipientKeys(relatedOffer),
    ...getRequesterRecipientKeys(sourceOffer),
  ]);

  return {
    ...relatedOffer,
    ...sourceOffer,
    requesterUid: sourceOffer.requesterUid || relatedOffer.requesterUid || "",
    requesterEmail: sourceOffer.requesterEmail || relatedOffer.requesterEmail || "",
    requesterKey: sourceOffer.requesterKey || relatedOffer.requesterKey || "",
    requesterName: sourceOffer.requesterName || relatedOffer.requesterName || "",
    requesterKeys: [...requesterKeys],
  };
}

function buildOfferRequesterNotification(offer, status) {
  const recipientKeys = getRequesterRecipientKeys(offer);
  const isRejected = status === "Reddedildi";

  return {
    id: `offer-response-${offer.id}-${status}`,
    type: isRejected ? "rejected" : "offer",
    title: isRejected ? "Teklifin reddedildi" : "Teklifin kabul edildi",
    body: `"${offer.listingTitle}" ilan\u0131 i\u00e7in g\u00f6nderdi\u011fin teklif ${status.toLocaleLowerCase("tr-TR")}.`,
    time: new Date().toISOString(),
    read: false,
    href: "teklifler.html?filter=sent",
    offerId: offer.id,
    listingId: offer.listingId,
    recipientKey: recipientKeys[0] || "",
    recipientUid: offer.requesterUid || "",
    recipientEmail: offer.requesterEmail || "",
    recipientKeys,
  };
}

async function publishRequesterNotification(notification, offer) {
  const recipientKeys = notification.recipientKeys?.length
    ? notification.recipientKeys
    : getRequesterRecipientKeys(offer);

  await publishNotificationToRecipients(
    {
      ...notification,
      recipientUid: notification.recipientUid || offer.requesterUid || "",
      recipientEmail: notification.recipientEmail || offer.requesterEmail || "",
    },
    recipientKeys,
  );
}

async function publishOfferStatusToFirestore(sourceOffer, status) {
  const offerIds = new Set([String(sourceOffer.id)]);
  if (String(sourceOffer.id).endsWith("-sent")) {
    offerIds.add(String(sourceOffer.id).replace(/-sent$/, ""));
  } else {
    offerIds.add(`${sourceOffer.id}-sent`);
  }

  await ensureFirestoreAuth();
  await Promise.all(
    [...offerIds].map((offerId) =>
      setDoc(
        doc(db, "offers", offerId),
        sanitizeFirestoreData({
          ...sourceOffer,
          id: offerId,
          type: offerId.endsWith("-sent") ? "sent" : "incoming",
          status,
          respondedAt: new Date().toISOString(),
          updatedAt: Date.now(),
        }),
        { merge: true },
      ),
    ),
  );
}

async function cancelOfferForAccount(sourceOffer) {
  const canceledAt = new Date().toISOString();
  const updatedAt = Date.now();
  const nextStatus = "İptal edildi";
  const offerIds = new Set([String(sourceOffer.id)]);
  if (String(sourceOffer.id).endsWith("-sent")) {
    offerIds.add(String(sourceOffer.id).replace(/-sent$/, ""));
  } else {
    offerIds.add(`${sourceOffer.id}-sent`);
  }

  const offers = getStoredOffers().map((offer) =>
    offerIds.has(String(offer.id)) ? { ...offer, status: nextStatus, canceledAt, updatedAt } : offer,
  );
  localStorage.setItem("ustaOffers", JSON.stringify(offers));

  remoteOffers = remoteOffers.map((offer) =>
    offerIds.has(String(offer.id)) ? { ...offer, status: nextStatus, canceledAt, updatedAt } : offer,
  );
  notifyOfferFeedListeners();
  notifyNotificationFeedListeners();

  await ensureFirestoreAuth();
  await Promise.all(
    [...offerIds].map((offerId) =>
      setDoc(
        doc(db, "offers", offerId),
        sanitizeFirestoreData({
          id: offerId,
          status: nextStatus,
          canceledAt,
          updatedAt,
        }),
        { merge: true },
      ),
    ),
  );
}

function buildAssignedMasterFromOffer(offer) {
  return {
    name: offer.requesterName || "Usta atandı",
    profession: offer.requesterProfession || "Usta",
    phone: offer.requesterPhone || "",
    city: offer.requesterCity || "",
    district: offer.requesterDistrict || "",
    rating: Number(offer.requesterRating || 0),
    reviewCount: Number(offer.requesterReviewCount || 0),
    favoriteCount: Number(offer.requesterFavoriteCount || 0),
    completedJobs: Number(offer.requesterCompletedJobs || 0),
    verified: offer.requesterVerified !== false,
  };
}

function buildListingAssignmentPatch(offer) {
  const assignedAt = new Date().toISOString();
  return {
    status: "assigned",
    assignedAt,
    assignedOfferId: String(offer.id).replace(/-sent$/, ""),
    assignedMasterKey: offer.requesterKey || "",
    assignedMasterUid: offer.requesterUid || "",
    assignedMasterEmail: offer.requesterEmail || "",
    assignedMaster: buildAssignedMasterFromOffer(offer),
    master: buildAssignedMasterFromOffer(offer),
    updatedAt: Date.now(),
  };
}

function applyListingAssignmentLocally(offer) {
  const patch = buildListingAssignmentPatch(offer);
  const listingId = String(offer.listingId);
  const updateListing = (listing) =>
    String(listing.id) === listingId
      ? {
          ...listing,
          ...patch,
          master: {
            ...(listing.master || {}),
            ...patch.master,
          },
        }
      : listing;

  const storedListings = getStoredListings();
  localStorage.setItem("ustaListings", JSON.stringify(storedListings.map(updateListing)));
  remoteListings = remoteListings.map(updateListing);
  notifySharedListingListeners();
}

function applyListingOfferCountLocally(listingId, delta = 1) {
  const updateListing = (listing) =>
    String(listing.id) === String(listingId)
      ? {
          ...listing,
          offers: Math.max(0, Number(listing.offers || 0) + delta),
          updatedAt: Date.now(),
        }
      : listing;

  const storedListings = getStoredListings();
  localStorage.setItem("ustaListings", JSON.stringify(storedListings.map(updateListing)));
  remoteListings = remoteListings.map(updateListing);
  notifySharedListingListeners();
}

function buildListingCompletionPatch(options = {}) {
  const completedAt = new Date().toISOString();
  return {
    status: "completed",
    completedAt,
    updatedAt: Date.now(),
    completionRating: options.ratingScore
      ? {
          score: Number(options.ratingScore),
          ratedAt: completedAt,
          ratedBy: getAccountKey(),
        }
      : null,
    assignedMasterFavorited: Boolean(options.favoriteMaster),
  };
}

function applyListingCompletionLocally(listingId, options = {}) {
  const patch = buildListingCompletionPatch(options);
  const updateListing = (listing) =>
    String(listing.id) === String(listingId)
      ? {
          ...listing,
          ...patch,
        }
      : listing;

  const storedListings = getStoredListings();
  localStorage.setItem("ustaListings", JSON.stringify(storedListings.map(updateListing)));
  remoteListings = remoteListings.map(updateListing);
  notifySharedListingListeners();
}

async function publishListingAssignmentToFirestore(offer) {
  if (!offer?.listingId) return;

  await ensureFirestoreAuth();
  await setDoc(
    doc(db, "listings", String(offer.listingId)),
    sanitizeFirestoreData(buildListingAssignmentPatch(offer)),
    { merge: true },
  );
}

async function publishListingOfferCountToFirestore(listingId) {
  if (!listingId) return;

  await ensureFirestoreAuth();
  await setDoc(
    doc(db, "listings", String(listingId)),
    {
      offers: increment(1),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

async function publishListingCompletionToFirestore(listingId, options = {}) {
  await ensureFirestoreAuth();
  await setDoc(
    doc(db, "listings", String(listingId)),
    sanitizeFirestoreData(buildListingCompletionPatch(options)),
    { merge: true },
  );
}

function applyListingModerationLocally(listingId, patch) {
  const updateListing = (listing) =>
    String(listing.id) === String(listingId)
      ? {
          ...listing,
          ...patch,
        }
      : listing;

  const storedListings = getStoredListings();
  localStorage.setItem("ustaListings", JSON.stringify(storedListings.map(updateListing)));
  remoteListings = remoteListings.map(updateListing);
  notifySharedListingListeners();
}

function upsertListingLocally(updatedListing) {
  const listingId = String(updatedListing.id);
  const storedListings = getStoredListings();
  const existsLocally = storedListings.some((listing) => String(listing.id) === listingId);
  const nextStoredListings = existsLocally
    ? storedListings.map((listing) => (String(listing.id) === listingId ? updatedListing : listing))
    : [updatedListing, ...storedListings];

  localStorage.setItem("ustaListings", JSON.stringify(nextStoredListings));
  remoteListings = remoteListings.some((listing) => String(listing.id) === listingId)
    ? remoteListings.map((listing) => (String(listing.id) === listingId ? updatedListing : listing))
    : [updatedListing, ...remoteListings];
  notifySharedListingListeners();
}

function removeListingLocally(listingId) {
  const removeListing = (listing) => String(listing.id) !== String(listingId);
  localStorage.setItem("ustaListings", JSON.stringify(getStoredListings().filter(removeListing)));
  remoteListings = remoteListings.filter(removeListing);
  notifySharedListingListeners();
}

async function publishListingModerationToFirestore(listingId, patch) {
  await ensureFirestoreAuth();
  await setDoc(doc(db, "listings", String(listingId)), sanitizeFirestoreData(patch), { merge: true });
}

async function publishListingUpdateToFirestore(listing) {
  await ensureFirestoreAuth();
  await setDoc(doc(db, "listings", String(listing.id)), sanitizeFirestoreData(listing), { merge: true });
}

async function deleteListingFromFirestore(listingId) {
  await ensureFirestoreAuth();
  await deleteDoc(doc(db, "listings", String(listingId)));
}

let remoteOffers = [];
let sharedOffersUnsubscribe = null;
const sharedOfferListeners = new Set();

function normalizeRemoteOffer(snapshot) {
  const data = snapshot.data();
  return {
    ...data,
    id: data.id || snapshot.id,
    amount: Number(data.amount || 0),
  };
}

function notifyOfferFeedListeners() {
  sharedOfferListeners.forEach((listener) => listener());
}

function subscribeOfferFeed(listener) {
  sharedOfferListeners.add(listener);
  listener();
  return () => sharedOfferListeners.delete(listener);
}

function startGlobalOffersFeed() {
  if (sharedOffersUnsubscribe) return;

  sharedOffersUnsubscribe = onSnapshot(
    collection(db, "offers"),
    (snapshot) => {
      remoteOffers = snapshot.docs.map((docSnapshot) => normalizeRemoteOffer(docSnapshot)).filter(isAfterDataReset);
      notifyOfferFeedListeners();
      notifyNotificationFeedListeners();
    },
    (error) => {
      console.warn("Teklif akışı dinlenemedi:", error);
    },
  );
}

function normalizeRemoteNotification(snapshot) {
  const data = snapshot.data();
  return {
    id: data.id || snapshot.id,
    type: data.type || "offer",
    title: data.title || "Yeni bildirim",
    body: data.body || "",
    time: data.time || new Date(data.createdAt || Date.now()).toISOString(),
    read: Boolean(data.read),
    href: data.href || "teklifler.html?filter=incoming",
    offerId: data.offerId || "",
    listingId: data.listingId || "",
    recipientKey: data.recipientKey || "",
    recipientUid: data.recipientUid || "",
    recipientEmail: data.recipientEmail || "",
    recipientKeys: Array.isArray(data.recipientKeys) ? data.recipientKeys : [],
  };
}

function notifyNotificationFeedListeners() {
  sharedNotificationListeners.forEach((listener) => listener());
}

function subscribeNotificationFeed(listener) {
  sharedNotificationListeners.add(listener);
  listener();
  return () => sharedNotificationListeners.delete(listener);
}

function shouldKeepNotificationForAccount(notification, accountKey, user = getCurrentUser()) {
  const remoteNotification = remoteNotifications.find(
    (item) => String(item.id) === String(notification.id),
  );

  if (remoteNotification) {
    return notificationMatchesAccount(remoteNotification, accountKey, user);
  }

  const hasRecipientData =
    notification.recipientKey ||
    notification.recipientUid ||
    notification.recipientEmail ||
    (Array.isArray(notification.recipientKeys) && notification.recipientKeys.length);

  return hasRecipientData ? notificationMatchesAccount(notification, accountKey, user) : true;
}

function mergeRemoteNotifications(inbox, accountKey = getAccountKey(), user = getCurrentUser()) {
  const readIds = getReadNotificationIdsForAccount(user);
  const mergedMap = new Map(
    inbox.map((item) => [
      String(item.id),
      {
        ...item,
        read: item.read || readIds.has(String(item.id)),
      },
    ]),
  );

  remoteNotifications
    .filter((notification) => notificationMatchesAccount(notification, accountKey, user))
    .forEach((notification) => {
      const id = String(notification.id);
      const existing = mergedMap.get(id);
      mergedMap.set(id, {
        ...existing,
        id: notification.id,
        type: notification.type || "offer",
        title: notification.title,
        body: notification.body,
        time: notification.time,
        read: Boolean(existing?.read || notification.read || readIds.has(id)),
        href: notification.href || "teklifler.html?filter=incoming",
        recipientKey: notification.recipientKey || "",
        recipientUid: notification.recipientUid || "",
        recipientEmail: notification.recipientEmail || "",
        recipientKeys: notification.recipientKeys || [],
      });
    });

  return [...mergedMap.values()].sort((left, right) => new Date(right.time) - new Date(left.time));
}

function notificationMatchesAccount(notification, accountKey, user = getCurrentUser()) {
  const aliases = new Set([accountKey, ...getAccountAliases(user)].filter(Boolean).map((key) => String(key)));
  const recipientKeys = Array.isArray(notification.recipientKeys) ? notification.recipientKeys : [];
  const notificationKeys = [
    notification.recipientKey,
    notification.recipientUid,
    notification.recipientEmail,
    ...recipientKeys,
  ]
    .filter(Boolean)
    .map((key) => String(key));

  return notificationKeys.some((key) => aliases.has(key));
}

function startGlobalNotificationsFeed() {
  if (sharedNotificationsUnsubscribe) return;

  sharedNotificationsUnsubscribe = onSnapshot(
    collection(db, "notifications"),
    (snapshot) => {
      remoteNotifications = snapshot.docs.map((docSnapshot) => normalizeRemoteNotification(docSnapshot)).filter(isAfterDataReset);
      notifyNotificationFeedListeners();
    },
    (error) => {
      console.warn("Bildirim akışı dinlenemedi:", error);
    },
  );
}

async function markRemoteNotificationRead(notificationId) {
  try {
    await ensureFirestoreAuth();
    await setDoc(
      doc(db, "notifications", String(notificationId)),
      sanitizeFirestoreData({
        read: true,
        readAt: Date.now(),
      }),
      { merge: true },
    );
  } catch (error) {
    console.warn("Bildirim okundu durumu Firestore'a yazÄ±lamadÄ±:", error);
  }
}

function restartSharedFeeds() {
  if (sharedOffersUnsubscribe) {
    sharedOffersUnsubscribe();
    sharedOffersUnsubscribe = null;
  }
  if (sharedNotificationsUnsubscribe) {
    sharedNotificationsUnsubscribe();
    sharedNotificationsUnsubscribe = null;
  }

  startGlobalOffersFeed();
  startGlobalNotificationsFeed();
}

function syncRelatedOfferStatus(sourceOffer, status) {
  const offers = getStoredOffers();
  const respondedAt = new Date().toISOString();
  const updatedAt = Date.now();
  const nextOffers = offers.map((offer) => {
    const sameListing = String(offer.listingId) === String(sourceOffer.listingId);
    const sameRequester =
      (offer.requesterName && sourceOffer.requesterName && offer.requesterName === sourceOffer.requesterName) ||
      String(offer.id) === `${sourceOffer.id}-sent` ||
      String(sourceOffer.id) === `${offer.id}-sent`;

    return sameListing && sameRequester ? { ...offer, status, respondedAt, updatedAt } : offer;
  });

  localStorage.setItem("ustaOffers", JSON.stringify(nextOffers));
}

function isOfferVisibleForAccount(offer, accountKey = getAccountKey(), user = getCurrentUser()) {
  const uid = user.uid || "";
  const email = user.email || "";

  if (!offer.requesterKey && !offer.ownerKey && !offer.ownerUid) return true;
  if (offer.type === "sent") {
    return isOfferRequestedByAccount(offer, accountKey, user);
  }
  if (offer.type === "incoming") {
    return isIncomingOfferForAccount(offer, accountKey, user);
  }
  return (
    normalizeAccountValue(offer.requesterKey) === accountKey ||
    normalizeAccountValue(offer.ownerKey) === accountKey ||
    (uid && (normalizeAccountValue(offer.requesterUid) === normalizeAccountValue(uid) || normalizeAccountValue(offer.ownerUid) === normalizeAccountValue(uid))) ||
    (email && normalizeAccountValue(offer.ownerEmail) === normalizeAccountValue(email))
  );
}

function saveVisibleOffersForAccount(updatedOffers, accountKey = getAccountKey()) {
  const untouchedOffers = getStoredOffers().filter((offer) => !isOfferVisibleForAccount(offer, accountKey));
  const visibleStoredOffers = updatedOffers.filter(
    (offer) => !String(offer.id).startsWith("sample") && !(offer.type === "incoming" && offer.status === "Reddedildi"),
  );
  localStorage.setItem("ustaOffers", JSON.stringify([...visibleStoredOffers, ...untouchedOffers]));
}

function formatNotificationTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Az önce";

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Az önce";
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gün önce`;

  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function getNotificationTypeMark(type) {
  const marks = {
    offer: "TF",
    request: "TP",
    rejected: "RT",
    message: "MS",
    job: "İŞ",
    security: "GV",
  };

  return marks[type] || "BL";
}

function getDefaultNotificationInbox(role) {
  return [];
}

function mergeOfferNotifications(inbox, accountKey = getAccountKey(), user = getCurrentUser()) {
  const readIds = getReadNotificationIdsForAccount(user);
  const existingIds = new Set(inbox.map((item) => item.id));
  const merged = inbox.map((item) => ({
    ...item,
    read: item.read || readIds.has(String(item.id)),
  }));

  getAllOffers()
    .filter(
      (offer) =>
        isIncomingOfferForAccount(offer, accountKey, user) &&
        (offer.status === "Yeni" || offer.status === "Gönderildi"),
    )
    .forEach((offer) => {
      const id = `offer-${offer.id}`;
      if (existingIds.has(id)) return;

      const amount = Number(offer.amount || 0).toLocaleString("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      });

      merged.unshift({
        id,
        type: "offer",
        title: "İlanına yeni teklif",
        body: `${offer.requesterName || "Bir usta"} "${offer.listingTitle}" ilanına ${amount} teklif gönderdi.`,
        time: offer.createdAt || new Date().toISOString(),
        read: readIds.has(id),
        href: "teklifler.html?filter=incoming",
      });
      existingIds.add(id);
    });

  getAllOffers()
    .filter(
      (offer) =>
        offer.type === "sent" &&
        isOfferRequestedByAccount(offer, accountKey, user) &&
        (offer.status === "Kabul edildi" || offer.status === "Reddedildi"),
    )
    .forEach((offer) => {
      const id = `offer-response-${String(offer.id).replace(/-sent$/, "")}-${offer.status}`;
      if (existingIds.has(id)) return;

      const isRejected = offer.status === "Reddedildi";
      merged.unshift({
        id,
        type: isRejected ? "rejected" : "offer",
        title: isRejected ? "Teklifin reddedildi" : "Teklifin kabul edildi",
        body: `"${offer.listingTitle}" ilan\u0131 i\u00e7in g\u00f6nderdi\u011fin teklif ${offer.status.toLocaleLowerCase("tr-TR")}.`,
        time: offer.respondedAt || offer.updatedAt || new Date().toISOString(),
        read: readIds.has(id),
        href: "teklifler.html?filter=sent",
      });
      existingIds.add(id);
    });

  return merged.sort((left, right) => new Date(right.time) - new Date(left.time));
}

function getPaymentSettings() {
  try {
    return JSON.parse(localStorage.getItem("ustaPaymentSettings")) || {};
  } catch {
    return {};
  }
}

function saveRating(listingId, rating) {
  const ratings = getStoredRatings();
  ratings[listingId] = rating;
  localStorage.setItem("ustaRatings", JSON.stringify(ratings));
}

function getStoredFavoriteMasters() {
  try {
    return JSON.parse(localStorage.getItem("ustaFavoriteMasters")) || {};
  } catch {
    return {};
  }
}

function saveStoredFavoriteMasters(favorites) {
  localStorage.setItem("ustaFavoriteMasters", JSON.stringify(favorites));
}

function getStoredMasterFavoriteStats() {
  try {
    return JSON.parse(localStorage.getItem("ustaMasterFavoriteStats")) || {};
  } catch {
    return {};
  }
}

function saveStoredMasterFavoriteStats(stats) {
  localStorage.setItem("ustaMasterFavoriteStats", JSON.stringify(stats));
}

function getFirestoreSafeId(value) {
  return encodeURIComponent(String(value || "unknown")).replace(/\./g, "%2E");
}

function getMasterStatKey(source = {}) {
  return normalizeAccountValue(
    source.requesterKey ||
      source.assignedMasterKey ||
      source.key ||
      source.requesterUid ||
      source.assignedMasterUid ||
      source.uid ||
      source.requesterEmail ||
      source.assignedMasterEmail ||
      source.email ||
      source.requesterName ||
      source.name,
  );
}

function getAssignedMasterInfo(listing = {}) {
  const master = listing.assignedMaster || listing.master || {};
  return {
    key: getMasterStatKey({
      assignedMasterKey: listing.assignedMasterKey,
      assignedMasterUid: listing.assignedMasterUid,
      assignedMasterEmail: listing.assignedMasterEmail,
      ...master,
    }),
    name: master.name || "Atanan usta",
    profession: master.profession || `${listing.category || "Genel"} uzmanı`,
    phone: master.phone || "",
    city: master.city || "",
    district: master.district || "",
    rating: Number(master.rating || 0),
    reviewCount: Number(master.reviewCount || 0),
    completedJobs: Number(master.completedJobs || 0),
    verified: master.verified !== false,
  };
}

function getCompletedMasterStats(masterSource = {}) {
  const masterKey = getMasterStatKey(masterSource);
  const strongAliases = [
    masterKey,
    masterSource.requesterKey,
    masterSource.assignedMasterKey,
    masterSource.key,
    masterSource.requesterUid,
    masterSource.assignedMasterUid,
    masterSource.uid,
    masterSource.requesterEmail,
    masterSource.assignedMasterEmail,
    masterSource.email,
  ]
    .map(normalizeAccountValue)
    .filter(Boolean);
  const nameAliases = [masterSource.requesterName, masterSource.name].map(normalizeAccountValue).filter(Boolean);
  const aliases = new Set(strongAliases.length ? strongAliases : nameAliases);
  const allowNameMatch = !strongAliases.length;

  if (!aliases.size) {
    return { rating: 0, reviewCount: 0, completedJobs: 0 };
  }

  const completedListings = getAllListings().filter((listing) => {
    if (!isCompletedListing(listing)) return false;

    const master = listing.assignedMaster || listing.master || {};
    return [
      listing.assignedMasterKey,
      listing.assignedMasterUid,
      listing.assignedMasterEmail,
      master.key,
      master.uid,
      master.email,
      allowNameMatch ? master.name : "",
    ].some((value) => aliases.has(normalizeAccountValue(value)));
  });
  const scores = completedListings
    .map((listing) => Number(listing.completionRating?.score || 0))
    .filter((score) => score > 0);

  return {
    rating: scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : 0,
    reviewCount: scores.length,
    completedJobs: completedListings.length,
  };
}

function getLocalMasterFavoriteCount(masterKey) {
  const key = normalizeAccountValue(masterKey);
  if (!key) return 0;
  return Number(getStoredMasterFavoriteStats()[key] || 0);
}

function setLocalMasterFavoriteCount(masterKey, count) {
  const key = normalizeAccountValue(masterKey);
  if (!key) return;
  const stats = getStoredMasterFavoriteStats();
  stats[key] = Math.max(0, Number(count || 0));
  saveStoredMasterFavoriteStats(stats);
}

async function getRemoteMasterFavoriteCount(masterSource = {}) {
  const masterKey = getMasterStatKey(masterSource);
  if (!masterKey) return 0;

  const localCount = getLocalMasterFavoriteCount(masterKey);
  try {
    await ensureFirestoreAuth();
    const snapshot = await withTimeout(getDoc(doc(db, "masterStats", getFirestoreSafeId(masterKey))), 7000);
    if (!snapshot.exists()) return localCount;
    const count = Number(snapshot.data().favoriteCount || 0);
    setLocalMasterFavoriteCount(masterKey, count);
    return count;
  } catch (error) {
    console.warn("Usta favori sayısı okunamadı:", error);
    return localCount;
  }
}

function saveFavoriteMasterLocally(master, listing, ratingScore) {
  const masterKey = getMasterStatKey(master);
  if (!masterKey) return false;

  const ownerKey = getAccountKey();
  const favoriteId = `${ownerKey}:${masterKey}`;
  const favorites = getStoredFavoriteMasters();
  const isNewFavorite = !favorites[favoriteId];
  favorites[favoriteId] = {
    id: favoriteId,
    masterKey,
    masterName: master.name || "Favori usta",
    profession: master.profession || `${listing.category || "Genel"} uzmanı`,
    city: master.city || listing.city || "",
    district: master.district || listing.district || "",
    rating: Number(master.rating || ratingScore || 0),
    reviewCount: Number(master.reviewCount || 0),
    listingId: listing.id || "",
    listingTitle: listing.title || "",
    ownerKey,
    favoritedAt: new Date().toISOString(),
  };
  saveStoredFavoriteMasters(favorites);

  if (isNewFavorite) {
    setLocalMasterFavoriteCount(masterKey, getLocalMasterFavoriteCount(masterKey) + 1);
  }

  return isNewFavorite;
}

async function publishFavoriteMaster(master, listing, ratingScore) {
  const masterKey = getMasterStatKey(master);
  if (!masterKey) return;

  const user = getCurrentUser();
  const ownerKey = getAccountKey(user);
  const favoriteId = `${ownerKey}:${masterKey}`;
  const favoriteRef = doc(db, "masterFavorites", getFirestoreSafeId(favoriteId));
  const statsRef = doc(db, "masterStats", getFirestoreSafeId(masterKey));

  await ensureFirestoreAuth();
  const existingFavorite = await getDoc(favoriteRef);
  await setDoc(
    favoriteRef,
    sanitizeFirestoreData({
      id: favoriteId,
      masterKey,
      masterName: master.name || "Favori usta",
      profession: master.profession || `${listing.category || "Genel"} uzmanı`,
      listingId: listing.id || "",
      listingTitle: listing.title || "",
      ownerKey,
      ownerUid: user.uid || "",
      ownerEmail: user.email || "",
      ratingScore,
      favoritedAt: new Date().toISOString(),
      updatedAt: Date.now(),
    }),
    { merge: true },
  );

  await setDoc(
    statsRef,
    {
      masterKey,
      masterName: master.name || "Favori usta",
      favoriteCount: existingFavorite.exists() ? increment(0) : increment(1),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

const defaultListings = [
  {
    id: 1,
    title: "2+1 ev boya badana",
    category: "Boya",
    city: "İstanbul",
    district: "Kadıköy",
    workDate: addDays(0),
    time: "Bugün",
    budget: 4800,
    details: "Eşyalı ev, iki oda ve salon. Malzeme hazır, temiz işçilik önemli.",
    offers: 7,
    featured: true,
    image: "assets/listing-paint.svg",
    owner: { name: "Merve A.", rating: 9.2, reviewCount: 18 },
    master: { name: "Ali K.", rating: 9.4, reviewCount: 26 },
  },
  {
    id: 2,
    title: "Banyo lavabo altı kaçak",
    category: "Tesisat",
    city: "İstanbul",
    district: "Üsküdar",
    workDate: addDays(0),
    time: "Bugün",
    budget: 1400,
    details: "Lavabo altından damlatıyor. Hızlı çözüm lazım.",
    offers: 5,
    featured: true,
    image: "assets/listing-plumbing.svg",
    owner: { name: "Can B.", rating: 8.7, reviewCount: 11 },
    master: { name: "Cem A.", rating: 9.1, reviewCount: 21 },
  },
  {
    id: 3,
    title: "Avize ve üç priz montajı",
    category: "Elektrik",
    city: "İstanbul",
    district: "Şişli",
    workDate: addDays(1),
    time: "Yarın",
    budget: 1800,
    details: "Salon avizesi, çocuk odası priz değişimi ve koridor anahtarı kontrolü.",
    offers: 4,
    featured: true,
    image: "assets/listing-electric.svg",
    owner: { name: "Selin D.", rating: 9.6, reviewCount: 32 },
    master: { name: "Deniz Y.", rating: 9.3, reviewCount: 19 },
  },
  {
    id: 4,
    title: "Ofis raf sistemi kurulumu",
    category: "Montaj",
    city: "İstanbul",
    district: "Ataşehir",
    workDate: addDays(4),
    time: "Bu hafta",
    budget: 3200,
    details: "Hazır metal raf sistemi. Matkap ve dübel işi var.",
    offers: 3,
    featured: true,
    image: "assets/listing-montage.svg",
    owner: { name: "Efe T.", rating: 8.9, reviewCount: 14 },
    master: { name: "Murat U.", rating: 8.8, reviewCount: 16 },
  },
  {
    id: 5,
    title: "Küçük ev taşıma yardımı",
    category: "Taşıma",
    city: "İstanbul",
    district: "Bakırköy",
    workDate: addDays(1),
    time: "Yarın",
    budget: 2600,
    details: "Asansörlü binadan asansörlü binaya. Büyük beyaz eşya yok.",
    offers: 6,
    featured: true,
    image: "assets/listing-moving.svg",
    owner: { name: "Burak S.", rating: 8.5, reviewCount: 9 },
    master: { name: "Taşıma Ekibi", rating: 9.0, reviewCount: 23 },
  },
  {
    id: 6,
    title: "Mutfak dolabı kapak ayarı",
    category: "Montaj",
    city: "İstanbul",
    district: "Kadıköy",
    workDate: addDays(6),
    time: "Bu hafta",
    budget: 1200,
    details: "Dört dolap kapağında menteşe ayarı ve bir ray değişimi gerekiyor.",
    offers: 2,
    featured: false,
    image: "assets/listing-montage.svg",
    owner: { name: "Ayşe K.", rating: 9.0, reviewCount: 12 },
    master: { name: "Hakan M.", rating: 8.6, reviewCount: 10 },
  },
  {
    id: 7,
    title: "Kombi petek havası ve bakım",
    category: "Tesisat",
    city: "İstanbul",
    district: "Şişli",
    workDate: addDays(0),
    time: "Bugün",
    budget: 1900,
    details: "Petekler tam ısınmıyor. Kombi kontrolüyle beraber çözülmesini istiyorum.",
    offers: 8,
    featured: true,
    image: "assets/listing-plumbing.svg",
    owner: { name: "Onur E.", rating: 8.8, reviewCount: 15 },
    master: { name: "Cem A.", rating: 9.1, reviewCount: 21 },
  },
  {
    id: 8,
    title: "Boş daire detaylı temizlik",
    category: "Temizlik",
    city: "İstanbul",
    district: "Üsküdar",
    workDate: addDays(1),
    time: "Yarın",
    budget: 3000,
    details: "Taşınma öncesi mutfak, banyo, cam ve zemin temizliği yapılacak.",
    offers: 9,
    featured: true,
    image: "assets/listing-cleaning.svg",
    owner: { name: "Derya N.", rating: 9.5, reviewCount: 28 },
    master: { name: "Temizlik Ekibi", rating: 9.2, reviewCount: 34 },
  },
  {
    id: 9,
    title: "Kafe için tek sayfalık web sitesi",
    category: "Web sitesi",
    city: "İstanbul",
    district: "Kadıköy",
    workDate: addDays(5),
    time: "Bu hafta",
    budget: 9000,
    details: "Menü, konum, galeri ve iletişim formu olan hızlı açılan bir site istiyoruz.",
    expectations: "Mobil uyumlu tasarım, temel SEO ve yayına alma desteği gerekiyor.",
    workLocationMode: "remote",
    tags: ["web", "landing page", "seo", "mobil uyumlu"],
    offers: 4,
    featured: true,
    owner: { name: "Nehir K.", rating: 9.1, reviewCount: 13 },
    master: { name: "Web Atölyesi", rating: 9.5, reviewCount: 31 },
  },
  {
    id: 10,
    title: "Mobil uygulama ekranları için UI tasarım",
    category: "UI/UX tasarım",
    city: "Ankara",
    district: "Çankaya",
    workDate: addDays(8),
    time: "Bu hafta",
    budget: 12000,
    details: "Rezervasyon uygulaması için 8-10 ekranlık temiz bir arayüz tasarımı gerekiyor.",
    expectations: "Figma dosyası, component düzeni ve kısa kullanıcı akışı bekliyoruz.",
    workLocationMode: "remote",
    tags: ["figma", "ui", "ux", "mobil"],
    offers: 6,
    featured: true,
    owner: { name: "Mert Y.", rating: 8.9, reviewCount: 10 },
    master: { name: "Studio Rota", rating: 9.6, reviewCount: 24 },
  },
  {
    id: 11,
    title: "Butik için sosyal medya içerik planı",
    category: "Sosyal medya",
    city: "İzmir",
    district: "Konak",
    workDate: addDays(3),
    time: "Bu hafta",
    budget: 6500,
    details: "Instagram için 1 aylık post, reels fikri ve kampanya metinleri hazırlanacak.",
    expectations: "Takvim, görsel yönlendirme ve paylaşım metinleri düzenli teslim edilmeli.",
    workLocationMode: "remote",
    tags: ["instagram", "reels", "içerik", "butik"],
    offers: 5,
    featured: false,
    owner: { name: "Ece B.", rating: 9.3, reviewCount: 16 },
    master: { name: "İçerik Masası", rating: 9.0, reviewCount: 19 },
  },
  {
    id: 12,
    title: "Abiye elbise daraltma ve paça tadilatı",
    category: "Terzi",
    city: "Bursa",
    district: "Nilüfer",
    workDate: addDays(2),
    time: "Yarın",
    budget: 2200,
    details: "Düğün öncesi abiye bel daraltma, askı ayarı ve paça boyu yapılacak.",
    expectations: "Prova yapılabilen, temiz dikiş çıkaran bir terzi arıyoruz.",
    tags: ["abiye", "terzi", "tadilat", "acil"],
    offers: 3,
    featured: false,
    owner: { name: "Buse A.", rating: 9.4, reviewCount: 18 },
    master: { name: "Moda Terzi", rating: 9.2, reviewCount: 27 },
  },
  {
    id: 13,
    title: "Lise matematik için online özel ders",
    category: "Özel ders",
    city: "İstanbul",
    district: "Beşiktaş",
    workDate: addDays(4),
    time: "Bu hafta",
    budget: 3000,
    details: "11. sınıf öğrencisi için haftada iki gün online matematik desteği gerekiyor.",
    expectations: "Konu anlatımı, soru çözümü ve kısa ödev takibi yapılmalı.",
    workLocationMode: "remote",
    tags: ["matematik", "online", "lise", "özel ders"],
    offers: 7,
    featured: true,
    owner: { name: "Deniz P.", rating: 8.8, reviewCount: 9 },
    master: { name: "Eğitim Koçu", rating: 9.7, reviewCount: 42 },
  },
  {
    id: 14,
    title: "30 kişilik doğum günü için catering",
    category: "Catering",
    city: "İstanbul",
    district: "Ataşehir",
    workDate: addDays(10),
    time: "Bu hafta",
    budget: 15000,
    details: "Evde yapılacak kutlama için atıştırmalık, tatlı ve içecek servisi isteniyor.",
    expectations: "Menü önerisi, kurulum ve etkinlik sonrası toparlama desteği bekleniyor.",
    tags: ["catering", "doğum günü", "organizasyon", "ikram"],
    offers: 4,
    featured: true,
    owner: { name: "Arda S.", rating: 9.0, reviewCount: 12 },
    master: { name: "Lezzet Ekibi", rating: 9.3, reviewCount: 35 },
  },
  {
    id: 15,
    title: "Online mağaza için ürün fotoğraf çekimi",
    category: "Fotoğraf çekimi",
    city: "İzmir",
    district: "Karşıyaka",
    workDate: addDays(6),
    time: "Bu hafta",
    budget: 8000,
    details: "Takı ürünleri için beyaz fonda ve yaşam tarzı konseptinde fotoğraf çekilecek.",
    expectations: "Işık, düzenleme ve e-ticaret ölçülerinde teslim dahil olmalı.",
    tags: ["ürün fotoğrafı", "e-ticaret", "takı", "çekim"],
    offers: 5,
    featured: false,
    owner: { name: "Selma T.", rating: 9.2, reviewCount: 20 },
    master: { name: "Lens Studio", rating: 9.4, reviewCount: 29 },
  },
  {
    id: 16,
    title: "Evde saç kesimi ve fön hizmeti",
    category: "Kuaför",
    city: "Ankara",
    district: "Keçiören",
    workDate: addDays(1),
    time: "Yarın",
    budget: 1800,
    details: "Evden çıkamayan aile büyüğümüz için saç kesimi ve fön hizmeti arıyoruz.",
    expectations: "Hijyenik ekipman, nazik iletişim ve randevu saatine uyum önemli.",
    tags: ["kuaför", "evde hizmet", "saç kesimi", "fön"],
    offers: 2,
    featured: false,
    owner: { name: "Gizem L.", rating: 8.7, reviewCount: 8 },
    master: { name: "Bakım Uzmanı", rating: 9.1, reviewCount: 17 },
  },
  {
    id: 17,
    title: "Restoran için online sipariş modülü",
    category: "Yazılım geliştirme",
    city: "İstanbul",
    district: "Beşiktaş",
    workDate: addDays(6),
    budget: 18000,
    details: "Mevcut siteye menü, sepet ve sipariş takip modülü eklenecek.",
    expectations: "Temiz panel, mobil uyum ve teslim sonrası kısa destek bekleniyor.",
    workLocationMode: "remote",
    tags: ["yazılım", "sipariş", "panel", "restoran"],
    offers: 6,
    featured: true,
    image: categoryImageMap["Yazılım geliştirme"],
    owner: { name: "Kerem O.", rating: 9.0, reviewCount: 15 },
    master: { name: "Kod Atölyesi", rating: 9.5, reviewCount: 38 },
  },
  {
    id: 18,
    title: "Butik için e-ticaret ürün girişi",
    category: "E-ticaret",
    city: "İzmir",
    district: "Bornova",
    workDate: addDays(3),
    budget: 7500,
    details: "120 ürünün açıklama, varyant ve görselleri mağazaya girilecek.",
    expectations: "Düzenli kategori yapısı ve stok bilgisi kontrolü gerekiyor.",
    workLocationMode: "remote",
    tags: ["e-ticaret", "ürün girişi", "stok", "butik"],
    offers: 8,
    featured: false,
    image: categoryImageMap["E-ticaret"],
    owner: { name: "Aylin C.", rating: 9.1, reviewCount: 19 },
    master: { name: "Mağaza Destek", rating: 9.2, reviewCount: 26 },
  },
  {
    id: 19,
    title: "Mobil uygulama için API bağlantısı",
    category: "Backend API",
    city: "Ankara",
    district: "Çankaya",
    workDate: addDays(5),
    budget: 14000,
    details: "Kullanıcı girişi, listeleme ve bildirim uçları hazırlanacak.",
    expectations: "Dokümantasyon ve test ortamı kurulumu dahil olmalı.",
    workLocationMode: "remote",
    tags: ["api", "backend", "mobil", "dokümantasyon"],
    offers: 5,
    featured: true,
    image: categoryImageMap["Backend API"],
    owner: { name: "Tolga M.", rating: 8.8, reviewCount: 11 },
    master: { name: "API Laboratuvarı", rating: 9.4, reviewCount: 22 },
  },
  {
    id: 20,
    title: "WordPress hız ve güvenlik ayarı",
    category: "WordPress",
    city: "Bursa",
    district: "Osmangazi",
    workDate: addDays(2),
    budget: 5000,
    details: "Yavaş açılan kurumsal sitede hız, yedekleme ve güvenlik ayarı yapılacak.",
    expectations: "Önce/sonra hız raporu ve temel bakım önerisi istiyoruz.",
    workLocationMode: "remote",
    tags: ["wordpress", "hız", "güvenlik", "bakım"],
    offers: 7,
    featured: false,
    image: categoryImageMap.WordPress,
    owner: { name: "Seda İ.", rating: 9.3, reviewCount: 21 },
    master: { name: "WP Klinik", rating: 9.1, reviewCount: 30 },
  },
  {
    id: 21,
    title: "Shopify mağaza tema düzenleme",
    category: "Shopify",
    city: "Antalya",
    district: "Muratpaşa",
    workDate: addDays(4),
    budget: 9500,
    details: "Ana sayfa, koleksiyon kartları ve ödeme öncesi küçük düzenlemeler yapılacak.",
    expectations: "Mevcut tema korunarak sade ve hızlı bir görünüm istiyoruz.",
    workLocationMode: "remote",
    tags: ["shopify", "tema", "mağaza", "tasarım"],
    offers: 4,
    featured: true,
    image: categoryImageMap.Shopify,
    owner: { name: "Rana G.", rating: 8.9, reviewCount: 14 },
    master: { name: "Shop Studio", rating: 9.3, reviewCount: 25 },
  },
  {
    id: 22,
    title: "Çocuk oyunu için karakter animasyonu",
    category: "Oyun geliştirme",
    city: "İstanbul",
    district: "Kadıköy",
    workDate: addDays(7),
    budget: 16000,
    details: "2D mobil oyun için üç karakter koşma, zıplama ve idle animasyonu yapılacak.",
    expectations: "Sprite sheet ve kaynak dosyalar teslim edilmeli.",
    workLocationMode: "remote",
    tags: ["oyun", "animasyon", "2d", "sprite"],
    offers: 3,
    featured: false,
    image: categoryImageMap["Oyun geliştirme"],
    owner: { name: "Emirhan D.", rating: 8.7, reviewCount: 10 },
    master: { name: "Pixel Oda", rating: 9.0, reviewCount: 18 },
  },
  {
    id: 23,
    title: "Kahve markası için logo tasarımı",
    category: "Logo ve marka",
    city: "Eskişehir",
    district: "Odunpazarı",
    workDate: addDays(3),
    budget: 6500,
    details: "Yeni kahve markası için logo, renk paleti ve basit marka kılavuzu gerekiyor.",
    expectations: "Üç konsept önerisi ve revize hakkı bekleniyor.",
    workLocationMode: "remote",
    tags: ["logo", "marka", "kahve", "kurumsal"],
    offers: 9,
    featured: true,
    image: categoryImageMap["Logo ve marka"],
    owner: { name: "Melis U.", rating: 9.5, reviewCount: 27 },
    master: { name: "Marka Çizgi", rating: 9.4, reviewCount: 33 },
  },
  {
    id: 24,
    title: "Etkinlik afişi ve sosyal medya görselleri",
    category: "Grafik tasarım",
    city: "İstanbul",
    district: "Şişli",
    workDate: addDays(1),
    budget: 4200,
    details: "Konser duyurusu için afiş, hikaye ve post ölçülerinde görseller hazırlanacak.",
    expectations: "Bugün brief verilecek, yarına ilk taslak bekleniyor.",
    workLocationMode: "remote",
    tags: ["afiş", "post", "konser", "grafik"],
    offers: 6,
    featured: false,
    image: categoryImageMap["Grafik tasarım"],
    owner: { name: "Bora Ş.", rating: 8.8, reviewCount: 12 },
    master: { name: "Posterhane", rating: 9.2, reviewCount: 24 },
  },
  {
    id: 25,
    title: "Tanıtım videosu kurgu ve altyazı",
    category: "Video kurgu",
    city: "Ankara",
    district: "Yenimahalle",
    workDate: addDays(5),
    budget: 8500,
    details: "Ham çekimlerden 60 saniyelik tanıtım videosu ve kısa reels versiyonu çıkarılacak.",
    expectations: "Renk, müzik, altyazı ve iki revize dahil olmalı.",
    workLocationMode: "remote",
    tags: ["video", "kurgu", "reels", "altyazı"],
    offers: 7,
    featured: true,
    image: categoryImageMap["Video kurgu"],
    owner: { name: "İpek V.", rating: 9.0, reviewCount: 16 },
    master: { name: "Kurgu Masası", rating: 9.3, reviewCount: 28 },
  },
  {
    id: 26,
    title: "Klinik için SEO içerik planı",
    category: "SEO",
    city: "İstanbul",
    district: "Bakırköy",
    workDate: addDays(6),
    budget: 11000,
    details: "Klinik sitesi için anahtar kelime araştırması ve 12 yazılık içerik planı yapılacak.",
    expectations: "Rakip analizi, başlık önerileri ve öncelik sıralaması istiyoruz.",
    workLocationMode: "remote",
    tags: ["seo", "içerik", "klinik", "anahtar kelime"],
    offers: 5,
    featured: false,
    image: categoryImageMap.SEO,
    owner: { name: "Dr. Elif T.", rating: 9.4, reviewCount: 22 },
    master: { name: "SEO Rota", rating: 9.1, reviewCount: 31 },
  },
  {
    id: 27,
    title: "Google reklam hesabı kurulumu",
    category: "Reklam yönetimi",
    city: "İzmir",
    district: "Konak",
    workDate: addDays(2),
    budget: 7000,
    details: "Yeni servis firması için Google Ads hesap kurulumu ve ilk kampanya açılacak.",
    expectations: "Dönüşüm takibi ve bütçe önerisi dahil olmalı.",
    workLocationMode: "remote",
    tags: ["google ads", "reklam", "kampanya", "dönüşüm"],
    offers: 4,
    featured: true,
    image: categoryImageMap["Reklam yönetimi"],
    owner: { name: "Cenk P.", rating: 8.6, reviewCount: 9 },
    master: { name: "Reklam Noktası", rating: 9.0, reviewCount: 20 },
  },
  {
    id: 28,
    title: "Blog yazıları için metin editörü",
    category: "İçerik yazarlığı",
    city: "Adana",
    district: "Seyhan",
    workDate: addDays(4),
    budget: 5500,
    details: "Turizm blogu için 6 yazının düzenlenmesi ve başlıklarının iyileştirilmesi gerekiyor.",
    expectations: "Akıcı Türkçe, temel SEO ve kaynak kontrolü önemli.",
    workLocationMode: "remote",
    tags: ["blog", "metin", "editör", "turizm"],
    offers: 6,
    featured: false,
    image: categoryImageMap["İçerik yazarlığı"],
    owner: { name: "Fırat N.", rating: 9.2, reviewCount: 17 },
    master: { name: "Metin Odası", rating: 9.4, reviewCount: 29 },
  },
  {
    id: 29,
    title: "Restoran için dijital pazarlama planı",
    category: "Dijital pazarlama",
    city: "Muğla",
    district: "Bodrum",
    workDate: addDays(7),
    budget: 10000,
    details: "Sezon öncesi kampanya, içerik ve reklam kanalı planı hazırlanacak.",
    expectations: "Uygulanabilir takvim ve ölçüm metrikleri bekleniyor.",
    workLocationMode: "remote",
    tags: ["pazarlama", "restoran", "kampanya", "sezon"],
    offers: 5,
    featured: true,
    image: categoryImageMap["Dijital pazarlama"],
    owner: { name: "Sarp E.", rating: 9.1, reviewCount: 13 },
    master: { name: "Büyüme Ekibi", rating: 9.2, reviewCount: 23 },
  },
  {
    id: 30,
    title: "Gelinlik prova ve beden düzeltme",
    category: "Giyim dikim",
    city: "İstanbul",
    district: "Fatih",
    workDate: addDays(5),
    budget: 4500,
    details: "Gelinlik bel, kol ve etek boyunda prova sonrası düzeltme yapılacak.",
    expectations: "İnce işçilik ve zamanında teslim çok önemli.",
    tags: ["gelinlik", "dikim", "prova", "tadilat"],
    offers: 4,
    featured: true,
    image: categoryImageMap["Giyim dikim"],
    owner: { name: "Nisa A.", rating: 9.6, reviewCount: 30 },
    master: { name: "Dikiş Evi", rating: 9.5, reviewCount: 41 },
  },
  {
    id: 31,
    title: "Atölye için 50 tişört baskı hazırlığı",
    category: "Tekstil üretim",
    city: "Denizli",
    district: "Merkezefendi",
    workDate: addDays(6),
    budget: 9000,
    details: "50 adet tişört için kalıp, baskı yerleşimi ve üretim takibi gerekiyor.",
    expectations: "Ölçü tablosu ve örnek ürün onayıyla ilerlemek istiyoruz.",
    tags: ["tekstil", "tişört", "üretim", "baskı"],
    offers: 3,
    featured: false,
    image: categoryImageMap["Tekstil üretim"],
    owner: { name: "Umut K.", rating: 8.9, reviewCount: 15 },
    master: { name: "Tekstil Ustası", rating: 9.0, reviewCount: 22 },
  },
  {
    id: 32,
    title: "Kapsül koleksiyon için moda çizimi",
    category: "Moda tasarım",
    city: "İstanbul",
    district: "Nişantaşı",
    workDate: addDays(8),
    budget: 13500,
    details: "Kadın giyim kapsül koleksiyonu için 8 parça teknik çizim hazırlanacak.",
    expectations: "Renk, kumaş önerisi ve üretime uygun teknik detay bekleniyor.",
    workLocationMode: "remote",
    tags: ["moda", "koleksiyon", "teknik çizim", "kumaş"],
    offers: 4,
    featured: true,
    image: categoryImageMap["Moda tasarım"],
    owner: { name: "Lara H.", rating: 9.3, reviewCount: 18 },
    master: { name: "Moda Çizgi", rating: 9.4, reviewCount: 26 },
  },
  {
    id: 33,
    title: "Çocuk odası için özel kitaplık",
    category: "Marangoz",
    city: "İstanbul",
    district: "Maltepe",
    workDate: addDays(4),
    budget: 12500,
    details: "Duvara sabitlenecek ölçülü kitaplık ve oyuncak rafı yapılacak.",
    expectations: "Ölçü alınması, malzeme önerisi ve montaj dahil olmalı.",
    tags: ["marangoz", "kitaplık", "çocuk odası", "ölçü"],
    offers: 6,
    featured: false,
    image: categoryImageMap.Marangoz,
    owner: { name: "Pelin R.", rating: 9.0, reviewCount: 11 },
    master: { name: "Ahşap Usta", rating: 9.3, reviewCount: 37 },
  },
  {
    id: 34,
    title: "IKEA gardırop ve çalışma masası montajı",
    category: "Mobilya montaj",
    city: "Ankara",
    district: "Etimesgut",
    workDate: addDays(1),
    budget: 2800,
    details: "Bir gardırop, bir çalışma masası ve iki raf monte edilecek.",
    expectations: "Duvar sabitleme ve ambalaj toparlama dahil olsun.",
    tags: ["mobilya", "montaj", "gardırop", "masa"],
    offers: 8,
    featured: true,
    image: categoryImageMap["Mobilya montaj"],
    owner: { name: "Sinan B.", rating: 8.7, reviewCount: 10 },
    master: { name: "Montaj Ekibi", rating: 9.1, reviewCount: 33 },
  },
  {
    id: 35,
    title: "Salon klima montaj ve vakumlama",
    category: "Klima",
    city: "Antalya",
    district: "Kepez",
    workDate: addDays(0),
    budget: 3500,
    details: "Yeni alınan split klima salona monte edilip vakumlama yapılacak.",
    expectations: "Temiz işçilik ve garanti için fatura bilgisi bekleniyor.",
    tags: ["klima", "montaj", "vakum", "split"],
    offers: 7,
    featured: true,
    image: categoryImageMap.Klima,
    owner: { name: "Yasemin S.", rating: 9.2, reviewCount: 20 },
    master: { name: "Serin Teknik", rating: 9.4, reviewCount: 45 },
  },
  {
    id: 36,
    title: "Kombi yıllık bakım ve basınç kontrolü",
    category: "Kombi",
    city: "Bursa",
    district: "Nilüfer",
    workDate: addDays(2),
    budget: 1600,
    details: "Kombi bakımı, filtre temizliği ve basınç kontrolü yapılacak.",
    expectations: "Yetkin usta, kısa sürede temiz servis istiyoruz.",
    tags: ["kombi", "bakım", "filtre", "servis"],
    offers: 6,
    featured: false,
    image: categoryImageMap.Kombi,
    owner: { name: "Volkan E.", rating: 8.8, reviewCount: 12 },
    master: { name: "Isı Teknik", rating: 9.2, reviewCount: 31 },
  },
  {
    id: 37,
    title: "Bahçe çim biçme ve budama",
    category: "Bahçe",
    city: "Muğla",
    district: "Menteşe",
    workDate: addDays(3),
    budget: 3000,
    details: "Müstakil ev bahçesinde çim biçme, çit budama ve atık toplama yapılacak.",
    expectations: "Ekipman ustadan, atıklar poşetlenip bırakılmalı.",
    tags: ["bahçe", "budama", "çim", "temizlik"],
    offers: 5,
    featured: false,
    image: categoryImageMap.Bahçe,
    owner: { name: "Nalan Y.", rating: 9.1, reviewCount: 14 },
    master: { name: "Yeşil Bakım", rating: 9.0, reviewCount: 19 },
  },
  {
    id: 38,
    title: "Mutfak tezgah arası fayans yenileme",
    category: "Fayans",
    city: "İstanbul",
    district: "Ümraniye",
    workDate: addDays(6),
    budget: 7800,
    details: "Eski fayans sökülüp yeni metro fayans döşenecek.",
    expectations: "Derz, kesim ve temizlik dahil net fiyat istiyoruz.",
    tags: ["fayans", "mutfak", "derz", "tadilat"],
    offers: 4,
    featured: true,
    image: categoryImageMap.Fayans,
    owner: { name: "Eren C.", rating: 8.9, reviewCount: 16 },
    master: { name: "Seramik Usta", rating: 9.3, reviewCount: 28 },
  },
  {
    id: 39,
    title: "Banyo zemini seramik tamiri",
    category: "Seramik",
    city: "İzmir",
    district: "Karşıyaka",
    workDate: addDays(1),
    budget: 2400,
    details: "Kırılan üç seramik değişecek, çevre derzleri yenilenecek.",
    expectations: "Mevcut seramiğe yakın malzeme önerisi gerekiyor.",
    tags: ["seramik", "banyo", "tamir", "derz"],
    offers: 5,
    featured: false,
    image: categoryImageMap.Seramik,
    owner: { name: "Mina Ö.", rating: 9.0, reviewCount: 13 },
    master: { name: "Zemin Usta", rating: 9.1, reviewCount: 21 },
  },
  {
    id: 40,
    title: "Koridor laminat parke döşeme",
    category: "Parke",
    city: "Ankara",
    district: "Mamak",
    workDate: addDays(5),
    budget: 6200,
    details: "Yaklaşık 18 metrekare koridor alanına laminat parke döşenecek.",
    expectations: "Süpürgelik kesimi ve eski kaplama sökümü dahil olsun.",
    tags: ["parke", "laminat", "zemin", "süpürgelik"],
    offers: 6,
    featured: true,
    image: categoryImageMap.Parke,
    owner: { name: "Okan A.", rating: 8.6, reviewCount: 9 },
    master: { name: "Parke Pro", rating: 9.2, reviewCount: 34 },
  },
  {
    id: 41,
    title: "Stüdyo bölme duvar alçıpan işi",
    category: "Alçıpan",
    city: "İstanbul",
    district: "Kağıthane",
    workDate: addDays(7),
    budget: 11500,
    details: "Ofis içinde ses yalıtımlı küçük toplantı odası bölmesi yapılacak.",
    expectations: "Malzeme listesi, işçilik ve boya öncesi yüzey teslimi bekleniyor.",
    tags: ["alçıpan", "ofis", "bölme", "yalıtım"],
    offers: 3,
    featured: false,
    image: categoryImageMap.Alçıpan,
    owner: { name: "Defne K.", rating: 9.4, reviewCount: 22 },
    master: { name: "Tadilat Noktası", rating: 9.0, reviewCount: 25 },
  },
  {
    id: 42,
    title: "Çatı oluk temizliği ve küçük tamir",
    category: "Çatı",
    city: "Trabzon",
    district: "Ortahisar",
    workDate: addDays(4),
    budget: 4800,
    details: "Yağmur oluğu temizlenecek, iki noktada sızıntı kontrolü yapılacak.",
    expectations: "Güvenli çalışma ekipmanı ve fotoğraflı teslim istiyoruz.",
    tags: ["çatı", "oluk", "sızıntı", "tamir"],
    offers: 4,
    featured: false,
    image: categoryImageMap.Çatı,
    owner: { name: "Hüseyin L.", rating: 8.7, reviewCount: 11 },
    master: { name: "Çatı Ekibi", rating: 9.1, reviewCount: 18 },
  },
  {
    id: 43,
    title: "Bahçe kapısı kaynak tamiri",
    category: "Kaynak",
    city: "Kocaeli",
    district: "İzmit",
    workDate: addDays(0),
    budget: 1700,
    details: "Bahçe kapısının menteşesi kopmuş, kaynakla güçlendirme yapılacak.",
    expectations: "Yerinde hızlı tamir ve pas önleyici boya önerisi istiyoruz.",
    tags: ["kaynak", "kapı", "menteşe", "tamir"],
    offers: 5,
    featured: true,
    image: categoryImageMap.Kaynak,
    owner: { name: "Salih D.", rating: 8.5, reviewCount: 8 },
    master: { name: "Metal Usta", rating: 9.2, reviewCount: 27 },
  },
  {
    id: 44,
    title: "Balkon için cam kapatma ölçüsü",
    category: "Cam balkon",
    city: "İstanbul",
    district: "Beylikdüzü",
    workDate: addDays(8),
    budget: 22000,
    details: "Uzun balkon için sürgülü cam balkon sistemi ölçü ve teklif alınacak.",
    expectations: "Profil rengi, teslim süresi ve garanti net yazılsın.",
    tags: ["cam balkon", "ölçü", "sürgülü", "balkon"],
    offers: 6,
    featured: true,
    image: categoryImageMap["Cam balkon"],
    owner: { name: "Alev M.", rating: 9.1, reviewCount: 15 },
    master: { name: "Cam Sistemleri", rating: 9.3, reviewCount: 32 },
  },
  {
    id: 45,
    title: "PVC pencere kolu ve fitil değişimi",
    category: "Kapı pencere",
    city: "Ankara",
    district: "Keçiören",
    workDate: addDays(2),
    budget: 2100,
    details: "İki pencere kolu bozuk, balkon kapısında fitil değişimi gerekiyor.",
    expectations: "Malzeme dahil fiyat ve aynı gün çözüm bekleniyor.",
    tags: ["pvc", "pencere", "fitil", "kapı"],
    offers: 7,
    featured: false,
    image: categoryImageMap["Kapı pencere"],
    owner: { name: "Tuna B.", rating: 8.8, reviewCount: 12 },
    master: { name: "Pencere Servis", rating: 9.0, reviewCount: 20 },
  },
  {
    id: 46,
    title: "Dükkan için demir raf imalatı",
    category: "Demir doğrama",
    city: "İstanbul",
    district: "Bayrampaşa",
    workDate: addDays(9),
    budget: 17500,
    details: "Depo alanı için ölçülü demir raf sistemi imal edilip kurulacak.",
    expectations: "Taşıma kapasitesi, boya ve montaj dahil teklif istiyoruz.",
    tags: ["demir", "raf", "imalat", "depo"],
    offers: 4,
    featured: false,
    image: categoryImageMap["Demir doğrama"],
    owner: { name: "Levent G.", rating: 8.9, reviewCount: 14 },
    master: { name: "Demir Atölyesi", rating: 9.2, reviewCount: 30 },
  },
  {
    id: 47,
    title: "Çelik kapı kilit değişimi",
    category: "Anahtarcı",
    city: "İzmir",
    district: "Buca",
    workDate: addDays(0),
    budget: 1300,
    details: "Taşınma sonrası çelik kapı kilidi değiştirilecek.",
    expectations: "Güvenilir marka kilit ve hızlı servis gerekiyor.",
    tags: ["anahtarcı", "kilit", "çelik kapı", "acil"],
    offers: 8,
    featured: true,
    image: categoryImageMap.Anahtarcı,
    owner: { name: "Zeynep F.", rating: 9.2, reviewCount: 18 },
    master: { name: "Kilit Servisi", rating: 9.5, reviewCount: 39 },
  },
  {
    id: 48,
    title: "Bulaşık makinesi su almıyor",
    category: "Beyaz eşya",
    city: "Bursa",
    district: "Yıldırım",
    workDate: addDays(1),
    budget: 1600,
    details: "Bulaşık makinesi program başlatıyor ama su almıyor.",
    expectations: "Arıza tespiti ve mümkünse aynı gün parça değişimi istiyoruz.",
    tags: ["beyaz eşya", "bulaşık makinesi", "arıza", "servis"],
    offers: 6,
    featured: false,
    image: categoryImageMap["Beyaz eşya"],
    owner: { name: "Ceren N.", rating: 9.0, reviewCount: 13 },
    master: { name: "Eşya Teknik", rating: 9.1, reviewCount: 24 },
  },
  {
    id: 49,
    title: "Apartman kamera sistemi kontrolü",
    category: "Kamera güvenlik",
    city: "İstanbul",
    district: "Esenyurt",
    workDate: addDays(3),
    budget: 4200,
    details: "4 kameralı sistemde kayıt cihazı ve gece görüş ayarı kontrol edilecek.",
    expectations: "Kayıt süresi, mobil izleme ve kablo kontrolü dahil olsun.",
    tags: ["kamera", "güvenlik", "apartman", "kayıt"],
    offers: 5,
    featured: true,
    image: categoryImageMap["Kamera güvenlik"],
    owner: { name: "Apartman Yönetimi", rating: 8.8, reviewCount: 10 },
    master: { name: "Güvenlik Teknik", rating: 9.3, reviewCount: 28 },
  },
  {
    id: 50,
    title: "Uydu anten sinyal ayarı",
    category: "Uydu anten",
    city: "Konya",
    district: "Selçuklu",
    workDate: addDays(2),
    budget: 900,
    details: "Rüzgar sonrası bazı kanallar çekmiyor, anten sinyali ayarlanacak.",
    expectations: "Sinyal ölçerle kontrol ve kablo ucu yenileme gerekebilir.",
    tags: ["uydu", "anten", "sinyal", "kanal"],
    offers: 4,
    featured: false,
    image: categoryImageMap["Uydu anten"],
    owner: { name: "Mehmet İ.", rating: 8.6, reviewCount: 9 },
    master: { name: "Anten Usta", rating: 9.0, reviewCount: 16 },
  },
  {
    id: 51,
    title: "Mağaza tadilatı için günlük işçi",
    category: "İnşaat işçisi",
    city: "İstanbul",
    district: "Zeytinburnu",
    workDate: addDays(1),
    budget: 2500,
    details: "Hafriyat taşıma, kırılan alanı toparlama ve malzeme indirme işi var.",
    expectations: "Sabah erken başlanacak, iş güvenliğine dikkat edilmeli.",
    tags: ["inşaat", "günlük", "mağaza", "taşıma"],
    offers: 7,
    featured: true,
    image: categoryImageMap["İnşaat işçisi"],
    owner: { name: "Baran K.", rating: 8.7, reviewCount: 11 },
    master: { name: "Şantiye Destek", rating: 8.9, reviewCount: 19 },
  },
  {
    id: 52,
    title: "Haftalık ev yardımcısı arıyorum",
    category: "Gündelik yardımcı",
    city: "Ankara",
    district: "Çankaya",
    workDate: addDays(4),
    budget: 2800,
    details: "Haftada bir gün genel temizlik, ütü ve mutfak toparlama desteği gerekiyor.",
    expectations: "Düzenli çalışabilecek, referanslı yardımcı tercih edilir.",
    tags: ["yardımcı", "ev", "ütü", "temizlik"],
    offers: 6,
    featured: false,
    image: categoryImageMap["Gündelik yardımcı"],
    owner: { name: "Ebru S.", rating: 9.4, reviewCount: 26 },
    master: { name: "Ev Destek", rating: 9.2, reviewCount: 35 },
  },
  {
    id: 53,
    title: "Mutfakta haşere ilaçlama",
    category: "Haşere ilaçlama",
    city: "İstanbul",
    district: "Üsküdar",
    workDate: addDays(0),
    budget: 1500,
    details: "Mutfak dolap çevresinde haşere görüldü, güvenli ilaçlama yapılacak.",
    expectations: "Kokusuz ürün ve evcil hayvan için güvenlik bilgisi verilmeli.",
    tags: ["ilaçlama", "haşere", "mutfak", "kokusuz"],
    offers: 5,
    featured: true,
    image: categoryImageMap["Haşere ilaçlama"],
    owner: { name: "Aslı D.", rating: 9.1, reviewCount: 17 },
    master: { name: "Hijyen Servis", rating: 9.3, reviewCount: 29 },
  },
  {
    id: 54,
    title: "Koltuk ve halı yıkama",
    category: "Temizlik",
    city: "İzmir",
    district: "Gaziemir",
    workDate: addDays(2),
    budget: 2400,
    details: "L koltuk, iki tekli koltuk ve iki halı yerinde yıkanacak.",
    expectations: "Makine ve temizlik ürünleri hizmete dahil olmalı.",
    tags: ["koltuk", "halı", "yıkama", "temizlik"],
    offers: 8,
    featured: false,
    image: categoryImageMap.Temizlik,
    owner: { name: "Gökçe Y.", rating: 8.9, reviewCount: 12 },
    master: { name: "Temiz Nokta", rating: 9.1, reviewCount: 23 },
  },
  {
    id: 55,
    title: "Çocuk doğum günü fotoğraf çekimi",
    category: "Fotoğraf çekimi",
    city: "İstanbul",
    district: "Ataşehir",
    workDate: addDays(6),
    budget: 6000,
    details: "Evde yapılacak doğum günü için 2 saat fotoğraf çekimi isteniyor.",
    expectations: "Renk düzenleme ve dijital teslim dahil olsun.",
    tags: ["fotoğraf", "doğum günü", "etkinlik", "çocuk"],
    offers: 5,
    featured: true,
    image: categoryImageMap["Fotoğraf çekimi"],
    owner: { name: "Sevil M.", rating: 9.5, reviewCount: 24 },
    master: { name: "Anı Fotoğraf", rating: 9.4, reviewCount: 36 },
  },
  {
    id: 56,
    title: "Düğün için gelin saçı ve makyaj",
    category: "Kuaför",
    city: "Bursa",
    district: "Mudanya",
    workDate: addDays(10),
    budget: 9000,
    details: "Düğün günü gelin saçı, makyaj ve kısa prova hizmeti gerekiyor.",
    expectations: "Evde hizmet ve zaman planına uyum önemli.",
    tags: ["kuaför", "gelin", "makyaj", "düğün"],
    offers: 6,
    featured: true,
    image: categoryImageMap.Kuaför,
    owner: { name: "İrem B.", rating: 9.6, reviewCount: 31 },
    master: { name: "Güzellik Ekibi", rating: 9.5, reviewCount: 44 },
  },
  {
    id: 57,
    title: "5 yaş doğum günü için atıştırmalık menü",
    category: "Catering",
    city: "Ankara",
    district: "Gölbaşı",
    workDate: addDays(7),
    budget: 8500,
    details: "20 çocuk ve 15 yetişkin için mini sandviç, tatlı ve içecek menüsü hazırlanacak.",
    expectations: "Alerjen bilgisi ve servis önerisi paylaşılmalı.",
    tags: ["catering", "çocuk", "menü", "parti"],
    offers: 4,
    featured: false,
    image: categoryImageMap.Catering,
    owner: { name: "Pınar A.", rating: 9.0, reviewCount: 14 },
    master: { name: "Mini Lezzet", rating: 9.2, reviewCount: 21 },
  },
  {
    id: 58,
    title: "Online İngilizce konuşma dersi",
    category: "Özel ders",
    city: "İstanbul",
    district: "Sarıyer",
    workDate: addDays(3),
    budget: 3200,
    details: "B1 seviyesinde yetişkin için haftada iki gün konuşma pratiği isteniyor.",
    expectations: "Dersler online, konu listesi ve kısa geri bildirim olsun.",
    workLocationMode: "remote",
    tags: ["ingilizce", "online", "konuşma", "özel ders"],
    offers: 9,
    featured: true,
    image: categoryImageMap["Özel ders"],
    owner: { name: "Alper C.", rating: 8.8, reviewCount: 10 },
    master: { name: "Dil Koçu", rating: 9.6, reviewCount: 48 },
  },
  {
    id: 59,
    title: "Kira kontratı için basit web formu",
    category: "Web sitesi",
    city: "İstanbul",
    district: "Kadıköy",
    workDate: addDays(4),
    budget: 7000,
    details: "Emlak ofisi için müşteri bilgisi toplayan güvenli bir web formu yapılacak.",
    expectations: "Form çıktısı e-posta ile gelsin, mobilde düzgün çalışsın.",
    workLocationMode: "remote",
    tags: ["web", "form", "emlak", "mobil"],
    offers: 5,
    featured: false,
    image: categoryImageMap["Web sitesi"],
    owner: { name: "Emlak Ofisi", rating: 8.9, reviewCount: 13 },
    master: { name: "Form Yazılım", rating: 9.1, reviewCount: 20 },
  },
  {
    id: 60,
    title: "Spor salonu üyelik uygulaması arayüzü",
    category: "UI/UX tasarım",
    city: "İzmir",
    district: "Alsancak",
    workDate: addDays(8),
    budget: 14500,
    details: "Üyelik, ders rezervasyonu ve ödeme ekranları için modern arayüz tasarlanacak.",
    expectations: "Figma prototype ve component düzeni teslim edilmeli.",
    workLocationMode: "remote",
    tags: ["ui", "ux", "spor", "figma"],
    offers: 4,
    featured: true,
    image: categoryImageMap["UI/UX tasarım"],
    owner: { name: "Fit Studio", rating: 9.2, reviewCount: 19 },
    master: { name: "Deneyim Studio", rating: 9.5, reviewCount: 34 },
  },
  {
    id: 61,
    title: "Takı markası reels çekim planı",
    category: "Sosyal medya",
    city: "İstanbul",
    district: "Moda",
    workDate: addDays(2),
    budget: 5000,
    details: "Takı markası için 10 reels fikri, çekim akışı ve metinleri hazırlanacak.",
    expectations: "Trend uyumlu, uygulanabilir ve ürün odaklı fikirler bekleniyor.",
    workLocationMode: "remote",
    tags: ["reels", "takı", "instagram", "içerik"],
    offers: 7,
    featured: false,
    image: categoryImageMap["Sosyal medya"],
    owner: { name: "Maya Takı", rating: 9.3, reviewCount: 22 },
    master: { name: "Reels Plan", rating: 9.0, reviewCount: 18 },
  },
  {
    id: 62,
    title: "Perde paça kısaltma ve pile düzeni",
    category: "Terzi",
    city: "İstanbul",
    district: "Bostancı",
    workDate: addDays(1),
    budget: 1800,
    details: "Salon perdelerinin paçası kısaltılacak, pile aralıkları düzenlenecek.",
    expectations: "Ölçü alınıp temiz dikişle teslim edilmeli.",
    tags: ["perde", "terzi", "dikiş", "ölçü"],
    offers: 4,
    featured: false,
    image: categoryImageMap.Terzi,
    owner: { name: "Sibel K.", rating: 8.8, reviewCount: 11 },
    master: { name: "Perde Terzi", rating: 9.1, reviewCount: 19 },
  },
  {
    id: 63,
    title: "Küçük ofis taşınması",
    category: "Taşıma",
    city: "İstanbul",
    district: "Levent",
    workDate: addDays(5),
    budget: 6500,
    details: "6 masa, 8 sandalye, bilgisayar kutuları ve arşiv dolapları taşınacak.",
    expectations: "Paketleme desteği ve taşıma sigortası bilgisi istiyoruz.",
    tags: ["taşıma", "ofis", "paketleme", "sigorta"],
    offers: 6,
    featured: true,
    image: categoryImageMap.Taşıma,
    owner: { name: "Nova Ofis", rating: 9.0, reviewCount: 15 },
    master: { name: "Ofis Nakliye", rating: 9.2, reviewCount: 32 },
  },
  {
    id: 64,
    title: "Duvar kağıdı sökme ve boya hazırlığı",
    category: "Boya",
    city: "İstanbul",
    district: "Kartal",
    workDate: addDays(2),
    budget: 3900,
    details: "Yatak odasında eski duvar kağıdı sökülüp boya öncesi yüzey hazırlanacak.",
    expectations: "Zemin korunmalı, atıklar toparlanmalı.",
    tags: ["boya", "duvar kağıdı", "hazırlık", "oda"],
    offers: 5,
    featured: false,
    image: categoryImageMap.Boya,
    owner: { name: "Murat P.", rating: 8.7, reviewCount: 10 },
    master: { name: "Boya Ustası", rating: 9.0, reviewCount: 23 },
  },
  {
    id: 65,
    title: "Mutfak musluğu ve sifon değişimi",
    category: "Tesisat",
    city: "İzmir",
    district: "Balçova",
    workDate: addDays(0),
    budget: 1500,
    details: "Yeni musluk takılacak, lavabo altı sifon da değiştirilecek.",
    expectations: "Malzeme elimizde, sadece işçilik ve kontrol gerekiyor.",
    tags: ["tesisat", "musluk", "sifon", "mutfak"],
    offers: 8,
    featured: true,
    image: categoryImageMap.Tesisat,
    owner: { name: "Gül A.", rating: 9.1, reviewCount: 17 },
    master: { name: "Su Tesisat", rating: 9.3, reviewCount: 36 },
  },
  {
    id: 66,
    title: "Ofis aydınlatma armatür değişimi",
    category: "Elektrik",
    city: "Ankara",
    district: "Sincan",
    workDate: addDays(3),
    budget: 3200,
    details: "Açık ofiste 6 adet LED armatür değiştirilecek, anahtar kontrolü yapılacak.",
    expectations: "Elektrik güvenliği ve temiz montaj öncelikli.",
    tags: ["elektrik", "armatür", "led", "ofis"],
    offers: 5,
    featured: false,
    image: categoryImageMap.Elektrik,
    owner: { name: "Atlas Büro", rating: 8.9, reviewCount: 12 },
    master: { name: "Elektrik Pro", rating: 9.2, reviewCount: 27 },
  },
];

const additionalDefaultListingSeeds = [
  { listingRole: "master", title: "Drone ile arsa ve mekan çekimi yapıyorum", category: "Fotoğraf çekimi", city: "İstanbul", district: "Sarıyer", budget: 5500, details: "Arsa, villa ve işletmeler için 4K drone çekimi ve kısa tanıtım videosu hazırlıyorum.", workLocationMode: "onsite", tags: ["drone", "video", "emlak", "4k"] },
  { listingRole: "master", title: "Evcil hayvan gezdirme ve mama takibi", category: "Diğer", city: "İstanbul", district: "Kadıköy", budget: 900, details: "Kedi ve köpekler için günlük gezdirme, mama-su kontrolü ve kısa durum bildirimi yapıyorum.", imageCategory: "Bahçe", tags: ["evcil hayvan", "köpek", "kedi", "gezdirme"] },
  { listingRole: "master", title: "Gündüz yaşlı refakat hizmeti veriyorum", category: "Gündelik yardımcı", city: "Ankara", district: "Çankaya", budget: 2400, details: "Gündüz saatlerinde ilaç hatırlatma, yemek hazırlığı ve temel refakat desteği sağlıyorum.", tags: ["refakat", "yaşlı bakım", "gündüz", "destek"] },
  { listingRole: "master", title: "Hafta sonu çocuk bakıcılığı desteği", category: "Gündelik yardımcı", city: "İzmir", district: "Karşıyaka", budget: 1800, details: "Hafta sonu birkaç saatlik çocuk bakımı, oyun ve günlük rutin desteği veriyorum.", tags: ["çocuk bakımı", "hafta sonu", "oyun", "bakıcı"] },
  { listingRole: "employer", title: "Oto detaylı iç temizlik yaptırılacak", category: "Temizlik", city: "Bursa", district: "Nilüfer", budget: 2200, details: "Binek araç için koltuk, tavan, bagaj ve torpido detaylı temizlik hizmeti aranıyor.", tags: ["oto", "detaylı temizlik", "koltuk", "araç"] },
  { listingRole: "master", title: "İkinci el araç ön kontrol hizmeti", category: "Diğer", city: "İstanbul", district: "Ümraniye", budget: 3000, details: "Araç almadan önce kaporta, boya, lastik ve genel durum kontrolü yapıyorum.", imageCategory: "Elektrik", tags: ["oto kontrol", "ekspertiz", "araç", "ikinci el"] },
  { listingRole: "master", title: "Düğün günü organizasyon koordinatörü", category: "Catering", city: "Antalya", district: "Muratpaşa", budget: 9000, details: "Düğün günü akış takibi, ekip koordinasyonu ve misafir yönlendirme hizmeti veriyorum.", tags: ["düğün", "organizasyon", "koordinasyon", "etkinlik"] },
  { listingRole: "master", title: "Ses sistemi ve mikrofon kurulumu", category: "Montaj", city: "İstanbul", district: "Şişli", budget: 6500, details: "Toplantı, seminer ve küçük etkinlikler için ses sistemi kurulumu ve teknik destek sağlıyorum.", tags: ["ses sistemi", "mikrofon", "etkinlik", "kurulum"] },
  { listingRole: "master", title: "Çocuk partileri için animatör hizmeti", category: "Diğer", city: "Ankara", district: "Gölbaşı", budget: 4500, details: "Doğum günü ve okul etkinlikleri için oyun, yarışma ve yüz boyama programı yapıyorum.", imageCategory: "Catering", tags: ["animatör", "çocuk", "parti", "oyun"] },
  { listingRole: "master", title: "Online pilates ve esneme dersi", category: "Özel ders", city: "İstanbul", district: "Beşiktaş", budget: 2600, details: "Başlangıç seviyesi için online pilates, esneme ve duruş çalışması yaptırıyorum.", workLocationMode: "remote", tags: ["pilates", "online", "spor", "esneme"] },
  { listingRole: "master", title: "Online beslenme takip danışmanlığı", category: "Özel ders", city: "İzmir", district: "Konak", budget: 4200, details: "Haftalık öğün planı, alışveriş listesi ve takip görüşmesi hazırlıyorum.", workLocationMode: "remote", tags: ["beslenme", "danışmanlık", "online", "takip"] },
  { listingRole: "employer", title: "Restoran menüsü İngilizceye çevrilecek", category: "İçerik yazarlığı", city: "Muğla", district: "Bodrum", budget: 2500, details: "Türkçe restoran menüsünün İngilizceye doğal ve anlaşılır şekilde çevrilmesi gerekiyor.", workLocationMode: "remote", tags: ["çeviri", "menü", "ingilizce", "restoran"] },
  { listingRole: "master", title: "CV ve LinkedIn profil düzenleme", category: "İçerik yazarlığı", city: "Ankara", district: "Yenimahalle", budget: 1800, details: "CV, ön yazı ve LinkedIn özet alanlarını başvuruya uygun hale getiriyorum.", workLocationMode: "remote", tags: ["cv", "linkedin", "kariyer", "metin"] },
  { listingRole: "master", title: "Küçük işletme muhasebe evrak düzeni", category: "Diğer", city: "İstanbul", district: "Fatih", budget: 5000, details: "Fatura, gider evrakı ve aylık klasör düzeni için ön muhasebe desteği veriyorum.", imageCategory: "Backend API", tags: ["muhasebe", "evrak", "işletme", "fatura"] },
  { listingRole: "employer", title: "Kira sözleşmesi için dilekçe taslağı", category: "İçerik yazarlığı", city: "İstanbul", district: "Bakırköy", budget: 2000, details: "Kira süreciyle ilgili resmi dilekçe taslağı ve düzenli metin hazırlığı gerekiyor.", workLocationMode: "remote", tags: ["dilekçe", "metin", "kira", "taslak"] },
  { listingRole: "master", title: "Başlangıç seviyesi keman dersi", category: "Özel ders", city: "Eskişehir", district: "Tepebaşı", budget: 3200, details: "Çocuk ve yetişkinler için temel nota, duruş ve parça çalışması yaptırıyorum.", tags: ["keman", "müzik", "özel ders", "nota"] },
  { listingRole: "master", title: "Reklam ve video için seslendirme", category: "Video kurgu", city: "İstanbul", district: "Beyoğlu", budget: 3500, details: "Tanıtım filmi, sosyal medya videosu ve IVR metinleri için seslendirme yapıyorum.", workLocationMode: "remote", tags: ["seslendirme", "reklam", "video", "stüdyo"] },
  { listingRole: "master", title: "Podcast kurgu ve ses temizleme", category: "Video kurgu", city: "İzmir", district: "Bornova", budget: 4800, details: "Podcast bölümlerinde nefes, gürültü ve boşluk temizliğiyle yayın formatı hazırlıyorum.", workLocationMode: "remote", tags: ["podcast", "kurgu", "ses", "edit"] },
  { listingRole: "master", title: "3D ürün modelleme ve render", category: "Grafik tasarım", city: "İstanbul", district: "Kağıthane", budget: 12000, details: "Mobilya, ambalaj ve küçük ürünler için 3D modelleme ve render görseli hazırlıyorum.", workLocationMode: "remote", tags: ["3d", "render", "ürün", "modelleme"] },
  { listingRole: "employer", title: "Kafe iç mimari render görseli", category: "UI/UX tasarım", city: "Ankara", district: "Çankaya", budget: 15000, details: "Yeni açılacak kafe için oturma düzeni ve iç mekan render görselleri gerekiyor.", workLocationMode: "remote", tags: ["render", "kafe", "iç mekan", "tasarım"] },
  { listingRole: "employer", title: "Arsa sınır krokisi için ölçüm desteği", category: "Diğer", city: "Balıkesir", district: "Edremit", budget: 8500, details: "Arsa çevresi için temel ölçüm, işaretleme ve kroki desteği alınacak.", imageCategory: "İnşaat işçisi", tags: ["arsa", "ölçüm", "kroki", "işaretleme"] },
  { listingRole: "employer", title: "Gece çelik kapı kilidi değişecek", category: "Anahtarcı", city: "İstanbul", district: "Esenler", budget: 1800, details: "Taşınma sonrası gece saatinde çelik kapı göbek kilidi değişimi gerekiyor.", tags: ["anahtarcı", "kilit", "gece", "kapı"] },
  { listingRole: "master", title: "Havuz bakım ve kimyasal denge kontrolü", category: "Tesisat", city: "Antalya", district: "Konyaaltı", budget: 3800, details: "Site ve villa havuzları için filtre, seviye ve kimyasal denge kontrolü yapıyorum.", tags: ["havuz", "bakım", "filtre", "villa"] },
  { listingRole: "master", title: "Kişiye özel fitness programı", category: "Özel ders", city: "İstanbul", district: "Ataşehir", budget: 3600, details: "Hedefe göre haftalık antrenman planı, hareket anlatımı ve takip desteği veriyorum.", workLocationMode: "remote", tags: ["fitness", "program", "online", "antrenman"] },
  { listingRole: "master", title: "Evde protez tırnak ve bakım", category: "Kuaför", city: "İzmir", district: "Alsancak", budget: 1900, details: "Evde protez tırnak, kalıcı oje ve basit el bakım hizmeti veriyorum.", tags: ["tırnak", "bakım", "kalıcı oje", "güzellik"] },
  { listingRole: "master", title: "Kaş laminasyon ve kirpik lifting", category: "Kuaför", city: "Bursa", district: "Nilüfer", budget: 1700, details: "Randevulu şekilde kaş laminasyon, kirpik lifting ve bakım uygulaması yapıyorum.", tags: ["kaş", "kirpik", "laminasyon", "güzellik"] },
  { listingRole: "master", title: "Çanta fermuar ve astar tamiri", category: "Terzi", city: "İstanbul", district: "Kadıköy", budget: 1200, details: "Deri ve kumaş çantalarda fermuar, astar ve dikiş tamiri yapıyorum.", tags: ["çanta", "tamir", "fermuar", "dikiş"] },
  { listingRole: "master", title: "Ayakkabı taban ve boya yenileme", category: "Terzi", city: "Ankara", district: "Kızılay", budget: 1400, details: "Ayakkabı taban, topuk, boya ve küçük dikiş yenileme hizmeti veriyorum.", tags: ["ayakkabı", "tamir", "boya", "taban"] },
  { listingRole: "master", title: "Saat pil değişimi ve kordon ayarı", category: "Diğer", city: "İstanbul", district: "Üsküdar", budget: 700, details: "Kol saati pil değişimi, kordon kısaltma ve basit temizlik işlemleri yapıyorum.", imageCategory: "Elektrik", tags: ["saat", "pil", "kordon", "tamir"] },
  { listingRole: "master", title: "Telefon ekran koruyucu ve küçük tamir", category: "Elektrik", city: "İzmir", district: "Buca", budget: 900, details: "Telefon ekran koruyucu, şarj soketi temizliği ve küçük aksesuar montajı yapıyorum.", tags: ["telefon", "ekran", "aksesuar", "tamir"] },
  { listingRole: "master", title: "Laptop bakım ve termal macun değişimi", category: "Elektrik", city: "İstanbul", district: "Maltepe", budget: 1600, details: "Laptop fan temizliği, termal macun değişimi ve genel performans kontrolü yapıyorum.", tags: ["laptop", "bakım", "termal macun", "fan"] },
  { listingRole: "master", title: "Harici disk veri kurtarma ön kontrolü", category: "Backend API", city: "Ankara", district: "Etimesgut", budget: 3500, details: "Harici disk ve USB belleklerde ilk seviye veri kurtarma analizi yapıyorum.", tags: ["veri kurtarma", "disk", "usb", "teknik"] },
  { listingRole: "employer", title: "Küçük ofis network kurulumu", category: "Kamera güvenlik", city: "İstanbul", district: "Maslak", budget: 9500, details: "8 kişilik ofis için modem, access point ve kablolama düzeni kurulacak.", tags: ["network", "ofis", "modem", "kablolama"] },
  { listingRole: "master", title: "POS cihazı kurulum ve eğitim desteği", category: "Elektrik", city: "Antalya", district: "Lara", budget: 2200, details: "Kafe ve mağazalar için POS cihazı kurulum, fiş testi ve kısa kullanım eğitimi veriyorum.", tags: ["pos", "mağaza", "kurulum", "eğitim"] },
  { listingRole: "employer", title: "E-ticaret kargo paketleme elemanı", category: "Gündelik yardımcı", city: "İstanbul", district: "Bağcılar", budget: 2600, details: "Bir günlük ürün paketleme, etiket basma ve kargo poşeti hazırlama desteği aranıyor.", tags: ["paketleme", "kargo", "e-ticaret", "günlük"] },
  { listingRole: "employer", title: "Depo sayımı için iki kişilik ekip", category: "Gündelik yardımcı", city: "Kocaeli", district: "Gebze", budget: 5000, details: "Depoda raf sayımı, barkod kontrolü ve Excel listeye işleme desteği gerekiyor.", tags: ["depo", "sayım", "barkod", "ekip"] },
  { listingRole: "employer", title: "Kozmetik ürün etiketleme işi", category: "Gündelik yardımcı", city: "İstanbul", district: "Başakşehir", budget: 3200, details: "Kozmetik kutularına barkod ve içerik etiketi yapıştırma işi için destek aranıyor.", tags: ["etiketleme", "kozmetik", "barkod", "paket"] },
  { listingRole: "employer", title: "Fuar standı için karşılama personeli", category: "Diğer", city: "İzmir", district: "Gaziemir", budget: 6000, details: "Fuar alanında ziyaretçi karşılama, broşür verme ve yönlendirme desteği gerekiyor.", imageCategory: "Dijital pazarlama", tags: ["fuar", "stand", "karşılama", "personel"] },
  { listingRole: "employer", title: "Mahalle tanıtımı için broşür dağıtımı", category: "Dijital pazarlama", city: "Ankara", district: "Mamak", budget: 2200, details: "Yeni açılan işletme için belirlenen sokaklarda broşür dağıtımı yapılacak.", tags: ["broşür", "tanıtım", "saha", "dağıtım"] },
  { listingRole: "employer", title: "Dükkan tabelası montajı", category: "Montaj", city: "İstanbul", district: "Pendik", budget: 4800, details: "Hazır pleksi tabela dükkan girişine monte edilecek, elektrik bağlantısı kontrol edilecek.", tags: ["tabela", "montaj", "dükkan", "pleksi"] },
  { listingRole: "employer", title: "Reklam filmi için figüran aranıyor", category: "Fotoğraf çekimi", city: "İstanbul", district: "Beyoğlu", budget: 3000, details: "Kısa sosyal medya reklamı çekimi için yarım günlük figüran desteği aranıyor.", tags: ["figüran", "çekim", "reklam", "video"] },
  { listingRole: "employer", title: "Fuar standı görsel tasarımı", category: "Grafik tasarım", city: "İstanbul", district: "Tuzla", budget: 11000, details: "3x3 fuar standı için pano, masa giydirme ve yönlendirme görselleri hazırlanacak.", workLocationMode: "remote", tags: ["fuar", "stand", "grafik", "pano"] },
  { listingRole: "employer", title: "Çocuk odasına duvar resmi yapılacak", category: "Boya", city: "Bursa", district: "Mudanya", budget: 7000, details: "Çocuk odasında bir duvara sade orman temalı mural çizimi ve boya uygulaması yapılacak.", tags: ["mural", "duvar resmi", "çocuk odası", "boya"] },
  { listingRole: "master", title: "Akvaryum temizlik ve su değişimi", category: "Diğer", city: "İstanbul", district: "Bakırköy", budget: 1300, details: "Ev akvaryumlarında cam temizliği, filtre kontrolü ve su değişimi yapıyorum.", imageCategory: "Temizlik", tags: ["akvaryum", "temizlik", "filtre", "bakım"] },
  { listingRole: "master", title: "Ofis bitkileri bakım ve saksı değişimi", category: "Bahçe", city: "İstanbul", district: "Levent", budget: 2500, details: "Ofis bitkileri için budama, toprak yenileme, saksı değişimi ve bakım planı hazırlıyorum.", tags: ["bitki", "ofis", "saksı", "bakım"] },
  { listingRole: "master", title: "Haftalık ev yemeği hazırlığı", category: "Catering", city: "Ankara", district: "Çankaya", budget: 4200, details: "Haftalık ev yemeği, çorba ve salata hazırlığı yapıp porsiyonlu teslim ediyorum.", tags: ["ev yemeği", "haftalık", "catering", "porsiyon"] },
  { listingRole: "master", title: "Sosyal medya canlı yayın moderatörü", category: "Sosyal medya", city: "İstanbul", district: "Kadıköy", budget: 3800, details: "Canlı yayınlarda yorum takibi, soru seçimi ve yayın sonrası kısa rapor hazırlıyorum.", workLocationMode: "remote", tags: ["canlı yayın", "moderasyon", "sosyal medya", "rapor"] },
  { listingRole: "employer", title: "Online toplantı notları yazıya dökülecek", category: "İçerik yazarlığı", city: "İstanbul", district: "Üsküdar", budget: 2800, details: "Yaklaşık iki saatlik toplantı kaydı temiz başlıklarla yazıya dönüştürülecek.", workLocationMode: "remote", tags: ["transkript", "toplantı", "not", "metin"] },
  { listingRole: "master", title: "Airbnb daire karşılama ve anahtar teslimi", category: "Gündelik yardımcı", city: "İstanbul", district: "Galata", budget: 1600, details: "Kısa dönem kiralık dairelerde misafir karşılama, anahtar teslimi ve kısa kontrol yapıyorum.", tags: ["airbnb", "karşılama", "anahtar", "misafir"] },
  { listingRole: "master", title: "Koleksiyon plak ve kitap kataloglama", category: "Diğer", city: "İzmir", district: "Karşıyaka", budget: 3000, details: "Plak, kitap ve arşiv ürünlerini kategori, kondisyon ve raf koduyla listeleyip düzenliyorum.", imageCategory: "İçerik yazarlığı", tags: ["arşiv", "kitap", "plak", "katalog"] },
];

const additionalOwnerNames = [
  "Rota Ajans", "Lina A.", "Atlas Yaşam", "Mina K.", "Oto Garaj", "Vizyon Araç", "Düğün Evi",
  "Ses Atölyesi", "Minik Parti", "Duru Studio", "Form Beslenme", "Marina Restoran", "Kariyer Masası",
  "Defter Ofis", "Vergi Düzeni", "Kaya Apartmanı", "Ezgi Müzik", "Ses Kabini", "PodLab", "Render Noktası",
];
const additionalMasterNames = [
  "Drone Studio", "Pati Dostu", "Refakat Destek", "Oyun Ablası", "Detay Oto", "Araç Kontrol",
  "Etkinlik Koçu", "Teknik Ses", "Parti Ekibi", "Pilates Koçu", "Beslenme Plan", "Çeviri Masası",
  "CV Atölyesi", "Ön Muhasebe", "Evrak Destek", "Metin Ofisi", "Keman Dersi", "Seslendirme Pro",
  "Podcast Edit", "3D Studio",
];

defaultListings.push(
  ...additionalDefaultListingSeeds.map((listing, index) => {
    const workDate = addDays(listing.day ?? index % 11);
    const ownerName = listing.ownerName || additionalOwnerNames[index % additionalOwnerNames.length];
    const masterName = listing.masterName || additionalMasterNames[index % additionalMasterNames.length];

    return {
      id: 67 + index,
      title: listing.title,
      category: listing.category,
      categoryGroup: getCategoryGroupTitle(listing.category),
      customCategoryTitle: professionCategories.includes(listing.category) ? "" : listing.category,
      listingRole: listing.listingRole || "employer",
      city: listing.city,
      district: listing.district,
      workDate,
      time: getTimeLabel(workDate),
      budget: listing.budget,
      details: listing.details,
      expectations: listing.expectations || "Detaylar teklif veren kişiyle mesaj veya telefon üzerinden netleştirilecek.",
      workLocationMode: listing.workLocationMode || "onsite",
      tags: listing.tags || [],
      offers: listing.offers ?? ((index * 2) % 9) + 1,
      featured: index % 8 === 0,
      image: listing.image || categoryImageMap[listing.imageCategory || listing.category] || categoryImageMap.Diğer,
      owner: { name: ownerName, rating: 8.6 + ((index % 9) / 10), reviewCount: 8 + (index % 28) },
      master: { name: masterName, rating: 8.8 + ((index % 8) / 10), reviewCount: 12 + (index % 34) },
    };
  }),
);

function getAllListings() {
  const listingMap = new Map();
  [...defaultListings, ...getStoredListings(), ...remoteListings.filter(isAfterDataReset)].forEach((listing) => {
    const workDate = listing.workDate || "";
    const category = listing.category || getOtherCategoryValue();
    const categoryGroup = listing.categoryGroup || getCategoryGroupTitle(category);
    const workLocationMode = listing.workLocationMode || "onsite";
    const timeLabel = workDate ? getTimeLabel(workDate) : listing.time || "Esnek";
    const tags = getListingTags(listing);

    listingMap.set(String(listing.id), {
      ...listing,
      category,
      categoryCode: getCategoryCode(category),
      categoryGroup,
      workDate,
      time: timeLabel,
      budget: Number(listing.budget || 0),
      offers: Number(listing.offers || 0),
      workLocationMode,
      city: listing.city || "",
      district: listing.district || "",
      tags,
      filterText: [
        listing.title,
        category,
        getCategoryCode(category),
        categoryGroup,
        listing.city,
        listing.district,
        workLocationMode === "remote" ? "uzaktan remote online" : "yakından yerinde adres",
        listing.addressNote,
        listing.details,
        listing.expectations,
        ...tags,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR"),
    });
  });
  return [...listingMap.values()];
}

function getPublicListings(listings = getAllListings()) {
  return listings.filter(isApprovedListing);
}

function notifySharedListingListeners() {
  const allListings = getAllListings();
  sharedListingListeners.forEach((listener) => listener(allListings));
}

function subscribeSharedListings(listener) {
  sharedListingListeners.add(listener);
  listener(getAllListings());
  return () => sharedListingListeners.delete(listener);
}

function isListingOwnedByCurrentUser(listing) {
  return isListingOwnedByUser(listing, getCurrentUser());
}

function canViewListingDetail(listing, user = getCurrentUser()) {
  return isApprovedListing(listing) || isListingOwnedByUser(listing, user) || isAdminUser(user);
}

function isListingAssignedToUser(listing, user = getCurrentUser()) {
  if (!isAssignedListing(listing)) return false;

  const aliases = new Set(getAccountAliases(user));
  return [
    listing.assignedMasterEmail,
    listing.assignedMasterKey,
    listing.assignedMasterUid,
    listing.assignedMaster?.email,
    listing.assignedMaster?.key,
    listing.assignedMaster?.uid,
    listing.master?.email,
    listing.master?.key,
    listing.master?.uid,
    listing.master?.name,
  ]
    .map(normalizeAccountValue)
    .filter(Boolean)
    .some((key) => aliases.has(key));
}

function isListingAssignedToCurrentUser(listing) {
  return isListingAssignedToUser(listing, getCurrentUser());
}

function getMyListings() {
  return getAllListings().filter(isListingOwnedByCurrentUser);
}

function startSharedListingsFeed() {
  if (sharedListingsUnsubscribe) return;

  const applySnapshot = (snapshot) => {
    remoteListings = snapshot.docs.map(normalizeRemoteListing).filter(isAfterDataReset);
    notifySharedListingListeners();
  };

  const startFallbackFeed = () => {
    if (sharedListingsUnsubscribe) {
      sharedListingsUnsubscribe();
    }

    sharedListingsUnsubscribe = onSnapshot(
      collection(db, "listings"),
      applySnapshot,
      (error) => {
        console.warn("Ortak ilan akışı dinlenemedi:", error);
      },
    );
  };

  sharedListingsUnsubscribe = onSnapshot(
    query(collection(db, "listings"), orderBy("createdAt", "desc")),
    applySnapshot,
    (error) => {
      console.warn("Sıralı ilan akışı kullanılamadı, basit akışa geçiliyor:", error);
      startFallbackFeed();
    },
  );

  getDocs(collection(db, "listings"))
    .then((snapshot) => {
      if (!snapshot.empty) {
        applySnapshot(snapshot);
      }
    })
    .catch((error) => {
      console.warn("Ortak ilanlar ilk yüklemede okunamadı:", error);
    });
}

ensureFirestoreAuth()
  .catch((error) => {
    console.warn("Firebase oturumu açılamadı:", error);
  })
  .finally(() => {
    startSharedListingsFeed();
    restartSharedFeeds();
  });

function normalizeRemoteListing(snapshot) {
  const data = snapshot.data();
  const owner = data.owner || { name: "İş veren", rating: 10, reviewCount: 0 };

  return {
    ...data,
    id: snapshot.id,
    ownerKey: normalizeAccountValue(data.ownerEmail || owner.email || data.ownerKey || owner.key || data.ownerUid || ""),
    ownerUid: data.ownerUid || "",
    ownerEmail: normalizeAccountValue(data.ownerEmail || owner.email || ""),
    status: data.status || (data.assignedOfferId ? "assigned" : "active"),
    moderationStatus: data.moderationStatus || "approved",
    moderationReason: data.moderationReason || "",
    moderatedAt: data.moderatedAt || "",
    moderatedBy: data.moderatedBy || "",
    assignedOfferId: data.assignedOfferId || "",
    assignedMaster: data.assignedMaster || data.master || null,
    completedAt: data.completedAt || "",
    highlighted: Boolean(data.highlighted),
    highlightColor: sanitizeHighlightColor(data.highlightColor),
    carouselPriority: Number(data.carouselPriority || 0),
    carouselPriorityLabel: data.carouselPriorityLabel || "",
    promotionSource: data.promotionSource || data.promotionPlan || "",
    budget: Number(data.budget || 0),
    offers: Number(data.offers || 0),
    featured: data.featured !== false,
    owner,
    master: data.master || { name: "Atanmadı", rating: 0, reviewCount: 0 },
    categoryGroup: data.categoryGroup || getCategoryGroupTitle(data.category),
    customCategoryTitle: data.customCategoryTitle || "",
    tags: getListingTags(data),
  };
}

async function getRemoteListing(listingId) {
  try {
    const snapshot = await withTimeout(getDoc(doc(db, "listings", listingId)), 8000);
    if (!snapshot.exists()) return null;
    const listing = normalizeRemoteListing(snapshot);
    return isAfterDataReset(listing) ? listing : null;
  } catch (error) {
    console.warn("Firestore ilanı okunamadı:", error);
    return null;
  }
}

function readImageAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file || !file.size) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => resolve(""));
    reader.readAsDataURL(file);
  });
}

async function compressImageAsDataUrl(file, maxWidth = 1280, quality = 0.82, maxBytes = IMAGE_UPLOAD_MAX_BYTES) {
  if (!file || !file.size) return "";

  const originalDataUrl = await readImageAsDataUrl(file);
  if (!originalDataUrl.startsWith("data:image/")) {
    return originalDataUrl;
  }

  if (getDataUrlByteSize(originalDataUrl) <= maxBytes) {
    return originalDataUrl;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        resolve(originalDataUrl);
        return;
      }

      let targetWidth = Math.min(maxWidth, image.width || maxWidth);
      let targetQuality = quality;
      let compressedDataUrl = originalDataUrl;

      for (let attempt = 0; attempt < 14; attempt += 1) {
        const scale = Math.min(1, targetWidth / image.width);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        compressedDataUrl = canvas.toDataURL(IMAGE_UPLOAD_MIME_TYPE, targetQuality);

        if (getDataUrlByteSize(compressedDataUrl) <= maxBytes) {
          resolve(compressedDataUrl);
          return;
        }

        if (targetQuality > 0.46) {
          targetQuality = Math.max(0.46, targetQuality - 0.09);
        } else {
          targetWidth = Math.max(420, Math.floor(targetWidth * 0.82));
          targetQuality = 0.72;
        }
      }

      resolve(compressedDataUrl);
    });
    image.addEventListener("error", () => resolve(originalDataUrl));
    image.src = originalDataUrl;
  });
}

function getStorageOwnerPath(user = getCurrentUser(), authUser = auth.currentUser) {
  return getFirestoreSafeId(authUser?.uid || user?.uid || getAccountKey(user) || getAccountEmail(user) || "guest");
}

async function uploadImageDataUrlToStorage(dataUrl, storagePath) {
  if (!isDataImageUrl(dataUrl)) return getShareableImageValue(dataUrl);

  const storageRef = ref(storage, storagePath);
  await ensureFirestoreAuth();
  await withTimeout(
    uploadString(storageRef, dataUrl, "data_url", {
      contentType: IMAGE_UPLOAD_MIME_TYPE,
      customMetadata: { source: "ustabi-web" },
    }),
    25000,
  );
  return withTimeout(getDownloadURL(storageRef), 10000);
}

async function uploadListingImage(dataUrl, user, listingId) {
  if (!isDataImageUrl(dataUrl)) return getShareableImageValue(dataUrl);

  const authUser = await ensureFirestoreAuth();
  const ownerPath = getStorageOwnerPath(user, authUser);
  const listingPath = getFirestoreSafeId(listingId || Date.now());
  return uploadImageDataUrlToStorage(dataUrl, `listings/${ownerPath}/${listingPath}/cover.jpg`);
}

async function uploadProfilePhoto(dataUrl, user) {
  if (!isDataImageUrl(dataUrl)) return getShareableImageValue(dataUrl);

  const authUser = await ensureFirestoreAuth();
  const ownerPath = getStorageOwnerPath(user, authUser);
  return uploadImageDataUrlToStorage(dataUrl, `users/${ownerPath}/profile.jpg`);
}

async function uploadPortfolioPhotos(dataUrls, user) {
  const authUser = await ensureFirestoreAuth();
  const ownerPath = getStorageOwnerPath(user, authUser);
  const timestamp = Date.now();
  const uploads = dataUrls.map((dataUrl, index) => {
    if (!isDataImageUrl(dataUrl)) return Promise.resolve(getShareableImageValue(dataUrl));
    return uploadImageDataUrlToStorage(dataUrl, `users/${ownerPath}/portfolio/${timestamp}-${index}.jpg`);
  });

  return (await Promise.all(uploads)).filter(Boolean);
}

function getStoredListings() {
  try {
    return (JSON.parse(localStorage.getItem("ustaListings")) || []).filter(isAfterDataReset);
  } catch {
    return [];
  }
}

const workDateDay = document.querySelector("#workDateDay");
const workDateMonth = document.querySelector("#workDateMonth");
const workDateYear = document.querySelector("#workDateYear");

if (workDateInput && workDateDay && workDateMonth && workDateYear) {
  const workDateMonthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  function parseWorkDateParts(value) {
    const [year, month, day] = value.split("-").map(Number);
    return { year, month, day };
  }

  function composeWorkDate(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getWorkDateBounds() {
    return {
      min: parseWorkDateParts(todayValue()),
      max: parseWorkDateParts(getWorkDateMaxValue()),
      year: getWorkDateYear(),
    };
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function syncWorkDateInput() {
    const { year } = getWorkDateBounds();
    workDateInput.value = composeWorkDate(year, Number(workDateMonth.value), Number(workDateDay.value));
  }

  function populateWorkDateMonths() {
    const { min, max, year } = getWorkDateBounds();
    workDateYear.value = String(year);
    workDateMonth.innerHTML = "";

    for (let month = min.month; month <= max.month; month += 1) {
      const option = document.createElement("option");
      option.value = String(month);
      option.textContent = workDateMonthNames[month - 1];
      workDateMonth.appendChild(option);
    }
  }

  function populateWorkDateDays() {
    const { min, max, year } = getWorkDateBounds();
    const month = Number(workDateMonth.value);
    const startDay = month === min.month ? min.day : 1;
    const endDay = month === max.month ? max.day : getDaysInMonth(year, month);

    workDateDay.innerHTML = "";
    for (let day = startDay; day <= endDay; day += 1) {
      const option = document.createElement("option");
      option.value = String(day);
      option.textContent = String(day);
      workDateDay.appendChild(option);
    }

    if (Number(workDateDay.value) < startDay) {
      workDateDay.value = String(startDay);
    } else if (Number(workDateDay.value) > endDay) {
      workDateDay.value = String(endDay);
    }
  }

  function initWorkDatePicker() {
    populateWorkDateMonths();
    workDateMonth.value = String(getWorkDateBounds().min.month);
    populateWorkDateDays();
    workDateDay.value = String(getWorkDateBounds().min.day);
    syncWorkDateInput();
  }

  workDateMonth.addEventListener("change", () => {
    populateWorkDateDays();
    syncWorkDateInput();
  });

  workDateDay.addEventListener("change", syncWorkDateInput);
  initWorkDatePicker();
}

if (listingImageInput && listingImagePreview) {
  listingImageInput.addEventListener("change", () => {
    const file = listingImageInput.files?.[0];
    const previewImage = listingImagePreview.querySelector("img");

    if (!file) {
      listingImagePreview.hidden = true;
      previewImage.removeAttribute("src");
      return;
    }

    previewImage.src = URL.createObjectURL(file);
    listingImagePreview.hidden = false;
  });
}

if (citySelect && districtSelect && window.TURKEY_LOCATIONS) {
  window.TURKEY_LOCATIONS.forEach((city) => {
    citySelect.add(new Option(city.name, city.name));
  });

  citySelect.addEventListener("change", () => {
    const city = window.TURKEY_LOCATIONS.find((item) => item.name === citySelect.value);
    districtSelect.innerHTML = "";

    if (!city) {
      districtSelect.add(new Option("Önce il seç", ""));
      districtSelect.disabled = true;
      return;
    }

    districtSelect.add(new Option("İlçe seç", ""));
    city.districts.forEach((district) => {
      districtSelect.add(new Option(district.name, district.name));
    });
    districtSelect.disabled = false;
  });
}

function populateLocationSelects(cityEl, districtEl, selectedCity = "", selectedDistrict = "") {
  if (!cityEl || !districtEl || !window.TURKEY_LOCATIONS) return;

  cityEl.innerHTML = `<option value="">Seç</option>`;
  window.TURKEY_LOCATIONS.forEach((city) => {
    cityEl.add(new Option(city.name, city.name));
  });

  function syncDistricts() {
    const city = window.TURKEY_LOCATIONS.find((item) => item.name === cityEl.value);
    districtEl.innerHTML = "";

    if (!city) {
      districtEl.add(new Option("Önce il seç", ""));
      districtEl.disabled = true;
      return;
    }

    districtEl.add(new Option("İlçe seç", ""));
    city.districts.forEach((district) => {
      districtEl.add(new Option(district.name, district.name));
    });
    districtEl.disabled = false;
    districtEl.value = selectedDistrict;
  }

  cityEl.value = selectedCity;
  syncDistricts();
  cityEl.addEventListener("change", () => {
    selectedDistrict = "";
    syncDistricts();
  });
}

[
  ["#masterCitySelect", "#masterDistrictSelect"],
  ["#employerCitySelect", "#employerDistrictSelect"],
].forEach(([citySelector, districtSelector]) => {
  populateLocationSelects(
    document.querySelector(citySelector),
    document.querySelector(districtSelector),
  );
});

if (profileEditForm) {
  const user = getUser();
  const role = user.role || new URLSearchParams(window.location.search).get("role") || "master";

  if (role !== "master") {
    document.querySelectorAll(".master-only").forEach((element) => {
      element.hidden = true;
    });
  }

  setAvatarElement(profilePhotoPreview, user);
  populateLocationSelects(profileCitySelect, profileDistrictSelect, user.city, user.district);

  for (const [key, value] of Object.entries(user)) {
    const field = profileEditForm.elements[key];
    if (!field || field.type === "file") continue;

    if (typeof field.value === "undefined") continue;
    field.value = Array.isArray(value) ? "" : value;
  }

  ["services", "trust"].forEach((name) => {
    const values = Array.isArray(user[name]) ? user[name] : [];
    profileEditForm.querySelectorAll(`input[name="${name}"]`).forEach((checkbox) => {
      checkbox.checked = values.includes(checkbox.value);
    });
  });

  if (Array.isArray(user.portfolioPhotos) && portfolioPreview) {
    portfolioPreview.innerHTML = user.portfolioPhotos
      .map((src) => `<img src="${src}" alt="İş fotoğrafı" />`)
      .join("");
  }

  profilePhotoInput?.addEventListener("change", async () => {
    const image = await compressImageAsDataUrl(profilePhotoInput.files?.[0], 720);
    if (image) {
      profilePhotoPreview.innerHTML = `<img src="${image}" alt="Profil fotoğrafı önizleme" />`;
    }
  });

  portfolioPhotosInput?.addEventListener("change", async () => {
    const files = Array.from(portfolioPhotosInput.files || []).slice(0, 6);
    const images = await Promise.all(files.map((file) => compressImageAsDataUrl(file)));
    portfolioPreview.innerHTML = images
      .filter(Boolean)
      .map((src) => `<img src="${src}" alt="İş fotoğrafı önizleme" />`)
      .join("");
  });

  profileEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(profileEditForm);
    const existingUser = getUser();
    const profilePhotoDataUrl = await compressImageAsDataUrl(formData.get("profilePhoto"), 720);
    const portfolioFiles = Array.from(portfolioPhotosInput?.files || []).slice(0, 6);
    const portfolioPhotoDataUrls = portfolioFiles.length
      ? (await Promise.all(portfolioFiles.map((file) => compressImageAsDataUrl(file)))).filter(Boolean)
      : [];
    let profilePhoto = existingUser.profilePhoto || "";
    let portfolioPhotos = existingUser.portfolioPhotos || [];

    try {
      if (profilePhotoDataUrl) {
        profilePhoto = await uploadProfilePhoto(profilePhotoDataUrl, existingUser);
      }
      if (portfolioPhotoDataUrls.length) {
        portfolioPhotos = await uploadPortfolioPhotos(portfolioPhotoDataUrls, existingUser);
      }
    } catch (error) {
      console.warn("Profil fotoÄŸraflarÄ± Storage'a yÃ¼klenemedi:", error);
      showToast("FotoÄŸraflar CDN'e yÃ¼klenemedi, mevcut fotoÄŸraflar korunuyor.");
    }

    const profilePhone = formData.get("phone");
    const securityState = getSecurityState();
    const keepsVerifiedPhone =
      normalizePhoneToE164(profilePhone) &&
      normalizePhoneToE164(profilePhone) === normalizePhoneToE164(securityState.phone);
    const updatedUser = {
      ...existingUser,
      role,
      fullName: formData.get("fullName"),
      phone: profilePhone,
      phoneVerified: keepsVerifiedPhone ? securityState.phoneVerified || false : false,
      email: formData.get("email"),
      title: formData.get("title"),
      profession: formData.get("profession"),
      experience: formData.get("experience"),
      city: formData.get("city"),
      district: formData.get("district"),
      dailyRate: formData.get("dailyRate"),
      availability: formData.get("availability"),
      bio: formData.get("bio"),
      services: formData.getAll("services"),
      trust: formData.getAll("trust"),
      contactPreference: formData.get("contactPreference"),
      profilePhoto,
      portfolioPhotos,
    };

    localStorage.setItem("ustaUser", JSON.stringify(updatedUser));
    try {
      const authUser = await ensureFirestoreAuth();
      await withTimeout(
        setDoc(
          doc(db, "users", authUser.uid),
          {
            ...sanitizeFirestoreData(updatedUser),
            uid: authUser.uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
        8000,
      );
    } catch (error) {
      console.warn("Profil Firestore'a yazılamadı:", error);
    }
    showToast("Profil kaydedildi. Panele yönlendiriliyorsun.");
    window.setTimeout(() => {
      window.location.href = "pazar.html";
    }, 700);
  });
}

if (securityForm) {
  const user = getUser();
  let security = getSecurityState();

  securityForm.elements.phone.value = security.phone || user.phone || "";
  securityForm.elements.email.value = security.email || user.email || "";

  function renderVerificationCards() {
    verificationGrid.querySelectorAll("[data-verification]").forEach((card) => {
      const key = card.dataset.verification;
      const verified = Boolean(security[`${key}Verified`]);
      const button = card.querySelector("button");
      card.classList.toggle("verified", verified);
      button.textContent = verified ? "Doğrulandı" : key === "phone" ? "Kod gönder" : "Doğrula";
      button.disabled = verified;
    });
  }

  function setPhoneCodeControls(enabled) {
    if (phoneCodeInput) phoneCodeInput.disabled = !enabled;
    if (confirmPhoneCodeButton) confirmPhoneCodeButton.disabled = !enabled;
  }

  async function startPhoneVerification(button = sendPhoneCodeButton) {
    const normalizedPhone = normalizePhoneToE164(securityPhoneInput?.value || securityForm.elements.phone.value);
    if (!normalizedPhone) {
      showToast("Telefon numarasını 05xx xxx xx xx formatında yaz.");
      return;
    }

    try {
      if (button) {
        button.disabled = true;
        button.textContent = "Kod gönderiliyor...";
      }
      const sentPhone = await sendPhoneVerificationCode(normalizedPhone);
      securityForm.elements.phone.value = sentPhone;
      setPhoneCodeControls(true);
      phoneCodeInput?.focus();
      showToast("SMS kodu gönderildi.");
    } catch (error) {
      showToast(getFirebaseAuthMessage(error));
    } finally {
      security = getSecurityState();
      renderVerificationCards();
      if (button && !security.phoneVerified) {
        button.disabled = false;
        button.textContent = button === sendPhoneCodeButton ? "SMS kodu gönder" : "Kod gönder";
      }
    }
  }

  renderVerificationCards();
  setPhoneCodeControls(false);

  securityPhoneInput?.addEventListener("input", () => {
    const changedPhone =
      normalizePhoneToE164(securityPhoneInput.value) !== normalizePhoneToE164(security.phone);
    if (changedPhone && security.phoneVerified) {
      security = { ...security, phoneVerified: false };
      setPhoneCodeControls(false);
      renderVerificationCards();
    }
  });

  verificationGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-verify]");
    if (!button) return;

    const key = button.dataset.verify;
    if (key === "phone") {
      await startPhoneVerification(button);
      return;
    }

    security[`${key}Verified`] = true;
    saveSecurityState(security);
    renderVerificationCards();
    showToast("Doğrulama durumu güncellendi.");
  });

  sendPhoneCodeButton?.addEventListener("click", () => startPhoneVerification(sendPhoneCodeButton));

  confirmPhoneCodeButton?.addEventListener("click", async () => {
    try {
      confirmPhoneCodeButton.disabled = true;
      confirmPhoneCodeButton.textContent = "Doğrulanıyor...";
      security = await confirmPhoneVerificationCode(phoneCodeInput?.value, securityForm.elements.phone.value);
      setPhoneCodeControls(false);
      renderVerificationCards();
      showToast("Telefon numarası doğrulandı.");
    } catch (error) {
      confirmPhoneCodeButton.disabled = false;
      showToast(getFirebaseAuthMessage(error));
    } finally {
      confirmPhoneCodeButton.textContent = "Telefonu doğrula";
    }
  });

  identityFileInput?.addEventListener("change", () => {
    const file = identityFileInput.files?.[0];
    identityPreview.hidden = !file;
    if (file) {
      identityPreview.innerHTML = `<span>${file.name}</span>`;
    }
  });

  securityForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(securityForm);
    const password = formData.get("newPassword");
    const confirm = formData.get("newPasswordConfirm");

    if (password && password !== confirm) {
      showToast("Yeni şifreler aynı olmalı.");
      return;
    }

    const currentSecurity = getSecurityState();
    const nextPhone = formData.get("phone");
    const sameVerifiedPhone =
      normalizePhoneToE164(nextPhone) &&
      normalizePhoneToE164(nextPhone) === normalizePhoneToE164(currentSecurity.phone);
    const nextSecurity = {
      ...currentSecurity,
      phone: nextPhone,
      email: formData.get("email"),
      phoneVerified: sameVerifiedPhone ? currentSecurity.phoneVerified || false : false,
      emailVerified: currentSecurity.emailVerified || false,
      identityVerified: currentSecurity.identityVerified || false,
      securityPrefs: formData.getAll("securityPrefs"),
      passwordUpdatedAt: password ? new Date().toISOString() : currentSecurity.passwordUpdatedAt || "",
    };

    saveSecurityState(nextSecurity);

    localStorage.setItem(
      "ustaUser",
      JSON.stringify({
        ...getUser(),
        phone: nextSecurity.phone,
        email: nextSecurity.email,
        phoneVerified: nextSecurity.phoneVerified,
      }),
    );

    showToast("Güvenlik bilgileri kaydedildi. Panele yönlendiriliyorsun.");
    window.setTimeout(() => {
      window.location.href = "pazar.html";
    }, 700);
  });
}

if (notificationForm) {
  const settings = getNotificationSettings();

  ["channels", "topics"].forEach((name) => {
    const defaultValues = name === "channels" ? ["Uygulama içi", "E-posta"] : [];
    const values = Array.isArray(settings[name]) ? settings[name] : defaultValues;
    notificationForm.querySelectorAll(`input[name="${name}"]`).forEach((checkbox) => {
      checkbox.checked = values.includes(checkbox.value);
    });
  });

  if (settings.frequency) notificationForm.elements.frequency.value = settings.frequency;
  if (settings.quietHours) notificationForm.elements.quietHours.value = settings.quietHours;

  notificationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(notificationForm);
    localStorage.setItem(
      "ustaNotifications",
      JSON.stringify({
        channels: formData.getAll("channels"),
        topics: formData.getAll("topics"),
        emailEnabled: formData.getAll("channels").includes("E-posta"),
        frequency: formData.get("frequency"),
        quietHours: formData.get("quietHours"),
      }),
    );
    showToast("Bildirim ayarları kaydedildi. Panele yönlendiriliyorsun.");
    window.setTimeout(() => {
      window.location.href = "pazar.html";
    }, 700);
  });
}

if (notificationHistoryList) {
  function renderNotificationHistoryPage() {
    const user = getCurrentUser();
    const accountKey = getAccountKey(user);
    const readIds = getReadNotificationIdsForAccount(user);
    let historyItems = getStoredNotificationsForAccount(user).filter((item) =>
      shouldKeepNotificationForAccount(item, accountKey, user),
    );

    historyItems = mergeOfferNotifications(historyItems, accountKey, user);
    historyItems = mergeRemoteNotifications(historyItems, accountKey, user)
      .filter((item) => item.read || readIds.has(String(item.id)))
      .sort((left, right) => new Date(right.time) - new Date(left.time));

    notificationHistoryList.innerHTML = historyItems.length
      ? historyItems
          .map(
            (item) => `
              <li>
                <a class="notification-item" href="${item.href || "pazar.html"}">
                  <span class="notification-type-mark">${getNotificationTypeMark(item.type)}</span>
                  <span class="notification-copy">
                    <strong>${item.title}</strong>
                    <p>${item.body}</p>
                  </span>
                  <time datetime="${item.time}">${formatNotificationTime(item.time)}</time>
                </a>
              </li>
            `,
          )
          .join("")
      : `<li class="notification-empty">Okunmuş bildirim yok.</li>`;
  }

  renderNotificationHistoryPage();
  subscribeNotificationFeed(renderNotificationHistoryPage);
}

if (adminModerationList) {
  const adminFocusListingId = new URLSearchParams(window.location.search).get("listing");

  function renderAdminModerationPanel(listings = getAllListings()) {
    const user = getCurrentUser();
    if (!isAdminUser(user)) {
      if (adminModerationSummary) adminModerationSummary.textContent = "Yetkisiz hesap";
      adminModerationList.innerHTML = `
        <article class="admin-moderation-item">
          <h3>Bu panel sadece admin hesabına açık.</h3>
          <p>Admin panelini kullanmak için ${ADMIN_EMAIL} hesabıyla giriş yap.</p>
          <div class="admin-moderation-actions">
            <a class="primary-action" href="giris.html">Giriş yap</a>
          </div>
        </article>
      `;
      return;
    }

    const moderatedListings = [...listings].sort((left, right) => {
      const pendingScore = Number(isPendingModerationListing(right)) - Number(isPendingModerationListing(left));
      return pendingScore || getRecordTimestamp(right) - getRecordTimestamp(left);
    });
    const pendingCount = moderatedListings.filter(isPendingModerationListing).length;
    if (adminModerationSummary) {
      adminModerationSummary.textContent = `${pendingCount} bekleyen ilan · ${moderatedListings.length} toplam`;
    }

    adminModerationList.innerHTML = moderatedListings.length
      ? moderatedListings
          .map((listing) => {
            const status = getModerationStatus(listing);
            return `
              <article class="admin-moderation-item ${String(listing.id) === String(adminFocusListingId) ? "focused-admin-listing" : ""}" data-admin-listing="${listing.id}">
                <div class="admin-moderation-head">
                  <div>
                    <span class="badge ${status === "pending" ? "hot" : ""}">${getListingStatusLabel(listing)}</span>
                    <h3>${listing.title}</h3>
                  </div>
                  <strong class="budget">${Number(listing.budget || 0).toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                    maximumFractionDigits: 0,
                  })}</strong>
                </div>
                <p>${listing.details || "Detay yazılmadı."}</p>
                <div class="job-meta">
                  <span class="badge">${listing.category || "Kategori yok"}</span>
                  ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
                  ${listing.district ? `<span class="badge">${listing.district}</span>` : ""}
                  <span class="badge">${listing.workLocationMode === "remote" ? "Uzaktan" : "Yakından"}</span>
                  <span class="badge">${listing.owner?.name || "İlan sahibi"}</span>
                  ${listing.ownerEmail ? `<span class="badge">${listing.ownerEmail}</span>` : ""}
                </div>
                ${listing.moderationReason ? `<p><strong>Ret sebebi:</strong> ${listing.moderationReason}</p>` : ""}
                <div class="admin-moderation-actions">
                  <button class="primary-action" type="button" data-approve-listing="${listing.id}" ${status === "approved" ? "disabled" : ""}>Onayla</button>
                  <button class="ghost-action" type="button" data-reject-listing="${listing.id}" ${status === "rejected" ? "disabled" : ""}>Reddet</button>
                  <button class="danger-action" type="button" data-delete-listing="${listing.id}">Sil</button>
                </div>
              </article>
            `;
          })
          .join("")
      : `<article class="admin-moderation-item"><h3>İlan yok</h3></article>`;

    if (adminFocusListingId) {
      adminModerationList.querySelector(`[data-admin-listing="${CSS.escape(String(adminFocusListingId))}"]`)?.scrollIntoView({
        block: "center",
      });
    }
  }

  async function notifyListingModeration(listing, moderationStatus, reason = "") {
    await publishOwnerNotification(
      buildListingModerationNotification(listing, moderationStatus, reason),
      listing,
    );
  }

  async function updateListingModeration(listing, moderationStatus, reason = "") {
    const patch = {
      moderationStatus,
      moderationReason: reason,
      moderatedAt: new Date().toISOString(),
      moderatedBy: ADMIN_EMAIL,
      updatedAt: Date.now(),
    };

    applyListingModerationLocally(listing.id, patch);
    await publishListingModerationToFirestore(listing.id, patch);
    await notifyListingModeration({ ...listing, ...patch }, moderationStatus, reason);
  }

  adminModerationList.addEventListener("click", async (event) => {
    const approveButton = event.target.closest("[data-approve-listing]");
    const rejectButton = event.target.closest("[data-reject-listing]");
    const deleteButton = event.target.closest("[data-delete-listing]");
    const targetButton = approveButton || rejectButton || deleteButton;
    if (!targetButton) return;

    if (!isAdminUser(getCurrentUser())) {
      showToast("Bu işlem için admin hesabıyla giriş yapmalısın.");
      return;
    }

    const listingId =
      approveButton?.dataset.approveListing ||
      rejectButton?.dataset.rejectListing ||
      deleteButton?.dataset.deleteListing;
    const listing = getAllListings().find((item) => String(item.id) === String(listingId));
    if (!listing) {
      showToast("İlan bulunamadı.");
      return;
    }

    const previousText = targetButton.textContent;
    targetButton.disabled = true;

    try {
      if (approveButton) {
        targetButton.textContent = "Onaylanıyor...";
        await updateListingModeration(listing, "approved");
        showToast("İlan onaylandı ve sahibine bildirim gönderildi.");
      } else if (rejectButton) {
        const reason = window.prompt("Ret sebebi yaz", "İlan detayları eksik veya uygun değil.") || "";
        targetButton.textContent = "Reddediliyor...";
        await updateListingModeration(listing, "rejected", reason.trim());
        showToast("İlan reddedildi ve sahibine bildirim gönderildi.");
      } else if (deleteButton) {
        const confirmed = window.confirm("Bu ilanı kalıcı olarak silmek istiyor musun?");
        if (!confirmed) return;
        targetButton.textContent = "Siliniyor...";
        await notifyListingModeration(listing, "rejected", "İlan admin tarafından silindi.");
        await deleteListingFromFirestore(listing.id);
        removeListingLocally(listing.id);
        showToast("İlan silindi.");
      }
    } catch (error) {
      console.warn("Admin ilan işlemi tamamlanamadı:", error);
      showToast(`İşlem tamamlanamadı. ${getFirestoreErrorMessage(error)}`);
    } finally {
      targetButton.disabled = false;
      targetButton.textContent = previousText;
      renderAdminModerationPanel(getAllListings());
    }
  });

  renderAdminModerationPanel();
  subscribeSharedListings(renderAdminModerationPanel);
}

function renderCreditTopupPage() {
  if (!creditTopupGrid) return;
  if (!CREDIT_TOPUP_ENABLED) {
    showToast("Kredi yükleme şimdilik kapalı.");
    window.setTimeout(() => {
      window.location.href = "pazar.html";
    }, 500);
    return;
  }

  const balance = getCreditBalance();
  if (creditBalanceText) {
    creditBalanceText.textContent = `Bakiyen: ${formatCredits(balance)}`;
  }

  creditTopupGrid.innerHTML = `
    <div class="plan-usage">
      <div>
        <strong>Renkli ilan ${formatCredits(promotionCreditCosts.colored)}</strong>
        <span>Öne çıkan vitrin ${formatCredits(promotionCreditCosts.featured)}</span>
      </div>
    </div>
    ${creditPackages
      .map(
        (pack) => `
          <article class="plan-card credit-card ${pack.id === "growth" ? "active" : ""}">
            <div>
              <span class="plan-price">${pack.price} TL · ${pack.badge}</span>
              <h3>${pack.title}</h3>
            </div>
            <dl class="plan-limits">
              <div><dt>Kredi</dt><dd>${formatCredits(pack.credits)}</dd></div>
              <div><dt>Kullanım</dt><dd>Reklam</dd></div>
            </dl>
            <ul class="plan-features">
              ${pack.features.map((feature) => `<li>${feature}</li>`).join("")}
            </ul>
            <button class="primary-action" type="button" data-credit-pack="${pack.id}">Bu paketi yükle</button>
          </article>
        `,
      )
      .join("")}
  `;
}

if (creditTopupGrid) {
  renderCreditTopupPage();
  creditTopupGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-credit-pack]");
    if (!button) return;

    const pack = creditPackages.find((item) => item.id === button.dataset.creditPack);
    if (!pack) return;

    addCredits(pack.credits);
    renderCreditTopupPage();
    showToast(`${formatCredits(pack.credits)} kredi yüklendi.`);
  });
}

if (paymentForm) {
  const settings = getPaymentSettings();

  ["paymentMethods", "approvalPrefs"].forEach((name) => {
    const values = Array.isArray(settings[name]) ? settings[name] : [];
    paymentForm.querySelectorAll(`input[name="${name}"]`).forEach((checkbox) => {
      checkbox.checked = values.includes(checkbox.value);
    });
  });

  if (settings.budgetLimit) paymentForm.elements.budgetLimit.value = settings.budgetLimit;
  if (settings.paymentTiming) paymentForm.elements.paymentTiming.value = settings.paymentTiming;

  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(paymentForm);
    localStorage.setItem(
      "ustaPaymentSettings",
      JSON.stringify({
        paymentMethods: formData.getAll("paymentMethods"),
        approvalPrefs: formData.getAll("approvalPrefs"),
        budgetLimit: formData.get("budgetLimit"),
        paymentTiming: formData.get("paymentTiming"),
      }),
    );
    showToast("Ödeme ve güvence tercihleri kaydedildi. Panele yönlendiriliyorsun.");
    window.setTimeout(() => {
      window.location.href = "pazar.html";
    }, 700);
  });
}

if (listingCreateForm) {
  const categorySelect = listingCreateForm.elements.category;
  const listingTitleInput = listingCreateForm.elements.title;
  const listingFormParams = new URLSearchParams(window.location.search);
  const editListingId = listingFormParams.get("edit");
  let editListing = null;
  let editFormHydrated = false;
  const workLocationModeInputs = [...listingCreateForm.querySelectorAll('input[name="workLocationMode"]')];

  if (listingTitleInput) {
    listingTitleInput.maxLength = listingTitleMaxLength;
  }

  function filterListingCategories() {
    if (!categorySelect) return;
    const searchTerm = categorySearchInput?.value || "";
    populateCategorySelect(categorySelect, {
      firstValue: "",
      firstText: "Seç",
      searchTerm,
      includeOtherFallback: true,
    });
    const otherCategory = getOtherCategoryValue();
    const customCategoryTitle = String(searchTerm).trim();
    const isFallbackOnly = [...categorySelect.options].every(
      (option) => !option.value || option.value === otherCategory,
    );
    if (customCategoryTitle && isFallbackOnly) {
      categorySelect.value = otherCategory;
      if (customCategoryInput) customCategoryInput.value = customCategoryTitle;
    }
    syncCustomCategoryField();
  }

  function syncCustomCategoryField() {
    const isOtherCategory = categorySelect?.value === "Diğer";
    customCategoryField?.classList.toggle("visible", isOtherCategory);
    if (customCategoryInput) {
      customCategoryInput.required = Boolean(isOtherCategory);
      if (!isOtherCategory) customCategoryInput.value = "";
    }
  }

  function getSelectedWorkLocationMode() {
    return listingCreateForm.querySelector('input[name="workLocationMode"]:checked')?.value || "onsite";
  }

  function syncAddressNoteField() {
    const remote = getSelectedWorkLocationMode() === "remote";
    const addressNoteInput = listingCreateForm.elements.addressNote;
    if (addressNoteField) {
      addressNoteField.hidden = remote;
      addressNoteField.classList.toggle("is-hidden", remote);
    }
    if (addressNoteInput) {
      addressNoteInput.disabled = remote;
      addressNoteInput.required = !remote;
      if (remote) addressNoteInput.value = "";
    }
    if (locationPickerCard) {
      locationPickerCard.hidden = remote;
      locationPickerCard.classList.toggle("is-hidden", remote);
    }
    if (citySelect && districtSelect) {
      citySelect.required = !remote;
      districtSelect.required = !remote;
      citySelect.disabled = remote;
      if (remote) {
        citySelect.value = "";
        districtSelect.innerHTML = "";
        districtSelect.add(new Option("Uzaktan çalışma", ""));
        districtSelect.disabled = true;
        districtSelect.value = "";
      } else {
        citySelect.disabled = false;
        const hasCity = Boolean(citySelect.value);
        districtSelect.disabled = !hasCity;
        if (!hasCity) {
          districtSelect.innerHTML = "";
          districtSelect.add(new Option("Önce il seç", ""));
        }
      }
    }
  }

  function setListingWorkDateValue(value) {
    if (!value || !workDateDay || !workDateMonth || !workDateYear || !workDateInput) return;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;

    workDateMonth.value = String(date.getMonth() + 1);
    workDateMonth.dispatchEvent(new Event("change"));
    workDateDay.value = String(date.getDate());
    workDateDay.dispatchEvent(new Event("change"));
    workDateYear.value = String(date.getFullYear());
    workDateInput.value = value;
  }

  function setListingLocationValue(city = "", district = "") {
    if (!citySelect || !districtSelect) return;
    citySelect.value = city;
    citySelect.dispatchEvent(new Event("change"));
    districtSelect.value = district;
  }

  function hydrateListingEditForm(listing) {
    if (!listing || editFormHydrated) return;
    if (!isListingOwnedByUser(listing)) {
      showToast("Bu ilanı sadece ilan sahibi güncelleyebilir.");
      window.setTimeout(() => {
        window.location.href = "ilanlarim.html";
      }, 800);
      return;
    }

    if (isAssignedListing(listing) || isCompletedListing(listing)) {
      showToast("Atanmış veya tamamlanmış ilanlar güncellenemez.");
      window.setTimeout(() => {
        window.location.href = "ilanlarim.html";
      }, 800);
      return;
    }

    editListing = listing;
    editFormHydrated = true;
    listingCreateForm.dataset.mode = "edit";

    const pageTitle = document.querySelector("#post-listing-title");
    const formTitle = document.querySelector("#listing-form-title");
    const submitButton = listingCreateForm.querySelector('button[type="submit"]');
    if (pageTitle) pageTitle.textContent = "İlanını güncelle.";
    if (formTitle) formTitle.textContent = "İlanı güncelle";
    if (submitButton) submitButton.textContent = "İlanı güncelle";
    listingCreateForm.querySelector(".listing-promotion-fieldset")?.setAttribute("hidden", "");

    listingCreateForm.elements.title.value = listing.title || "";
    const listingRole = listing.listingRole || listing.role || listing.ownerRole || "employer";
    const listingRoleInput = listingCreateForm.querySelector(`input[name="listingRole"][value="${listingRole}"]`);
    if (listingRoleInput) listingRoleInput.checked = true;
    if ([...categorySelect.options].some((option) => option.value === listing.category)) {
      categorySelect.value = listing.category;
    } else {
      categorySelect.value = "Diğer";
      customCategoryInput.value = listing.customCategoryTitle || listing.category || "";
    }
    syncCustomCategoryField();

    setListingLocationValue(listing.city || "", listing.district || "");
    setListingWorkDateValue(listing.workDate || "");
    const workLocationMode = listing.workLocationMode || (listing.addressNote ? "onsite" : "remote");
    const workLocationInput = listingCreateForm.querySelector(
      `input[name="workLocationMode"][value="${workLocationMode}"]`,
    );
    if (workLocationInput) {
      workLocationInput.checked = true;
      syncAddressNoteField();
    }

    [
      "duration",
      "budget",
      "materials",
      "phone",
      "addressNote",
      "expectations",
      "details",
    ].forEach((name) => {
      if (listingCreateForm.elements[name]) {
        listingCreateForm.elements[name].value = listing[name] || "";
      }
    });
    if (listingCreateForm.elements.tags) {
      listingCreateForm.elements.tags.value = getListingTags(listing).join(", ");
    }
    if (highlightColorInput && listing.highlightColor) {
      highlightColorInput.value = sanitizeHighlightColor(listing.highlightColor);
    }

    const previewImage = listingImagePreview?.querySelector("img");
    if (previewImage && listing.image) {
      previewImage.src = getListingImage(listing);
      listingImagePreview.hidden = false;
    }
  }

  function initListingEditMode() {
    if (!editListingId) return;
    const listing = getAllListings().find((item) => String(item.id) === String(editListingId));
    if (listing) hydrateListingEditForm(listing);
  }

  function updateHighlightColorPicker() {
    if (!highlightColorInput) return;

    const canPickColor = Boolean(
      useColorPromotionInput && !useColorPromotionInput.disabled && useColorPromotionInput.checked,
    );
    highlightColorInput.disabled = !canPickColor;
    colorPromotionCard?.style.setProperty(
      "--selected-promotion-color",
      sanitizeHighlightColor(highlightColorInput.value),
    );
  }

  function renderListingPromotionRights() {
    const balance = getCreditBalance();
    const hasFeaturedRight = balance >= promotionCreditCosts.featured;
    const hasColoredRight = balance >= promotionCreditCosts.colored;

    if (featuredPromotionMeta) {
      featuredPromotionMeta.textContent = `${formatCredits(promotionCreditCosts.featured)} · Bakiyen ${formatCredits(balance)}`;
    }
    if (colorPromotionMeta) {
      colorPromotionMeta.textContent = `${formatCredits(promotionCreditCosts.colored)} · Bakiyen ${formatCredits(balance)}`;
    }

    if (useFeaturedPromotionInput) {
      useFeaturedPromotionInput.disabled = !hasFeaturedRight;
      useFeaturedPromotionInput.checked = false;
    }
    if (useColorPromotionInput) {
      useColorPromotionInput.disabled = !hasColoredRight;
      useColorPromotionInput.checked = false;
    }

    featuredPromotionCard?.classList.toggle("disabled", !hasFeaturedRight);
    colorPromotionCard?.classList.toggle("disabled", !hasColoredRight);
    updateHighlightColorPicker();
  }

  renderListingPromotionRights();
  subscribeSharedListings(renderListingPromotionRights);

  useColorPromotionInput?.addEventListener("change", updateHighlightColorPicker);
  highlightColorInput?.addEventListener("input", updateHighlightColorPicker);
  categorySearchInput?.addEventListener("input", filterListingCategories);
  categorySelect?.addEventListener("change", syncCustomCategoryField);
  workLocationModeInputs.forEach((input) => input.addEventListener("change", syncAddressNoteField));
  syncCustomCategoryField();
  syncAddressNoteField();
  initListingEditMode();
  subscribeSharedListings(() => {
    if (!editListingId || editFormHydrated) return;
    initListingEditMode();
  });

  listingCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(listingCreateForm);
    const submitButton = listingCreateForm.querySelector('button[type="submit"]');
    const imageDataUrl = await compressImageAsDataUrl(formData.get("image"));
    const workDate = formData.get("workDate");
    const listings = getStoredListings();
    let currentUser = {};

    try {
      currentUser = JSON.parse(localStorage.getItem("ustaUser") || "{}");
    } catch {
      currentUser = {};
    }

    if (!isRegisteredUser(currentUser)) {
      showToast("İlan açmak için önce ücretsiz hesap aç veya giriş yap.");
      window.setTimeout(() => {
        window.location.href = "kayit.html";
      }, 700);
      return;
    }

    if (!isAllowedWorkDate(workDate)) {
      showToast("İlan tarihi bugünden eski, bu yılın dışında veya 2 aydan ileri olamaz.");
      return;
    }

    const listingTitle = normalizeListingTitle(formData.get("title"));
    const selectedCategory = String(formData.get("category") || "");
    const listingRole = String(formData.get("listingRole") || "");
    const customCategoryTitle = String(formData.get("customCategory") || "").trim();
    const category = selectedCategory === "Diğer" ? customCategoryTitle : selectedCategory;
    const categoryGroup = selectedCategory === "Diğer" ? "Diğer" : getCategoryGroupTitle(selectedCategory);
    const tags = parseListingTags(formData.get("tags"));
    const workLocationMode = getSelectedWorkLocationMode();
    const addressNote = workLocationMode === "remote" ? "" : String(formData.get("addressNote") || "").trim();
    const city = workLocationMode === "remote" ? "" : formData.get("city");
    const district = workLocationMode === "remote" ? "" : formData.get("district");

    if (selectedCategory === "Diğer" && !customCategoryTitle) {
      showToast("Diğer kategorisi için işe özel başlık yazman gerekiyor.");
      return;
    }

    if (!["employer", "master"].includes(listingRole)) {
      showToast("İlan türünü iş veren veya çalışan olarak seçmelisin.");
      return;
    }

    if (editListingId) {
      const existingListing =
        editListing || getAllListings().find((item) => String(item.id) === String(editListingId));
      if (!existingListing) {
        showToast("Güncellenecek ilan bulunamadı.");
        return;
      }
      if (!isListingOwnedByUser(existingListing, currentUser)) {
        showToast("Bu ilanı sadece ilan sahibi güncelleyebilir.");
        return;
      }
      if (isAssignedListing(existingListing) || isCompletedListing(existingListing)) {
        showToast("Atanmış veya tamamlanmış ilanlar güncellenemez.");
        return;
      }

      let updatedListing = {
        ...existingListing,
        ownerKey: existingListing.ownerKey || getAccountKey(currentUser),
        ownerUid: existingListing.ownerUid || currentUser.uid || "",
        ownerEmail: existingListing.ownerEmail || getAccountEmail(currentUser),
        title: listingTitle,
        listingRole,
        category,
        categoryGroup,
        customCategoryTitle,
        tags,
        city,
        district,
        workDate,
        time: getTimeLabel(workDate),
        duration: formData.get("duration"),
        budget: Number(formData.get("budget")),
        materials: formData.get("materials"),
        phone: formData.get("phone"),
        workLocationMode,
        addressNote,
        expectations: formData.get("expectations").trim(),
        details: formData.get("details").trim(),
        status: existingListing.status === "completed" || existingListing.status === "assigned" ? existingListing.status : "active",
        moderationStatus: "pending",
        moderationReason: "",
        moderatedAt: "",
        moderatedBy: "",
        image: existingListing.image || "",
        createdAt: getRecordTimestamp(existingListing) || Date.now(),
        owner: {
          ...(existingListing.owner || {}),
          name: existingListing.owner?.name || currentUser.fullName || "İş veren",
          key: existingListing.owner?.key || getAccountKey(currentUser),
          email: existingListing.owner?.email || getAccountEmail(currentUser),
          rating: Number(existingListing.owner?.rating || 10),
          reviewCount: Number(existingListing.owner?.reviewCount || 0),
        },
        updatedAt: Date.now(),
        resubmittedAt: new Date().toISOString(),
      };
      updatedListing = applyAutoModeration(updatedListing);

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "İlan güncelleniyor...";
        }

        if (imageDataUrl) {
          try {
            const authUser = await ensureFirestoreAuth();
            if (!updatedListing.ownerUid) updatedListing.ownerUid = authUser.uid;
            updatedListing.image = await uploadListingImage(
              imageDataUrl,
              { ...currentUser, uid: updatedListing.ownerUid },
              updatedListing.id,
            );
          } catch (uploadError) {
            console.warn("Ä°lan fotoÄŸrafÄ± Storage'a yÃ¼klenemedi:", uploadError);
            showToast("FotoÄŸraf CDN'e yÃ¼klenemedi, mevcut fotoÄŸraf korunuyor.");
          }
        }

        upsertListingLocally(updatedListing);
        await publishListingUpdateToFirestore(updatedListing);
        showToast("İlan güncellendi. Admin onayından sonra tekrar yayına alınacak.");
      } catch (error) {
        console.warn("İlan güncellemesi Firestore'a yazılamadı:", error);
        showToast(`İlan yerelde güncellendi. ${getFirestoreErrorMessage(error)}`);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "İlanı güncelle";
        }
      }

      window.setTimeout(() => {
        window.location.href = "ilanlarim.html";
      }, 800);
      return;
    }

    const requestedPromotion = {
      featured: formData.get("useFeaturedPromotion") === "1",
      highlighted: formData.get("useColorPromotion") === "1",
    };
    const promotionCost = getPromotionCost(requestedPromotion);

    if (promotionCost > getCreditBalance()) {
      showToast(`Bu görünürlük için ${formatCredits(promotionCost)} gerekiyor. Kredi yükleyip tekrar dene.`);
      return;
    }

    const listingPromotion = getListingPromotionFromCredits(requestedPromotion);

    const listingData = {
      id: Date.now(),
      ownerKey: getAccountKey(currentUser),
      ownerUid: currentUser.uid || "",
      ownerEmail: getAccountEmail(currentUser),
      title: listingTitle,
      listingRole,
      category,
      categoryGroup,
      customCategoryTitle,
      tags,
      city,
      district,
      workDate,
      time: getTimeLabel(workDate),
      duration: formData.get("duration"),
      budget: Number(formData.get("budget")),
      materials: formData.get("materials"),
      phone: formData.get("phone"),
      workLocationMode,
      addressNote,
      expectations: formData.get("expectations").trim(),
      details: formData.get("details").trim(),
      offers: 0,
      status: "active",
      moderationStatus: "pending",
      moderationReason: "",
      moderatedAt: "",
      moderatedBy: "",
      featured: listingPromotion.featured,
      highlighted: listingPromotion.highlighted,
      highlightColor: listingPromotion.highlighted ? sanitizeHighlightColor(formData.get("highlightColor")) : "",
      carouselPriority: listingPromotion.carouselPriority,
      carouselPriorityLabel: listingPromotion.carouselPriorityLabel,
      promotionSource: listingPromotion.promotionSource,
      promotionCreditCost: listingPromotion.creditCost,
      image: "",
      owner: {
        name: currentUser.fullName || "İş veren",
        key: getAccountKey(currentUser),
        email: getAccountEmail(currentUser),
        rating: 10,
        reviewCount: 0,
      },
      master: {
        name: "Atanmadı",
        rating: 0,
        reviewCount: 0,
      },
      createdAt: Date.now(),
    };

    let sharedSuccessfully = false;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "İlan paylaşılıyor...";
      }

      try {
        const authUser = await ensureFirestoreAuth();
        if (!listingData.ownerUid) {
          listingData.ownerUid = authUser.uid;
        }
        if (imageDataUrl) {
          listingData.image = await uploadListingImage(
            imageDataUrl,
            { ...currentUser, uid: listingData.ownerUid },
            listingData.id,
          );
        }
      } catch (authError) {
        console.warn("Firebase oturumu açılamadı, ilan yine de deneniyor:", authError);
      }

      const listingRef = await publishSharedListing(listingData, listingData.image);
      const sharedListing = buildSharedListingPayload(listingData, listingData.image);
      listingData.id = listingRef.id;
      listingData.createdAt = sharedListing.createdAt;
      listingData.image = sharedListing.image || "";
      remoteListings = [
        listingData,
        ...remoteListings.filter((item) => String(item.id) !== String(listingData.id)),
      ];
      notifySharedListingListeners();
      sharedSuccessfully = true;
      spendCredits(promotionCost);
      renderListingPromotionRights();
      showToast("İlan alındı. Admin onayından sonra ana akışta görünecek.");
    } catch (error) {
      console.warn("Firestore ilan kaydı yazılamadı:", error);

      if (error?.code === "permission-denied") {
        showToast(
          "Firestore izni kapalı. Firebase Console > Firestore > Rules bölümüne firestore.rules dosyasını yapıştırıp Publish et.",
        );
      } else {
        listings.unshift(listingData);
        localStorage.setItem("ustaListings", JSON.stringify(listings));
        showToast(`İlan şimdilik yerelde kaldı. ${getFirestoreErrorMessage(error)}`);
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "İlanı paylaş";
      }
    }

    if (!sharedSuccessfully) return;

    window.setTimeout(() => {
      window.location.href = "pazar.html";
    }, 700);
  });
}

const professionSelect = document.querySelector("#professionSelect");
const customProfessionField = document.querySelector("#customProfessionField");
const customProfessionInput = document.querySelector("#customProfessionInput");

if (professionSelect && customProfessionField && customProfessionInput) {
  professionSelect.addEventListener("change", () => {
    const isOther = professionSelect.value === "Diğer";
    customProfessionField.classList.toggle("visible", isOther);
    customProfessionInput.required = isOther;
    if (!isOther) {
      customProfessionInput.value = "";
    }
  });
}

const listingGrid = document.querySelector("#listingGrid");

if (listingGrid) {
  const MARKET_RESULTS_PAGE = "kategori.html";
  const isCategoryResultsPage = document.body.classList.contains("category-page");
  const initialMarketParams = new URLSearchParams(window.location.search);
  let searchFocusListingId = initialMarketParams.get("focus") || "";
  let searchFocusText = initialMarketParams.get("search") || "";
  let listings = getAllListings();
  const homeCategoryStrip = document.querySelector("#homeCategoryStrip");

  const categoryMarks = {
    "Yazılım geliştirme": "YZ",
    "Web sitesi": "WB",
    "Mobil uygulama": "MB",
    "E-ticaret": "ET",
    "UI/UX tasarım": "UX",
    "Grafik tasarım": "GR",
    "Logo ve marka": "LM",
    "Sosyal medya": "SM",
    "Dijital pazarlama": "DP",
    SEO: "SE",
    "Reklam yönetimi": "RY",
    "Video kurgu": "VK",
    "Fotoğraf çekimi": "FÇ",
    "İçerik yazarlığı": "İY",
    Çeviri: "ÇV",
    "Özel ders": "ÖD",
    Muhasebe: "MH",
    Danışmanlık: "DN",
    "Giyim dikim": "GD",
    "Tekstil üretim": "TÜ",
    "Moda tasarım": "MT",
    Terzi: "TR",
    Kurye: "KR",
    Lojistik: "LJ",
    Şoför: "ŞF",
    "Etkinlik organizasyonu": "EO",
    Catering: "CT",
    Güzellik: "GZ",
    Kuaför: "KF",
    "Çocuk bakımı": "ÇB",
    "Yaşlı bakımı": "YB",
    Boya: "BO",
    Tesisat: "TS",
    Elektrik: "EL",
    Montaj: "MO",
    Taşıma: "TA",
    Temizlik: "TE",
    Marangoz: "MA",
    Klima: "KL",
    Bahçe: "BA",
    Diğer: "Dİ",
  };
  const homeCategoryItems = [
    "Boya",
    "Tesisat",
    "Elektrik",
    "Temizlik",
    "Taşıma",
    "Montaj",
    "Özel ders",
    "Web sitesi",
  ];

  let selectedTime = "Tümü";
  let exploreMode = false;
  let featuredIndex = 0;
  let currentFeatured = [];
  let carouselTimer;
  const featuredListings = document.querySelector("#featuredListings");
  const featuredPrev = document.querySelector("#featuredPrev");
  const featuredNext = document.querySelector("#featuredNext");
  const featuredCarousel = document.querySelector(".featured-carousel");
  const marketSearch = document.querySelector("#marketSearch");
  const exploreFeedButton = document.querySelector("#exploreFeedButton");
  const filterToggleButton = document.querySelector("#filterToggleButton");
  const marketFilters = document.querySelector("#marketFilters");
  const marketFilterBackdrop = document.querySelector("#marketFilterBackdrop");
  const closeMarketFilters = document.querySelector("#closeMarketFilters");
  const applyMarketFilters = document.querySelector("#applyMarketFilters");
  const activeFilterSummary = document.querySelector("#activeFilterSummary");
  const categoryResultsSection = document.querySelector("#categoryResultsSection");
  const categoryResultsTitle = document.querySelector("#categoryResultsTitle");
  const categoryFilterSearch = document.querySelector("#categoryFilterSearch");
  const categoryFilter = document.querySelector("#categoryFilter");
  const budgetMinFilter = document.querySelector("#budgetMinFilter");
  const budgetMaxFilter = document.querySelector("#budgetMaxFilter");
  const workModeFilter = document.querySelector("#workModeFilter");
  const cityFilter = document.querySelector("#cityFilter");
  const districtFilter = document.querySelector("#districtFilter");
  const offerCountFilter = document.querySelector("#offerCountFilter");
  const sortFilter = document.querySelector("#sortFilter");
  const clearMarketFilters = document.querySelector("#clearMarketFilters");
  const chips = document.querySelectorAll(".chip");
  const profileName = document.querySelector("#profileName");
  const profileRole = document.querySelector("#profileRole");
  const profileAvatar = document.querySelector("#profileAvatar");
  const profileButton = document.querySelector("#profileButton");
  const profileDrawer = document.querySelector("#profileDrawer");
  const drawerBackdrop = document.querySelector("#drawerBackdrop");
  const closeProfileDrawer = document.querySelector("#closeProfileDrawer");
  const drawerName = document.querySelector("#drawerName");
  const drawerRole = document.querySelector("#drawerRole");
  const drawerAvatar = document.querySelector("#drawerAvatar");
  const drawerCreditBalance = document.querySelector("#drawerCreditBalance");
  const drawerVerifyPill = document.querySelector("#drawerVerifyPill");
  const drawerUpgradeLink = document.querySelector(".upgrade-link");
  const adminPanelAction = document.querySelector("#adminPanelAction");
  const notificationButton = document.querySelector("#notificationButton");
  const notificationPanel = document.querySelector("#notificationPanel");
  const notificationList = document.querySelector("#notificationList");
  const notificationBadge = document.querySelector("#notificationBadge");
  const notificationCountText = document.querySelector("#notificationCountText");
  const markAllNotificationsRead = document.querySelector("#markAllNotificationsRead");
  const adminListingNotificationWrap = document.querySelector("#adminListingNotificationWrap");
  const adminListingNotificationButton = document.querySelector("#adminListingNotificationButton");
  const adminListingNotificationPanel = document.querySelector("#adminListingNotificationPanel");
  const adminListingNotificationList = document.querySelector("#adminListingNotificationList");
  const adminListingNotificationBadge = document.querySelector("#adminListingNotificationBadge");
  const adminListingNotificationCountText = document.querySelector("#adminListingNotificationCountText");

  let notificationInbox = [];

  const currency = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  });

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("ustaUser")) || {};
    } catch {
      return {};
    }
  }

  function updateDrawerCreditBalance() {
    if (drawerCreditBalance) {
      drawerCreditBalance.hidden = !CREDIT_TOPUP_ENABLED || !isRegisteredUser(getUser());
      drawerCreditBalance.textContent = `Bakiyen: ${formatCredits(getCreditBalance())}`;
    }
  }

  function updateDrawerVerificationState(user) {
    if (!isRegisteredUser(user)) {
      if (drawerVerifyPill) {
        drawerVerifyPill.textContent = "Kayıt olmadan gez";
        drawerVerifyPill.classList.remove("verified");
      }
      return;
    }

    const security = getSecurityState();
    const verified = Boolean(user.phoneVerified || security.phoneVerified);
    if (drawerVerifyPill) {
      drawerVerifyPill.textContent = verified ? "Telefon doğrulandı" : "Telefon doğrulanmadı";
      drawerVerifyPill.classList.toggle("verified", verified);
    }
  }

  function setupProfile() {
    if (!profileButton || !profileName || !profileRole || !profileDrawer) {
      restartSharedFeeds();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const user = getUser();
    const registered = isRegisteredUser(user);
    const role = params.get("role") || user.role || "master";
    const displayName = registered ? user.fullName || "Profil" : "Misafir";
    const profileButtonName = registered ? displayName : "Hesap";
    const roleLabel = registered
      ? role === "master" ? user.profession || "Hizmet veren hesabı" : "İş veren hesabı"
      : "İlanları keşfet";
    const adminUser = isAdminUser(user);

    document.body.classList.toggle("guest-user", !registered);
    document.body.classList.toggle("admin-user", adminUser);
    profileButton.setAttribute("aria-label", registered ? "Profil panelini aç" : "Hesap panelini aç");
    profileName.textContent = profileButtonName;
    profileRole.textContent = roleLabel;
    setAvatarElement(profileAvatar, registered ? user : { fullName: "Misafir" });
    drawerName.textContent = displayName;
    drawerRole.textContent = roleLabel;
    setAvatarElement(drawerAvatar, registered ? user : { fullName: "Misafir" });
    if (drawerUpgradeLink) {
      drawerUpgradeLink.hidden = registered && !CREDIT_TOPUP_ENABLED;
      drawerUpgradeLink.textContent = registered ? "Kredi yükle" : "Kayıt ol";
      drawerUpgradeLink.href = registered ? "kredi-yukle.html" : "kayit.html";
    }
    if (adminPanelAction) {
      adminPanelAction.hidden = !adminUser;
    }
    if (adminListingNotificationWrap) {
      adminListingNotificationWrap.hidden = !adminUser;
    }
    updateDrawerCreditBalance();
    updateDrawerVerificationState(user);
    marketSearch.placeholder = "İlan, sektör, beceri veya ilçe ara";
    restartSharedFeeds();
  }

  function openProfileDrawer() {
    if (!profileDrawer || !drawerBackdrop) return;
    closeNotificationPanel();
    updateDrawerCreditBalance();
    updateDrawerVerificationState(getUser());
    drawerBackdrop.hidden = false;
    profileDrawer.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      drawerBackdrop.classList.add("open");
      profileDrawer.classList.add("open");
    });
  }

  function closeDrawer() {
    if (!profileDrawer || !drawerBackdrop) return;
    drawerBackdrop.classList.remove("open");
    profileDrawer.classList.remove("open");
    profileDrawer.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      drawerBackdrop.hidden = true;
    }, 240);
  }

  function closeNotificationPanel() {
    if (!notificationPanel || !notificationButton) return;
    notificationPanel.classList.remove("open");
    notificationPanel.hidden = true;
    notificationButton.setAttribute("aria-expanded", "false");
  }

  function closeAdminListingNotificationPanel() {
    if (!adminListingNotificationPanel || !adminListingNotificationButton) return;
    adminListingNotificationPanel.classList.remove("open");
    adminListingNotificationPanel.hidden = true;
    adminListingNotificationButton.setAttribute("aria-expanded", "false");
  }

  function openNotificationPanel() {
    if (!notificationPanel || !notificationButton) return;
    closeDrawer();
    closeAdminListingNotificationPanel();
    notificationPanel.hidden = false;
    window.requestAnimationFrame(() => notificationPanel.classList.add("open"));
    notificationButton.setAttribute("aria-expanded", "true");
  }

  function openAdminListingNotificationPanel() {
    if (!adminListingNotificationPanel || !adminListingNotificationButton) return;
    closeDrawer();
    closeNotificationPanel();
    adminListingNotificationPanel.hidden = false;
    window.requestAnimationFrame(() => adminListingNotificationPanel.classList.add("open"));
    adminListingNotificationButton.setAttribute("aria-expanded", "true");
  }

  function toggleNotificationPanel() {
    if (!notificationPanel || !notificationButton) return;
    if (notificationPanel.hidden) openNotificationPanel();
    else closeNotificationPanel();
  }

  function toggleAdminListingNotificationPanel() {
    if (!adminListingNotificationPanel || !adminListingNotificationButton) return;
    if (adminListingNotificationPanel.hidden) openAdminListingNotificationPanel();
    else closeAdminListingNotificationPanel();
  }

  function updateNotificationBadge() {
    if (!notificationBadge) return;
    const unreadCount = notificationInbox.filter((item) => !item.read).length;
    notificationBadge.hidden = unreadCount === 0;
    notificationBadge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);

    if (notificationCountText) {
      notificationCountText.textContent = unreadCount
        ? `${unreadCount} okunmamış bildirim`
        : "Yeni bildirim yok";
    }

    if (markAllNotificationsRead) {
      markAllNotificationsRead.disabled = unreadCount === 0;
    }
  }

  function renderNotificationInbox() {
    if (!notificationList) return;

    const visibleNotifications = notificationInbox.filter((item) => !item.read);

    notificationList.innerHTML = visibleNotifications.length
      ? visibleNotifications
          .map(
            (item) => `
              <li>
                <button
                  class="notification-item ${item.read ? "" : "unread"}"
                  type="button"
                  data-notification-id="${item.id}"
                  data-notification-href="${item.href || ""}"
                >
                  <span class="notification-type-mark">${getNotificationTypeMark(item.type)}</span>
                  <span class="notification-copy">
                    <strong>${item.title}</strong>
                    <p>${item.body}</p>
                  </span>
                  <time datetime="${item.time}">${formatNotificationTime(item.time)}</time>
                </button>
              </li>
            `,
          )
          .join("")
      : `<li class="notification-empty">Bildirim yok.</li>`;

    if (!visibleNotifications.length) {
      notificationList.innerHTML = `<li class="notification-empty">Bildirim yok.</li>`;
    }

    updateNotificationBadge();
  }

  function getAdminListingNotifications() {
    if (!isAdminUser(getUser())) return [];
    return getAllListings()
      .filter(isPendingModerationListing)
      .sort((left, right) => getRecordTimestamp(right) - getRecordTimestamp(left));
  }

  function renderAdminListingNotifications() {
    if (!adminListingNotificationWrap || !adminListingNotificationList) return;
    const adminUser = isAdminUser(getUser());
    adminListingNotificationWrap.hidden = !adminUser;
    if (!adminUser) return;

    const pendingListings = getAdminListingNotifications();
    if (adminListingNotificationBadge) {
      adminListingNotificationBadge.hidden = pendingListings.length === 0;
      adminListingNotificationBadge.textContent = pendingListings.length > 9 ? "9+" : String(pendingListings.length);
    }
    if (adminListingNotificationCountText) {
      adminListingNotificationCountText.textContent = pendingListings.length
        ? `${pendingListings.length} bekleyen ilan`
        : "Bekleyen ilan yok";
    }

    adminListingNotificationList.innerHTML = pendingListings.length
      ? pendingListings
          .map((listing) => {
            const listingTime = getRecordTimestamp(listing) || Date.now();
            const notificationTitle = listing.resubmittedAt ? "Güncellenen ilan" : "Yeni ilan";
            return `
              <li>
                <button
                  class="notification-item unread"
                  type="button"
                  data-admin-listing-notification="${listing.id}"
                >
                  <span class="notification-type-mark">İL</span>
                  <span class="notification-copy">
                    <strong>${notificationTitle}: ${escapeHtml(listing.title || "Başlıksız ilan")}</strong>
                    <p>${escapeHtml([listing.category, listing.city, listing.district].filter(Boolean).join(" · "))}</p>
                  </span>
                  <time datetime="${new Date(listingTime).toISOString()}">${formatNotificationTime(listingTime)}</time>
                </button>
              </li>
            `;
          })
          .join("")
      : `<li class="notification-empty">Bekleyen ilan yok.</li>`;
  }

  function loadNotificationInbox() {
    const params = new URLSearchParams(window.location.search);
    const user = getUser();
    const accountKey = getAccountKey(user);
    const role = params.get("role") || user.role || "master";
    let inbox = getStoredNotificationsForAccount(user).filter((item) =>
      shouldKeepNotificationForAccount(item, accountKey, user),
    );

    if (!inbox.length) {
      inbox = getDefaultNotificationInbox(role);
      saveNotificationInbox(inbox, accountKey);
    }

    notificationInbox = mergeOfferNotifications(inbox, accountKey, user);
    notificationInbox = mergeRemoteNotifications(notificationInbox, accountKey, user);
    saveNotificationInbox(notificationInbox, accountKey);
    renderNotificationInbox();
  }

  async function markNotificationRead(notificationId) {
    const user = getUser();
    const accountKey = getAccountKey(user);
    rememberReadNotificationForAccount(notificationId, user);
    notificationInbox = notificationInbox.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item,
    );
    saveNotificationInbox(notificationInbox, accountKey);
    renderNotificationInbox();
    await markRemoteNotificationRead(notificationId);
  }

  async function markAllNotificationsReadHandler() {
    const user = getUser();
    const accountKey = getAccountKey(user);
    notificationInbox.forEach((item) => rememberReadNotificationForAccount(item.id, user));
    notificationInbox = notificationInbox.map((item) => ({ ...item, read: true }));
    saveNotificationInbox(notificationInbox, accountKey);
    renderNotificationInbox();
    await Promise.all(notificationInbox.map((item) => markRemoteNotificationRead(item.id)));
    showToast("Tüm bildirimler okundu olarak işaretlendi.");
  }

  function setupNotifications() {
    if (!notificationButton || !notificationPanel || !notificationList) return;

    loadNotificationInbox();
    subscribeNotificationFeed(() => {
      loadNotificationInbox();
    });

    notificationButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleNotificationPanel();
    });

    markAllNotificationsRead?.addEventListener("click", async (event) => {
      event.stopPropagation();
      await markAllNotificationsReadHandler();
    });

    notificationList.addEventListener("click", async (event) => {
      const item = event.target.closest("[data-notification-id]");
      if (!item) return;

      const notificationId = item.dataset.notificationId;
      await markNotificationRead(notificationId);
      closeNotificationPanel();

      const href = item.dataset.notificationHref;
      if (href) window.location.href = href;
    });

    document.addEventListener("click", (event) => {
      if (notificationPanel.hidden || event.target.closest(".notification-wrap")) return;
      closeNotificationPanel();
    });
  }

  function setupAdminListingNotifications() {
    if (!adminListingNotificationButton || !adminListingNotificationPanel || !adminListingNotificationList) return;

    renderAdminListingNotifications();
    subscribeSharedListings(renderAdminListingNotifications);

    adminListingNotificationButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleAdminListingNotificationPanel();
    });

    adminListingNotificationList.addEventListener("click", (event) => {
      const item = event.target.closest("[data-admin-listing-notification]");
      if (!item) return;
      window.location.href = `admin.html?listing=${encodeURIComponent(item.dataset.adminListingNotification)}`;
    });

    document.addEventListener("click", (event) => {
      if (adminListingNotificationPanel.hidden || event.target.closest(".admin-listing-notification-wrap")) return;
      closeAdminListingNotificationPanel();
    });
  }

  function setSelectValue(select, value) {
    if (!select || value === null || value === undefined || value === "") return;
    const textValue = String(value);
    if (![...select.options].some((option) => option.value === textValue)) {
      select.add(new Option(textValue, textValue));
    }
    select.value = textValue;
  }

  function setSelectedTimeFilter(value) {
    const allowedValues = [...chips].map((chip) => chip.dataset.time);
    selectedTime = allowedValues.includes(value) ? value : "Tümü";
    chips.forEach((chip) => chip.classList.toggle("active", chip.dataset.time === selectedTime));
  }

  function syncMarketDistrictFilter() {
    if (!cityFilter || !districtFilter || !window.TURKEY_LOCATIONS) return;

    const city = window.TURKEY_LOCATIONS.find((item) => item.name === cityFilter.value);
    districtFilter.innerHTML = "";
    if (!city) {
      districtFilter.add(new Option("Önce il seç", ""));
      districtFilter.disabled = true;
      return;
    }

    districtFilter.add(new Option("Tümü", ""));
    city.districts.forEach((district) => {
      districtFilter.add(new Option(district.name, district.name));
    });
    districtFilter.disabled = false;
  }

  function populateMarketLocationFilters() {
    if (!cityFilter || !districtFilter || !window.TURKEY_LOCATIONS) return;

    cityFilter.innerHTML = `<option value="">Tümü</option>`;
    window.TURKEY_LOCATIONS.forEach((city) => {
      cityFilter.add(new Option(city.name, city.name));
    });

    cityFilter.addEventListener("change", () => {
      exploreMode = false;
      syncMarketDistrictFilter();
      handleMarketFilterDraftChange();
    });
    syncMarketDistrictFilter();
  }

  function buildMarketFilterUrl(overrides = {}) {
    const params = new URLSearchParams();
    const query = String(overrides.query ?? getMarketQueryValue()).trim();
    const category = overrides.category ?? getResolvedCategoryFilterValue();
    const time = overrides.time ?? selectedTime;
    const minBudget = overrides.min ?? budgetMinFilter?.value ?? "";
    const maxBudget = overrides.max ?? budgetMaxFilter?.value ?? "";
    const workMode = overrides.mode ?? workModeFilter?.value ?? "all";
    const city = overrides.city ?? cityFilter?.value ?? "";
    const district = overrides.district ?? districtFilter?.value ?? "";
    const offerCount = overrides.offers ?? offerCountFilter?.value ?? "all";
    const sort = overrides.sort ?? sortFilter?.value ?? "featured";

    if (query) params.set("q", query);
    if (category && category !== "Tümü") params.set("category", category);
    if (time && time !== "Tümü") params.set("time", time);
    if (minBudget) params.set("min", minBudget);
    if (maxBudget) params.set("max", maxBudget);
    if (workMode && workMode !== "all") params.set("mode", workMode);
    if (city) params.set("city", city);
    if (district) params.set("district", district);
    if (offerCount && offerCount !== "all") params.set("offers", offerCount);
    if (sort && sort !== "featured") params.set("sort", sort);
    if (searchFocusListingId) params.set("focus", searchFocusListingId);
    if (searchFocusText) params.set("search", searchFocusText);

    const queryString = params.toString();
    return `${MARKET_RESULTS_PAGE}${queryString ? `?${queryString}` : ""}`;
  }

  function updateMarketResultsUrl() {
    if (!isCategoryResultsPage) return;
    window.history.replaceState(null, "", buildMarketFilterUrl());
  }

  function hydrateMarketFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    searchFocusListingId = params.get("focus") || "";
    searchFocusText = params.get("search") || "";
    if (marketSearch) marketSearch.value = params.get("q") || "";
    syncCategoryFilterOptions();
    const categoryParam = params.get("category") || "";
    setSelectValue(categoryFilter, getCategoryByCode(categoryParam) || categoryParam || "Tümü");
    setSelectedTimeFilter(params.get("time") || "Tümü");
    if (budgetMinFilter) budgetMinFilter.value = params.get("min") || "";
    if (budgetMaxFilter) budgetMaxFilter.value = params.get("max") || "";
    setSelectValue(workModeFilter, params.get("mode") || "all");
    setSelectValue(cityFilter, params.get("city") || "");
    syncMarketDistrictFilter();
    setSelectValue(districtFilter, params.get("district") || "");
    setSelectValue(offerCountFilter, params.get("offers") || "all");
    setSelectValue(sortFilter, params.get("sort") || "featured");
  }

  function getResolvedCategoryFilterValue() {
    const selectedCategory = categoryFilter?.value || "Tümü";
    const typedCategory = (categoryFilterSearch?.value || "").trim();
    if (selectedCategory !== "Tümü" || !typedCategory || !categoryFilter) return selectedCategory;
    const categoryFromCode = getCategoryByCode(typedCategory);
    if (categoryFromCode) return categoryFromCode;

    return selectedCategory;
  }

  function getCategorySearchQueryValue() {
    const typedCategory = (categoryFilterSearch?.value || "").trim();
    if (!typedCategory || getResolvedCategoryFilterValue() !== "Tümü") return "";
    return typedCategory;
  }

  function getMarketQueryValue() {
    return (marketSearch?.value || "").trim() || getCategorySearchQueryValue();
  }

  function getSearchMatchScore(listing, normalizedQuery) {
    if (!normalizedQuery) return 0;

    const title = normalizeSearchValue(listing.title);
    const category = normalizeSearchValue(listing.category);
    const categoryCode = normalizeSearchValue(listing.categoryCode || getCategoryCode(listing.category));
    const tags = getListingTags(listing).map(normalizeSearchValue);
    const filterText = normalizeSearchValue(listing.filterText || "");
    const textTokens = filterText.split(/\s+/).filter(Boolean);

    if (title === normalizedQuery) return 120;
    if (title.startsWith(normalizedQuery)) return 105;
    if (title.includes(normalizedQuery)) return 95;
    if (categoryCode === normalizedQuery.padStart(3, "0")) return 90;
    if (category === normalizedQuery) return 86;
    if (isCloseSearchMatch(category, normalizedQuery)) return 82;
    if (category.includes(normalizedQuery)) return 72;
    if (tags.some((tag) => tag === normalizedQuery || tag.includes(normalizedQuery))) return 58;
    if (tags.some((tag) => isCloseSearchMatch(tag, normalizedQuery))) return 52;
    if (filterText.includes(normalizedQuery)) return 42;
    if (textTokens.some((token) => isCloseSearchMatch(token, normalizedQuery))) return 36;
    return 0;
  }

  function getBestSearchListing(query, category = "") {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return null;

    return getAllListings()
      .filter((listing) => isApprovedListing(listing) && !isUnavailableListing(listing))
      .filter((listing) => !category || listing.category === category)
      .map((listing) => ({ listing, score: getSearchMatchScore(listing, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          Number(right.listing.carouselPriority || 0) - Number(left.listing.carouselPriority || 0) ||
          getRecordTimestamp(right.listing) - getRecordTimestamp(left.listing),
      )[0]?.listing || null;
  }

  function redirectSearchToResults() {
    const query = (marketSearch?.value || "").trim();
    if (!query) {
      window.location.href = "kesfet.html";
      return false;
    }

    const bestListing = getBestSearchListing(query);
    if (!bestListing) {
      showToast("Bu aramaya uygun kategori bulunamadı.");
      return false;
    }

    const params = new URLSearchParams();
    params.set("q", query);
    params.set("search", query);
    params.set("focus", String(bestListing.id));
    window.location.href = `${MARKET_RESULTS_PAGE}?${params.toString()}`;
    return true;
  }

  function getActiveFilterLabels() {
    const labels = [];
    const query = getMarketQueryValue();
    const category = getResolvedCategoryFilterValue();
    const minBudget = budgetMinFilter?.value || "";
    const maxBudget = budgetMaxFilter?.value || "";
    const workMode = workModeFilter?.value || "all";
    const cityValue = cityFilter?.value || "";
    const districtValue = districtFilter?.value || "";
    const offerCountValue = offerCountFilter?.value || "all";
    const sortValue = sortFilter?.value || "featured";

    if (query) labels.push(`Arama: ${query}`);
    if (searchFocusText) labels.push(`Öne çıkan başlık: ${searchFocusText}`);
    if (category !== "Tümü") labels.push(`Kategori: ${getCategoryCode(category)} - ${category}`);
    if (selectedTime !== "Tümü") labels.push(`Zaman: ${selectedTime}`);
    if (minBudget) labels.push(`Min: ${Number(minBudget).toLocaleString("tr-TR")} TL`);
    if (maxBudget) labels.push(`Max: ${Number(maxBudget).toLocaleString("tr-TR")} TL`);
    if (workMode === "remote") labels.push("Uzaktan");
    if (workMode === "onsite") labels.push("Yakından");
    if (cityValue) labels.push(`İl: ${cityValue}`);
    if (districtValue) labels.push(`İlçe: ${districtValue}`);
    if (offerCountValue === "none") labels.push("Teklifsiz");
    if (offerCountValue === "low") labels.push("1-3 teklif");
    if (offerCountValue === "many") labels.push("4+ teklif");
    if (sortValue === "newest") labels.push("En yeni");
    if (sortValue === "budgetDesc") labels.push("Bütçe yüksek");
    if (sortValue === "budgetAsc") labels.push("Bütçe düşük");
    if (sortValue === "offersAsc") labels.push("Az teklifli");

    return labels;
  }

  function updateActiveFilterSummary() {
    if (!activeFilterSummary) return;

    const labels = getActiveFilterLabels();
    activeFilterSummary.hidden = !labels.length;
    activeFilterSummary.innerHTML = labels.length
      ? `<strong>Kriterler</strong>${labels
          .map((label) => `<span class="active-filter-pill">${escapeHtml(label)}</span>`)
          .join("")}`
      : "";
  }

  function handleMarketFilterDraftChange() {
    exploreMode = false;
    if (isCategoryResultsPage) {
      renderListings();
      return;
    }

    listingGrid.innerHTML = "";
    updateActiveFilterSummary();
    renderHomeCategories();
  }

  function openMarketFilters() {
    if (!marketFilters || !filterToggleButton) return;
    closeDrawer();
    closeNotificationPanel();
    closeAdminListingNotificationPanel();
    if (categoryResultsSection) categoryResultsSection.hidden = false;
    marketFilters.hidden = false;
    if (marketFilterBackdrop) marketFilterBackdrop.hidden = false;
    document.body.classList.add("filter-panel-open");
    filterToggleButton.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      marketFilters.classList.add("open");
      marketFilterBackdrop?.classList.add("open");
    });
  }

  function closeMarketFilterPanel() {
    if (!marketFilters || !filterToggleButton) return;
    marketFilters.classList.remove("open");
    marketFilterBackdrop?.classList.remove("open");
    document.body.classList.remove("filter-panel-open");
    filterToggleButton.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      marketFilters.hidden = true;
      if (marketFilterBackdrop) marketFilterBackdrop.hidden = true;
      if (categoryResultsSection && !isCategoryResultsPage && !exploreMode) {
        categoryResultsSection.hidden = true;
      } else if (categoryResultsSection && !exploreMode && !getActiveFilterLabels().length) {
        categoryResultsSection.hidden = true;
      }
    }, 180);
  }

  function syncCategoryFilterOptions() {
    if (!categoryFilter) return;
    populateCategorySelect(categoryFilter, {
      firstValue: "Tümü",
      firstText: "Tümü",
      searchTerm: categoryFilterSearch?.value || "",
    });
  }

  function resetMarketFilters(options = {}) {
    const { render = true } = options;
    if (marketSearch) marketSearch.value = "";
    if (categoryFilterSearch) categoryFilterSearch.value = "";
    syncCategoryFilterOptions();
    if (categoryFilter) categoryFilter.value = "Tümü";
    if (budgetMinFilter) budgetMinFilter.value = "";
    if (budgetMaxFilter) budgetMaxFilter.value = "";
    if (workModeFilter) workModeFilter.value = "all";
    if (cityFilter) cityFilter.value = "";
    if (districtFilter) {
      districtFilter.innerHTML = `<option value="">Önce il seç</option>`;
      districtFilter.disabled = true;
    }
    if (offerCountFilter) offerCountFilter.value = "all";
    if (sortFilter) sortFilter.value = "featured";
    selectedTime = "Tümü";
    chips.forEach((chip) => chip.classList.toggle("active", chip.dataset.time === "Tümü"));
    if (render) renderListings();
  }

  function renderHomeCategories() {
    if (!homeCategoryStrip) return;

    const categoryCounts = new Map();
    listings.forEach((listing) => {
      if (isUnavailableListing(listing) || !isApprovedListing(listing)) return;
      const category = listing.category || listing.categoryGroup || "Diğer";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    homeCategoryStrip.innerHTML = homeCategoryItems
      .map((category) => {
        const count = categoryCounts.get(category) || 0;
        const mark = categoryMarks[category] || category.slice(0, 2).toLocaleUpperCase("tr-TR");
        const active = getResolvedCategoryFilterValue() === category;

        return `
          <button class="home-category-card ${active ? "active" : ""}" type="button" data-home-category="${escapeHtml(category)}">
            <span>${mark}</span>
            <strong>${escapeHtml(category)}</strong>
            <small>Kod ${getCategoryCode(category)} · ${count} ilan</small>
          </button>
        `;
      })
      .join("");
  }

  function getFilteredListings() {
    const query = normalizeSearchValue(getMarketQueryValue());
    const category = getResolvedCategoryFilterValue();
    const minBudget = Number(budgetMinFilter?.value || 0);
    const maxBudget = Number(budgetMaxFilter?.value || 0);
    const workMode = workModeFilter?.value || "all";
    const cityValue = cityFilter?.value || "";
    const districtValue = districtFilter?.value || "";
    const offerCountValue = offerCountFilter?.value || "all";

    return listings.filter((listing) => {
      if (isUnavailableListing(listing)) return false;
      if (!isApprovedListing(listing)) return false;

      const matchesQuery = !query || getSearchMatchScore(listing, query) > 0;
      const matchesCategory = category === "Tümü" || listing.category === category;
      const matchesTime = selectedTime === "Tümü" || listing.time === selectedTime;
      const listingBudget = Number(listing.budget || 0);
      const matchesMinBudget = !minBudget || listingBudget >= minBudget;
      const matchesMaxBudget = !maxBudget || listingBudget <= maxBudget;
      const listingWorkMode = listing.workLocationMode || "onsite";
      const matchesWorkMode = workMode === "all" || listingWorkMode === workMode;
      const matchesCity = !cityValue || listing.city === cityValue;
      const matchesDistrict = !districtValue || listing.district === districtValue;
      const offers = Number(listing.offers || 0);
      const matchesOfferCount =
        offerCountValue === "all" ||
        (offerCountValue === "none" && offers === 0) ||
        (offerCountValue === "low" && offers >= 1 && offers <= 3) ||
        (offerCountValue === "many" && offers >= 4);

      return matchesQuery && matchesCategory && matchesTime && matchesMinBudget && matchesMaxBudget && matchesWorkMode && matchesCity && matchesDistrict && matchesOfferCount;
    });
  }

  function sortFilteredListings(filteredListings) {
    const sortByPromotion = (left, right) =>
      Number(right.carouselPriority || 0) - Number(left.carouselPriority || 0) ||
      getRecordTimestamp(right) - getRecordTimestamp(left);

    return [...filteredListings].sort((left, right) => {
      if (searchFocusListingId) {
        if (String(left.id) === String(searchFocusListingId)) return -1;
        if (String(right.id) === String(searchFocusListingId)) return 1;
      }

      const sortValue = sortFilter?.value || "featured";
      if (sortValue === "newest") return getRecordTimestamp(right) - getRecordTimestamp(left);
      if (sortValue === "budgetDesc") return Number(right.budget || 0) - Number(left.budget || 0);
      if (sortValue === "budgetAsc") return Number(left.budget || 0) - Number(right.budget || 0);
      if (sortValue === "offersAsc") return Number(left.offers || 0) - Number(right.offers || 0);
      return sortByPromotion(left, right);
    });
  }

  function getOrderedFilteredListings() {
    return sortFilteredListings(getFilteredListings());
  }

  function redirectToFilteredListing(options = {}) {
    const { focusOffer = true } = options;
    if (!getActiveFilterLabels().length) {
      window.location.href = "kesfet.html";
      return false;
    }

    const orderedListings = getOrderedFilteredListings();
    if (!orderedListings.length) {
      showToast("Bu filtrelerle uygun ilan bulunamadı.");
      return false;
    }

    window.location.href = getListingDetailHref(orderedListings[0], focusOffer);
    return true;
  }

  function redirectFiltersToResults() {
    if (!getActiveFilterLabels().length) {
      window.location.href = "kesfet.html";
      return false;
    }

    searchFocusListingId = "";
    searchFocusText = "";

    if (isCategoryResultsPage) {
      closeMarketFilterPanel();
      renderListings();
      categoryResultsSection?.scrollIntoView({ block: "start" });
      return true;
    }

    window.location.href = buildMarketFilterUrl();
    return true;
  }

  function getListingDetailHref(listing, focusOffer = false) {
    const listingId = encodeURIComponent(String(listing?.id || ""));
    return listingId ? `ilan-detay.html?id=${listingId}${focusOffer ? "#listingOfferPanel" : ""}` : "ilan-detay.html";
  }

  function isSearchFocusedListing(listing) {
    return Boolean(searchFocusListingId && String(listing?.id) === String(searchFocusListingId));
  }

  function listingCard(listing, featured = false, options = {}) {
    const imageSrc = getListingImage(listing);
    const categoryMark =
      categoryMarks[listing.category] || listing.category.slice(0, 2).toLocaleUpperCase("tr-TR");
    const timeLabel = getTimeLabel(listing.workDate) || listing.time;
    const promoted = Boolean(listing.highlighted);
    const priorityLabel = listing.carouselPriorityLabel || (listing.carouselPriority ? "Öne çıkan sıra" : "");
    const offerHref = getListingDetailHref(listing, true);
    const displayTitle = normalizeListingTitle(listing.title) || "Ilan";
    const safeDisplayTitle = escapeHtml(displayTitle);
    const safeFullTitle = escapeHtml(listing.title || displayTitle);
    const roleLabel = getListingRoleLabel(listing);
    const sponsored = Boolean(options.sponsored);
    const similar = Boolean(options.similar);
    const searchFocused = Boolean(options.searchFocused);
    const dataAttributes = [
      ["filter-id", listing.id],
      ["filter-category", listing.category],
      ["filter-category-code", listing.categoryCode || getCategoryCode(listing.category)],
      ["filter-group", listing.categoryGroup],
      ["filter-work-mode", listing.workLocationMode || "onsite"],
      ["filter-city", listing.city || ""],
      ["filter-district", listing.district || ""],
      ["filter-budget", Number(listing.budget || 0)],
      ["filter-offers", Number(listing.offers || 0)],
      ["filter-time", timeLabel],
      ["filter-role", listing.listingRole || listing.role || ""],
      ["filter-created-at", getRecordTimestamp(listing)],
    ]
      .map(([name, value]) => `data-${name}="${escapeHtml(value)}"`)
      .join(" ");

    return `
      <a class="${featured ? "featured-card" : "listing-card"} home-listing-link ${promoted ? "colored-listing" : ""} ${listing.carouselPriority >= 3 ? "premium-listing" : ""} ${sponsored ? "sponsored-listing-card" : ""} ${similar ? "similar-listing-card" : ""} ${searchFocused ? "search-focused-listing" : ""}" href="${offerHref}" aria-label="${safeFullTitle} ilanını aç ve teklif alanına git" ${dataAttributes}${getHighlightStyle(listing)}>
        <div class="${featured ? "featured-top" : "listing-top"}">
          <span class="category-icon">${categoryMark}</span>
          <strong class="budget">${currency.format(listing.budget)}</strong>
        </div>
        <div class="listing-photo">
          <img src="${imageSrc}" alt="${listing.title} ilan fotoğrafı" loading="lazy" onerror="this.onerror=null;this.src='assets/listing-placeholder.svg';" />
          <span class="listing-role-label">${roleLabel}</span>
          ${featured ? `<span class="featured-photo-label">${priorityLabel || "Öne çıkan"}</span>` : ""}
        </div>
        <div class="listing-card-copy">
          <h3 title="${safeFullTitle}">${safeDisplayTitle}</h3>
        </div>
        <div class="card-action-area">
          <div class="job-meta">
            <span class="badge ${timeLabel === "Bugün" ? "hot" : ""}">${timeLabel}</span>
          <span class="badge">${listing.category}</span>
          ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
          ${listing.district ? `<span class="badge">${listing.district}</span>` : ""}
          ${listing.workLocationMode === "remote" ? `<span class="badge">Uzaktan</span>` : ""}
          <span class="badge">${listing.offers} teklif</span>
          ${searchFocused ? `<span class="badge search-focus-badge">Aranan başlık</span>` : ""}
          ${sponsored ? `<span class="badge sponsored-badge">Reklam</span>` : ""}
          ${similar ? `<span class="badge similar-badge">Benzer</span>` : ""}
          ${promoted ? `<span class="badge promo-badge">Renkli ilan</span>` : ""}
        </div>
        </div>
      </a>
    `;
  }

  function renderSimilarListings(category, visibleListings) {
    if (!category || category === "Tümü") return "";

    const visibleIds = new Set(visibleListings.map((listing) => String(listing.id)));
    const selectedGroup = getCategoryGroupTitle(category);
    const sameGroupListings = listings
      .filter((listing) => {
        if (visibleIds.has(String(listing.id))) return false;
        if (isUnavailableListing(listing) || !isApprovedListing(listing)) return false;
        if (listing.category === category) return false;
        const listingGroup = listing.categoryGroup || getCategoryGroupTitle(listing.category);
        return listingGroup === selectedGroup;
      })
      .sort(
        (left, right) =>
          Number(right.carouselPriority || 0) - Number(left.carouselPriority || 0) ||
          Number(right.highlighted || 0) - Number(left.highlighted || 0) ||
          getRecordTimestamp(right) - getRecordTimestamp(left),
      );
    const similarListings = sameGroupListings.slice(0, 6);
    if (similarListings.length < 6) {
      const similarIds = new Set(similarListings.map((listing) => String(listing.id)));
      const fallbackListings = listings
        .filter((listing) => {
          if (visibleIds.has(String(listing.id)) || similarIds.has(String(listing.id))) return false;
          if (isUnavailableListing(listing) || !isApprovedListing(listing)) return false;
          return listing.category !== category;
        })
        .sort(
          (left, right) =>
            Number(right.carouselPriority || 0) - Number(left.carouselPriority || 0) ||
            Number(right.highlighted || 0) - Number(left.highlighted || 0) ||
            getRecordTimestamp(right) - getRecordTimestamp(left),
        )
        .slice(0, 6 - similarListings.length);
      similarListings.push(...fallbackListings);
    }

    if (!similarListings.length) return "";

    return `
      <section class="similar-jobs-section" aria-label="Benzer işler">
        <div class="category-listing-head">
          <h3>Benzer işler</h3>
          <span>${similarListings.length} yakın ilan</span>
        </div>
        <div class="listing-grid similar-jobs-grid">
          ${similarListings.map((listing) => listingCard(listing, false, { similar: true })).join("")}
        </div>
      </section>
    `;
  }

  function getResultSectionTitle() {
    const query = getMarketQueryValue();
    const category = getResolvedCategoryFilterValue();

    if (category !== "Tümü") return `${getCategoryCode(category)} - ${category}`;
    if (query) return `"${query}" araması`;
    if (selectedTime !== "Tümü") return selectedTime;
    return "Seçilen işler";
  }

  function renderCategorizedListings(orderedListings) {
    const category = getResolvedCategoryFilterValue();

    if (category !== "Tümü") {
      const resultHtml = orderedListings.length
        ? `<div class="listing-grid">${orderedListings.map((listing) => listingCard(listing, false, { searchFocused: isSearchFocusedListing(listing) })).join("")}</div>`
        : `<article class="listing-card empty-listing-card"><h3>Sonuç bulunamadı</h3></article>`;
      return resultHtml;
    }

    if (!orderedListings.length) {
      return `<article class="listing-card empty-listing-card"><h3>Sonuç bulunamadı</h3></article>`;
    }

    const groupedListings = new Map();
    orderedListings.forEach((listing) => {
      const groupTitle = listing.category || listing.categoryGroup || "Diğer";
      if (!groupedListings.has(groupTitle)) groupedListings.set(groupTitle, []);
      groupedListings.get(groupTitle).push(listing);
    });

    return [...groupedListings.entries()]
      .map(
        ([groupTitle, groupListings]) => `
          <section class="category-listing-group" aria-label="${escapeHtml(groupTitle)} işleri">
            <div class="category-listing-head">
              <h3>${escapeHtml(groupTitle)}</h3>
              <span>${groupListings.length} ilan</span>
            </div>
            <div class="listing-grid">${groupListings.map((listing) => listingCard(listing, false, { searchFocused: isSearchFocusedListing(listing) })).join("")}</div>
          </section>
        `,
      )
      .join("");
  }

  function renderExploreFeed(orderedListings) {
    if (!orderedListings.length) {
      return `<article class="listing-card empty-listing-card"><h3>Henüz keşfedilecek ilan yok</h3></article>`;
    }

    return `<div class="explore-feed">${orderedListings.map((listing) => listingCard(listing)).join("")}</div>`;
  }

  function getVisibleFeaturedCount() {
    if (window.matchMedia("(max-width: 560px)").matches) return 1;
    if (window.matchMedia("(max-width: 1180px)").matches) return 2;
    return 4;
  }

  function updateFeaturedCarousel() {
    if (!featuredListings) return;

    const visibleCount = getVisibleFeaturedCount();
    const maxIndex = Math.max(0, currentFeatured.length - visibleCount);
    featuredIndex = Math.min(featuredIndex, maxIndex);

    const firstCard = featuredListings.querySelector(".featured-card");
    if (!firstCard) {
      featuredListings.style.transform = "translateX(0)";
      return;
    }

    const gap = Number.parseFloat(getComputedStyle(featuredListings).columnGap) || 0;
    const offset = featuredIndex * (firstCard.getBoundingClientRect().width + gap);
    featuredListings.style.transform = `translateX(-${offset}px)`;
  }

  function moveFeatured(direction) {
    const visibleCount = getVisibleFeaturedCount();
    const maxIndex = Math.max(0, currentFeatured.length - visibleCount);

    if (maxIndex === 0) {
      featuredIndex = 0;
    } else if (direction > 0) {
      featuredIndex = featuredIndex >= maxIndex ? 0 : featuredIndex + 1;
    } else {
      featuredIndex = featuredIndex <= 0 ? maxIndex : featuredIndex - 1;
    }

    updateFeaturedCarousel();
  }

  function restartCarousel() {
    if (!featuredListings) return;
    window.clearInterval(carouselTimer);
    carouselTimer = window.setInterval(() => moveFeatured(1), 3600);
  }

  function renderListings() {
    const orderedListings = getOrderedFilteredListings();
    const shouldShowResults = isCategoryResultsPage || exploreMode;

    currentFeatured = [];
    featuredIndex = 0;

    if (!shouldShowResults) {
      if (categoryResultsSection) categoryResultsSection.hidden = true;
      listingGrid.innerHTML = "";
      updateActiveFilterSummary();
      renderHomeCategories();
      return;
    }

    if (categoryResultsSection) categoryResultsSection.hidden = false;
    if (categoryResultsTitle) categoryResultsTitle.textContent = exploreMode ? "Keşfet" : getResultSectionTitle();
    listingGrid.innerHTML = exploreMode ? renderExploreFeed(orderedListings) : renderCategorizedListings(orderedListings);
    updateActiveFilterSummary();
    updateMarketResultsUrl();
    renderHomeCategories();
  }

  subscribeSharedListings((allListings) => {
    listings = allListings;
    renderListings();
  });

  featuredPrev?.addEventListener("click", () => {
    moveFeatured(-1);
    restartCarousel();
  });

  featuredNext?.addEventListener("click", () => {
    moveFeatured(1);
    restartCarousel();
  });

  featuredCarousel?.addEventListener("mouseenter", () => window.clearInterval(carouselTimer));
  featuredCarousel?.addEventListener("mouseleave", restartCarousel);
  window.addEventListener("resize", updateFeaturedCarousel);
  exploreFeedButton?.addEventListener("click", (event) => {
    event.preventDefault();
    resetMarketFilters({ render: false });
    exploreMode = true;
    renderListings();
    categoryResultsSection?.scrollIntoView({ block: "start" });
  });
  homeCategoryStrip?.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-home-category]");
    if (!categoryButton) return;

    window.location.href = buildMarketFilterUrl({ category: categoryButton.dataset.homeCategory });
  });
  filterToggleButton?.addEventListener("click", () => {
    const expanded = filterToggleButton.getAttribute("aria-expanded") === "true";
    if (expanded) closeMarketFilterPanel();
    else openMarketFilters();
  });
  closeMarketFilters?.addEventListener("click", closeMarketFilterPanel);
  marketFilterBackdrop?.addEventListener("click", closeMarketFilterPanel);
  applyMarketFilters?.addEventListener("click", () => {
    exploreMode = false;
    redirectFiltersToResults();
  });
  profileButton?.addEventListener("click", openProfileDrawer);
  closeProfileDrawer?.addEventListener("click", closeDrawer);
  drawerBackdrop?.addEventListener("click", closeDrawer);
  const profileActionRoutes = {
    "İlan koy": "ilan-koy.html",
    "Profil özelleştir": "profil-duzenle.html",
    "İlanlarım": "ilanlarim.html",
    "Önceki işlerim": "onceki-islerim.html",
    Teklifler: "teklifler.html",
    "Favori ustalar": "favori-ustalar.html",
    "Favori hizmet verenler": "favori-ustalar.html",
    "Ödeme ve güvence": "odeme-guvence.html",
    "Kredi yükle": "kredi-yukle.html",
    "Bildirim ayarları": "bildirim-ayarlari.html",
    "Bildirim geçmişi": "bildirim-gecmisi.html",
    Güvenlik: "guvenlik.html",
    "Admin panel": "admin.html",
  };
  profileDrawer?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-panel-action]");
    if (action) {
      const route = action.dataset.panelHref || profileActionRoutes[action.dataset.panelAction];
      if (route) {
        if (!isRegisteredUser(getUser())) {
          showToast("Bu işlem için önce ücretsiz hesap aç veya giriş yap.");
          window.setTimeout(() => {
            window.location.href = "kayit.html";
          }, 650);
          return;
        }

        window.location.href = route;
        return;
      }

      showToast("Bu buton için hedef sayfa tanımlı değil.");
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (profileDrawer?.classList.contains("open")) {
      closeDrawer();
      return;
    }

    if (notificationPanel && !notificationPanel.hidden) {
      closeNotificationPanel();
      return;
    }

    if (marketFilters && !marketFilters.hidden) {
      closeMarketFilterPanel();
    }
  });

  marketSearch?.addEventListener("input", () => {
    handleMarketFilterDraftChange();
  });
  marketSearch?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    redirectSearchToResults();
  });
  categoryFilterSearch?.addEventListener("input", () => {
    syncCategoryFilterOptions();
    handleMarketFilterDraftChange();
  });
  categoryFilter?.addEventListener("change", () => {
    handleMarketFilterDraftChange();
  });
  syncCategoryFilterOptions();
  populateMarketLocationFilters();
  hydrateMarketFiltersFromUrl();
  [budgetMinFilter, budgetMaxFilter, workModeFilter, districtFilter, offerCountFilter, sortFilter].forEach((input) => {
    input?.addEventListener("input", () => {
      handleMarketFilterDraftChange();
    });
    input?.addEventListener("change", () => {
      handleMarketFilterDraftChange();
    });
  });
  clearMarketFilters?.addEventListener("click", () => {
    exploreMode = false;
    resetMarketFilters();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      exploreMode = false;
      chips.forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      selectedTime = chip.dataset.time;
      handleMarketFilterDraftChange();
    });
  });

  setupProfile();
  setupNotifications();
  setupAdminListingNotifications();
  renderListings();
}

const explorePageFeed = document.querySelector("#explorePageFeed");

if (explorePageFeed) {
  const exploreCurrency = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  });

  function explorePageCard(listing) {
    const imageSrc = getListingImage(listing);
    const title = normalizeListingTitle(listing.title) || "İlan";
    const timeLabel = getTimeLabel(listing.workDate) || listing.time || "Esnek";
    const roleLabel = getListingRoleLabel(listing);
    const location =
      listing.workLocationMode === "remote"
        ? "Uzaktan"
        : [listing.city, listing.district].filter(Boolean).join(" / ") || "Konum yok";
    const detailHref = `ilan-detay.html?id=${encodeURIComponent(String(listing.id))}#listingOfferPanel`;

    return `
      <article class="explore-page-card">
        <a class="explore-page-card-link" href="${detailHref}" aria-label="${escapeHtml(title)} ilanını aç">
          <img src="${imageSrc}" alt="${escapeHtml(title)} ilan görseli" loading="lazy" onerror="this.onerror=null;this.src='assets/listing-placeholder.svg';" />
          <div class="explore-page-card-shade"></div>
          <div class="explore-page-card-content">
            <div class="explore-page-card-top">
              <span class="listing-role-label">${roleLabel}</span>
              <strong>${exploreCurrency.format(Number(listing.budget || 0))}</strong>
            </div>
            <div class="explore-page-card-copy">
              <h2>${escapeHtml(title)}</h2>
              <div class="explore-page-meta">
                <span>${escapeHtml(listing.category || "Kategori")}</span>
                <span>${escapeHtml(timeLabel)}</span>
                <span>${escapeHtml(location)}</span>
              </div>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  function renderExplorePageFeed() {
    const listings = getAllListings()
      .filter((listing) => isApprovedListing(listing) && !isUnavailableListing(listing))
      .sort(
        (left, right) =>
          Number(right.carouselPriority || 0) - Number(left.carouselPriority || 0) ||
          getRecordTimestamp(right) - getRecordTimestamp(left),
      );

    explorePageFeed.innerHTML = listings.length
      ? listings.map(explorePageCard).join("")
      : `<section class="explore-empty"><h1>Keşfedilecek ilan yok</h1></section>`;
  }

  renderExplorePageFeed();
  subscribeSharedListings(renderExplorePageFeed);
}

function accountListingCard(listing, passive = false) {
  const imageSrc = getListingImage(listing);
  const assigned = isAssignedListing(listing);
  const completed = isCompletedListing(listing);
  const status = completed ? "Tamamlandı" : assigned ? "Usta atandı" : passive ? "Pasif" : "Aktif";
  const assignedMaster = listing.assignedMaster || listing.master || {};
  const canComplete = assigned && !completed && isApprovedListing(listing);
  const canEdit = !assigned && !completed;
  const displayTitle = normalizeListingTitle(listing.title) || "Ilan";
  const safeDisplayTitle = escapeHtml(displayTitle);
  const safeFullTitle = escapeHtml(listing.title || displayTitle);
  const roleLabel = getListingRoleLabel(listing);

  return `
    <article class="listing-card ${listing.highlighted ? "colored-listing" : ""} ${passive || completed || !isApprovedListing(listing) ? "passive-listing" : ""} ${assigned ? "assigned-listing" : ""}"${getHighlightStyle(listing)}>
      <div class="listing-top">
        <span class="badge ${passive || assigned || completed || !isApprovedListing(listing) ? "" : "hot"}">${getListingStatusLabel(listing)}</span>
        <strong class="budget">${Number(listing.budget || 0).toLocaleString("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        })}</strong>
      </div>
      <div class="listing-photo">
        <img src="${imageSrc}" alt="${listing.title} ilan fotoğrafı" loading="lazy" onerror="this.onerror=null;this.src='assets/listing-placeholder.svg';" />
        <span class="listing-role-label">${roleLabel}</span>
      </div>
      <div class="listing-card-copy">
        <h3 title="${safeFullTitle}">${safeDisplayTitle}</h3>
      </div>
      <div class="card-action-area">
        <div class="job-meta">
          <span class="badge">${listing.category}</span>
          ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
          ${listing.district ? `<span class="badge">${listing.district}</span>` : ""}
          ${listing.workLocationMode === "remote" ? `<span class="badge">Uzaktan</span>` : ""}
          <span class="badge">${getTimeLabel(listing.workDate)}</span>
        </div>
        <div class="listing-bottom">
          <span class="badge">${listing.offers || 0} teklif</span>
          ${canEdit ? `<a class="edit-listing-action" href="ilan-koy.html?edit=${encodeURIComponent(String(listing.id))}">Düzenle</a>` : ""}
          ${assigned ? `<span class="badge assigned-badge">${assignedMaster.name || "Usta atandı"}</span>` : ""}
          ${canComplete ? `<button class="finish-job-action" type="button" data-complete-listing="${listing.id}">İşi bitir</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

const myListingsGrid = document.querySelector("#myListingsGrid");
if (myListingsGrid) {
  const completionBackdrop = document.createElement("div");
  completionBackdrop.className = "completion-backdrop";
  completionBackdrop.hidden = true;
  completionBackdrop.innerHTML = `
    <section class="completion-panel" role="dialog" aria-modal="true" aria-labelledby="completionTitle">
      <button class="close-button" type="button" data-close-completion aria-label="İş kapatma panelini kapat">×</button>
      <div class="completion-content"></div>
    </section>
  `;
  document.body.appendChild(completionBackdrop);
  const completionContent = completionBackdrop.querySelector(".completion-content");
  let completionListing = null;

  function closeCompletionDialog() {
    completionBackdrop.classList.remove("open");
    window.setTimeout(() => {
      completionBackdrop.hidden = true;
    }, 160);
  }

  function openCompletionDialog(listing) {
    completionListing = listing;
    const master = getAssignedMasterInfo(listing);
    completionContent.innerHTML = `
      <div class="completion-head">
        <p class="eyebrow">İşi kapat</p>
        <h2 id="completionTitle">${listing.title}</h2>
      </div>
      <form class="offer-form completion-form" id="completionForm">
        <label class="score-control">
          <span>Usta puanı</span>
          <input name="rating" type="number" min="1" max="10" step="1" value="10" required />
          <small>/10</small>
        </label>
        <label class="favorite-master-toggle">
          <input name="favoriteMaster" type="checkbox" value="1" checked />
          <span>
            <strong>${master.name} favori ustalarıma eklensin</strong>
          </span>
        </label>
        <button class="primary-action" type="submit">İşi kapat ve puanla</button>
      </form>
    `;
    completionBackdrop.hidden = false;
    window.requestAnimationFrame(() => completionBackdrop.classList.add("open"));
  }

  function renderMyListings() {
    const listings = getMyListings();
    myListingsGrid.innerHTML = listings.length
      ? listings.map((listing) => accountListingCard(listing, isExpiredListing(listing))).join("")
      : `<article class="listing-card"><h3>${myListingsGrid.dataset.empty}</h3></article>`;
  }

  myListingsGrid.addEventListener("click", async (event) => {
    const completeButton = event.target.closest("[data-complete-listing]");
    if (!completeButton) return;

    const listingId = completeButton.dataset.completeListing;
    const listing = getMyListings().find((item) => String(item.id) === String(listingId));
    if (!listing) return;
    openCompletionDialog(listing);
  });

  completionBackdrop.addEventListener("click", (event) => {
    if (event.target === completionBackdrop || event.target.closest("[data-close-completion]")) {
      closeCompletionDialog();
    }
  });

  completionBackdrop.addEventListener("submit", async (event) => {
    const form = event.target.closest("#completionForm");
    if (!form || !completionListing) return;

    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const ratingScore = Number(formData.get("rating"));
    const favoriteMaster = formData.get("favoriteMaster") === "1";
    const assignedMaster = getAssignedMasterInfo(completionListing);

    if (!ratingScore || ratingScore < 1 || ratingScore > 10) {
      showToast("Usta puanı 1 ile 10 arasında olmalı.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Kapatılıyor...";
    }

    saveRating(completionListing.id, {
      score: ratingScore,
      target: "assignedMaster",
      masterKey: assignedMaster.key,
      masterName: assignedMaster.name,
      favoriteMaster,
      completedAt: new Date().toISOString(),
    });

    if (favoriteMaster) {
      saveFavoriteMasterLocally(assignedMaster, completionListing, ratingScore);
    }

    applyListingCompletionLocally(completionListing.id, { ratingScore, favoriteMaster });

    try {
      if (favoriteMaster) {
        try {
          await publishFavoriteMaster(assignedMaster, completionListing, ratingScore);
        } catch (favoriteError) {
          console.warn("Favori usta Firestore'a yazılamadı:", favoriteError);
        }
      }
      await publishListingCompletionToFirestore(completionListing.id, { ratingScore, favoriteMaster });
      showToast(favoriteMaster ? "İş kapatıldı, usta puanlandı ve favorilere eklendi." : "İş kapatıldı ve usta puanlandı.");
      closeCompletionDialog();
    } catch (error) {
      console.warn("İş tamamlama Firestore'a yazılamadı:", error);
      showToast(`İş yerelde kapatıldı. ${getFirestoreErrorMessage(error)}`);
      closeCompletionDialog();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "İşi kapat ve puanla";
      }
    }
  });

  renderMyListings();
  subscribeSharedListings(renderMyListings);
}

const pastJobsGrid = document.querySelector("#pastJobsGrid");
if (pastJobsGrid) {
  function renderPastJobs() {
    const expiredListings = getMyListings().filter((listing) => isExpiredListing(listing) || isCompletedListing(listing));
    pastJobsGrid.innerHTML = expiredListings.length
      ? expiredListings.map((listing) => accountListingCard(listing, true)).join("")
      : `<article class="listing-card"><h3>${pastJobsGrid.dataset.empty}</h3></article>`;
  }

  renderPastJobs();
  subscribeSharedListings(renderPastJobs);
}

const listingDetail = document.querySelector("#listingDetail");
if (listingDetail) {
  const params = new URLSearchParams(window.location.search);
  const listingId = params.get("id");
  let listing = getAllListings().find((item) => String(item.id) === String(listingId));
  let activeListing = listing || null;
  let lastAlreadyOfferedState = null;

  function renderMissingListing() {
    listingDetail.innerHTML = `
      <section class="detail-empty">
        <p class="eyebrow">İlan bulunamadı</p>
        <h1>Bu ilan yayından kalkmış olabilir.</h1>
        <a class="detail-back-link" href="pazar.html">İlanlara dön</a>
      </section>
    `;
  }

  function renderListingTimeline(listing) {
    const steps = [
      {
        label: "Admin onayı",
        active: isApprovedListing(listing) || isPendingModerationListing(listing) || isRejectedModerationListing(listing),
        current: isPendingModerationListing(listing),
        meta: isPendingModerationListing(listing) ? "Kontrolde" : isRejectedModerationListing(listing) ? "Reddedildi" : "Tamam",
      },
      {
        label: "Yayında",
        active: isApprovedListing(listing),
        current: isApprovedListing(listing) && !Number(listing.offers || 0) && !isAssignedListing(listing),
        meta: isApprovedListing(listing) ? "Görünür" : "Bekliyor",
      },
      {
        label: "Teklifler",
        active: Number(listing.offers || 0) > 0 || isAssignedListing(listing) || isCompletedListing(listing),
        current: Number(listing.offers || 0) > 0 && !isAssignedListing(listing),
        meta: `${Number(listing.offers || 0)} teklif`,
      },
      {
        label: "Usta seçimi",
        active: isAssignedListing(listing) || isCompletedListing(listing),
        current: isAssignedListing(listing) && !isCompletedListing(listing),
        meta: isAssignedListing(listing) ? "Atandı" : "Bekliyor",
      },
      {
        label: "Tamamlandı",
        active: isCompletedListing(listing),
        current: isCompletedListing(listing),
        meta: isCompletedListing(listing) ? "Kapandı" : "Bekliyor",
      },
    ];

    return `
      <section class="status-timeline" aria-label="İlan durumu">
        ${steps
          .map(
            (step) => `
              <div class="status-step ${step.active ? "active" : ""} ${step.current ? "current" : ""}">
                <span></span>
                <strong>${step.label}</strong>
                <small>${step.meta}</small>
              </div>
            `,
          )
          .join("")}
      </section>
    `;
  }

  function renderListingDetail(listing) {
    if (!canViewListingDetail(listing)) {
      renderMissingListing();
      return;
    }

    activeListing = listing;
    const imageSrc = getListingImage(listing);
    const inactive = isUnavailableListing(listing);
    const assigned = isAssignedListing(listing);
    const statusLabel = getListingStatusLabel(listing);
    const owner = listing.owner || { name: "İş veren", rating: 10, reviewCount: 0 };
    const master = listing.assignedMaster || listing.master || { name: "Usta atanmadı", rating: 0, reviewCount: 0 };
    const savedRating = getStoredRatings()[listing.id];
    const canRevealListingPhone = assigned && Boolean(listing.phone);
    const canRateListing = isListingAssignedToCurrentUser(listing);
    const registeredUser = isRegisteredUser(getCurrentUser());
    const alreadyOffered = registeredUser && hasAccountOfferedToListing(listing.id);
    const canEditListing = isListingOwnedByUser(listing) && !assigned && !isCompletedListing(listing);
    lastAlreadyOfferedState = alreadyOffered;
    const tagBadges = renderTagBadges(listing.tags, 8);

    listingDetail.innerHTML = `
      <div class="detail-toolbar">
        <a class="detail-back-link" href="pazar.html">
          <span aria-hidden="true">‹</span>
          İlanlara dön
        </a>
        <span class="detail-status ${inactive ? "passive" : ""} ${assigned ? "assigned" : ""}">${statusLabel}</span>
      </div>

      <section class="detail-hero">
        <div class="detail-photo">
          <img src="${imageSrc}" alt="${listing.title} ilan fotoğrafı" onerror="this.onerror=null;this.src='assets/listing-placeholder.svg';" />
        </div>
        <div class="detail-copy">
          <p class="eyebrow">${listing.category}</p>
          <h1>${listing.title}</h1>
          <p>${listing.details}</p>
          ${tagBadges}
          <div class="detail-meta">
            <span class="badge ${getTimeLabel(listing.workDate) === "Bugün" ? "hot" : ""}">${getTimeLabel(listing.workDate)}</span>
            <span class="badge">${listing.category}</span>
            ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
            ${listing.district ? `<span class="badge">${listing.district}</span>` : ""}
            ${listing.workLocationMode === "remote" ? `<span class="badge">Uzaktan</span>` : ""}
            <span class="badge">${listing.offers || 0} teklif</span>
          </div>
          <div class="rating-strip">
            <div>
              <span>İlan sahibi</span>
              <strong>${owner.name}</strong>
              <div class="stars">${getRatingStars(owner.rating)}</div>
              <small>${owner.rating}/10 · ${owner.reviewCount} değerlendirme</small>
            </div>
            <div>
              <span>Hizmet veren puanı</span>
              <strong>${master.name}</strong>
              <div class="stars">${getRatingStars(master.rating)}</div>
              <small>${assigned ? "Hizmet veren atandı" : master.rating ? `${master.rating}/10 · ${master.reviewCount} değerlendirme` : "Henüz atanmadı"}</small>
            </div>
          </div>
          <strong class="detail-budget">${Number(listing.budget || 0).toLocaleString("tr-TR", {
            style: "currency",
            currency: "TRY",
            maximumFractionDigits: 0,
          })}</strong>
          <div class="detail-primary-actions">
            ${canEditListing ? `<a class="ghost-link" href="ilan-koy.html?edit=${encodeURIComponent(String(listing.id))}">İlanı düzenle</a>` : ""}
            ${!inactive && !alreadyOffered ? `<a class="ghost-link" href="${registeredUser ? "#detailOfferForm" : "#registerToOffer"}">${registeredUser ? "Talep alanına git" : "Teklif için kayıt ol"}</a>` : ""}
            ${alreadyOffered ? `<span class="ghost-link disabled-link">Teklifin alındı</span>` : ""}
            ${canRevealListingPhone ? `<a class="ghost-link phone-action" href="tel:${listing.phone}">Ara</a>` : `<span class="ghost-link disabled-link">Telefon gizli</span>`}
          </div>
        </div>
      </section>

      ${renderListingTimeline(listing)}

      <section class="detail-grid">
        <article class="detail-panel">
          <h2>İlan bilgileri</h2>
          <dl class="detail-list">
            <div><dt>Telefon</dt><dd>${canRevealListingPhone ? listing.phone : "Hizmet veren atanınca paylaşılır"}</dd></div>
            <div><dt>İş tarihi</dt><dd>${listing.workDate ? new Date(`${listing.workDate}T00:00:00`).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }) : "Esnek"}</dd></div>
            <div><dt>Tahmini süre</dt><dd>${listing.duration || "Belirtilmedi"}</dd></div>
            <div><dt>Malzeme</dt><dd>${listing.materials || "Belirtilmedi"}</dd></div>
            <div><dt>Konum</dt><dd>${listing.workLocationMode === "remote" ? "Uzaktan çalışma" : [listing.city, listing.district].filter(Boolean).join(" / ") || "Belirtilmedi"}</dd></div>
            <div><dt>Çalışma şekli</dt><dd>${listing.workLocationMode === "remote" ? "Uzaktan çalışma" : "Yakından çalışma"}</dd></div>
            <div><dt>Adres notu</dt><dd>${listing.workLocationMode === "remote" ? "Uzaktan çalışma için adres gerekmiyor" : listing.addressNote || "Paylaşılmadı"}</dd></div>
            <div><dt>Beklentiler</dt><dd>${listing.expectations || "Paylaşılmadı"}</dd></div>
            <div><dt>Durum</dt><dd>${statusLabel}</dd></div>
          </dl>
        </article>

        <article class="detail-panel offer-panel" id="listingOfferPanel">
          ${
            registeredUser
              ? alreadyOffered
                ? `
                <div class="guest-offer-panel">
                  <p class="eyebrow">Teklif durumu</p>
                  <h2>Bu ilana teklifin alındı.</h2>
                  <div class="guest-offer-actions">
                    <a class="primary-action" href="teklifler.html?filter=sent">Tekliflerime git</a>
                  </div>
                </div>
              `
                : `
                <h2>Talep gönder</h2>
                <form class="offer-form" id="detailOfferForm">
                  <label>
                    Teklif tutarı
                    <input name="amount" type="number" min="500" step="100" placeholder="Örn. 2500" ${inactive ? "disabled" : "required"} />
                  </label>
                  <label>
                    Mesaj
                    <textarea name="message" rows="5" placeholder="Ne zaman gelebileceğini ve işi nasıl yapacağını yaz." ${inactive ? "disabled" : "required"}></textarea>
                  </label>
                  <button class="primary-action" type="submit" ${inactive ? "disabled" : ""}>Talebi gönder</button>
                </form>
              `
              : `
                <div class="guest-offer-panel" id="registerToOffer">
                  <p class="eyebrow">Teklif göndermek için</p>
                  <h2>Önce ücretsiz hesap aç.</h2>
                  <div class="guest-offer-actions">
                    <a class="primary-action" href="usta-kayit.html">Hizmet veren olarak kayıt ol</a>
                    <a class="ghost-link" href="giris.html">Giriş yap</a>
                  </div>
                </div>
              `
          }
        </article>

        ${canRateListing ? `
        <article class="detail-panel rating-panel">
          <div class="rating-panel-head">
            <div>
              <h2>İş sonu puanlama</h2>
            </div>
            ${savedRating ? `<span class="rating-status-pill">Puan verildi</span>` : ""}
          </div>
          <form class="offer-form rating-form" id="ratingForm">
            <label class="score-control">
              <span>Puan</span>
              <input name="rating" type="number" min="1" max="10" step="1" value="${savedRating?.score || 10}" required />
              <small>/10</small>
            </label>
            <button class="primary-action" type="submit">Puanı kaydet</button>
          </form>
          ${savedRating ? `<div class="saved-rating"><strong>Verilen puan: ${savedRating.score}/10</strong></div>` : ""}
        </article>
        ` : ""}
      </section>
    `;

    if (window.location.hash === "#listingOfferPanel" || window.location.hash === "#detailOfferForm") {
      requestAnimationFrame(() => {
        listingDetail.querySelector("#listingOfferPanel")?.scrollIntoView({ block: "start" });
      });
    }
  }

  if (!listingDetail.dataset.formsBound) {
    listingDetail.dataset.formsBound = "true";

    listingDetail.addEventListener("submit", async (event) => {
      const offerForm = event.target.closest("#detailOfferForm");
      if (offerForm && activeListing) {
        event.preventDefault();

        const submitButton = offerForm.querySelector('button[type="submit"]');
        const formData = new FormData(offerForm);
        const user = getCurrentUser();
        const offerId = Date.now();
        const createdAt = new Date().toISOString();
        const amount = Number(formData.get("amount"));
        const message = formData.get("message").trim();
        const requesterName = user.fullName || user.profession || "Bir hizmet veren";
        const requesterKey = getAccountKey(user);
        const requesterKeys = new Set(getAccountAliases(user));
        const ownerKey = resolveListingOwnerKey(activeListing);
        const isOwnListing = isListingOwnedByUser(activeListing, user);

        if (!isRegisteredUser(user)) {
          showToast("Teklif göndermek için önce hizmet veren hesabı aç veya giriş yap.");
          window.setTimeout(() => {
            window.location.href = "kayit.html";
          }, 700);
          return;
        }

        if (isOwnListing) {
          showToast("Kendi ilanına teklif gönderemezsin.");
          return;
        }

        if (isAssignedListing(activeListing)) {
          showToast("Bu ilana hizmet veren atandı, yeni teklif alınmıyor.");
          return;
        }

        if (!isApprovedListing(activeListing)) {
          showToast("Bu ilan admin onayından geçmeden teklif alamaz.");
          return;
        }

        if (hasAccountOfferedToListing(activeListing.id, user)) {
          showToast("Bu ilana zaten teklif gönderdin.");
          renderListingDetail(activeListing);
          return;
        }

        const requesterFavoriteCount = await getRemoteMasterFavoriteCount({
          key: requesterKey,
          uid: user.uid,
          email: user.email,
          name: requesterName,
        });
        const requesterWorkStats = getCompletedMasterStats({
          requesterKey,
          requesterUid: user.uid,
          requesterEmail: user.email,
          requesterName,
        });

        const sentOffer = {
          id: `${offerId}-sent`,
          listingId: activeListing.id,
          listingTitle: activeListing.title,
          amount,
          message,
          type: "sent",
          status: "Gönderildi",
          requesterKey,
          requesterUid: user.uid || "",
          requesterEmail: user.email || "",
          requesterKeys: [...requesterKeys],
          ownerKey,
          ownerUid: activeListing.ownerUid || activeListing.owner?.uid || "",
          ownerEmail: getListingOwnerEmail(activeListing),
          requesterName,
          requesterProfession: user.profession || `${activeListing.category || "Genel"} uzmanı`,
          requesterPhone: user.phone || "",
          requesterCity: user.city || activeListing.city || "",
          requesterDistrict: user.district || activeListing.district || "",
          requesterRating: requesterWorkStats.rating,
          requesterReviewCount: requesterWorkStats.reviewCount,
          requesterCompletedJobs: requesterWorkStats.completedJobs,
          requesterStatsSource: "completedListings",
          createdAt,
          requesterFavoriteCount,
        };
        const ownerOffer = {
          ...sentOffer,
          id: offerId,
          type: "incoming",
          status: "Yeni",
        };

        try {
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Gönderiliyor...";
          }

          if (!sentOffer.requesterUid) {
            const authUser = await ensureFirestoreAuth();
            requesterKeys.add(authUser.uid);
            sentOffer.requesterUid = authUser.uid;
            sentOffer.requesterKeys = [...requesterKeys];
            ownerOffer.requesterUid = authUser.uid;
            ownerOffer.requesterKeys = [...requesterKeys];
          }

          if (hasAccountOfferedToListing(activeListing.id, { ...user, uid: sentOffer.requesterUid })) {
            showToast("Bu ilana zaten teklif gönderdin.");
            renderListingDetail(activeListing);
            return;
          }

          await publishOffersToFirestore(sentOffer, ownerOffer);
          saveOffer(sentOffer);
          saveOffer(ownerOffer);
          applyListingOfferCountLocally(activeListing.id, 1);

          try {
            await publishListingOfferCountToFirestore(activeListing.id);
          } catch (countError) {
            console.warn("İlan teklif sayısı Firestore'da güncellenemedi:", countError);
          }

          await publishOwnerNotification(
            buildOfferOwnerNotification(ownerOffer, requesterName, activeListing.title, amount, activeListing),
            activeListing,
          );

          offerForm.reset();
          showToast("Teklif gönderildi. İlan sahibine bildirim düştü.");
          renderListingDetail(activeListing);
        } catch (error) {
          console.warn("Teklif gönderilemedi:", error);
          showToast(`Teklif gönderilemedi. ${getFirestoreErrorMessage(error)}`);
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Talebi gönder";
          }
        }
        return;
      }

      const ratingForm = event.target.closest("#ratingForm");
      if (ratingForm && activeListing) {
        event.preventDefault();
        if (!isListingAssignedToCurrentUser(activeListing)) {
          showToast("Puanlamayı sadece atanan usta yapabilir.");
          return;
        }

        const formData = new FormData(ratingForm);
        saveRating(activeListing.id, {
          score: Number(formData.get("rating")),
          completedAt: new Date().toISOString(),
        });
        showToast("Puan kaydedildi.");
      }
    });
  }

  subscribeOfferFeed(() => {
    if (!activeListing) return;

    const alreadyOffered = isRegisteredUser(getCurrentUser()) && hasAccountOfferedToListing(activeListing.id);
    if (alreadyOffered !== lastAlreadyOfferedState) {
      renderListingDetail(activeListing);
    }
  });

  subscribeSharedListings((allListings) => {
    if (!listingId) return;

    const sharedListing = allListings.find((item) => String(item.id) === String(listingId));
    if (!sharedListing) return;

    listing = sharedListing;
    renderListingDetail(listing);
  });

  (async () => {
    if (!listing && listingId) {
      listingDetail.innerHTML = `
        <section class="detail-empty">
          <p class="eyebrow">İlan yükleniyor</p>
          <h1>Ortak ilan akışı kontrol ediliyor.</h1>
        </section>
      `;
      listing = await getRemoteListing(listingId);
      if (listing) {
        remoteListings = [listing, ...remoteListings.filter((item) => String(item.id) !== String(listing.id))];
        notifySharedListingListeners();
      }
    }

    if (!listing) renderMissingListing();
    else renderListingDetail(listing);
  })();
}

function getOfferMasterProfile(offer) {
  const listing = getAllListings().find((item) => String(item.id) === String(offer.listingId)) || {};
  const listingMaster = listing.master || {};
  const masterKey = getMasterStatKey({
    requesterKey: offer.requesterKey,
    requesterUid: offer.requesterUid,
    requesterEmail: offer.requesterEmail,
    requesterName: offer.requesterName,
  });
  const hasRequesterIdentity = Boolean(offer.requesterKey || offer.requesterUid || offer.requesterEmail);
  const completedStats = hasRequesterIdentity
    ? getCompletedMasterStats({
        requesterKey: offer.requesterKey,
        requesterUid: offer.requesterUid,
        requesterEmail: offer.requesterEmail,
        requesterName: offer.requesterName,
      })
    : null;
  const rating = hasRequesterIdentity
    ? completedStats.rating
    : Number(offer.requesterRating || listingMaster.rating || 0);
  const reviewCount = hasRequesterIdentity
    ? completedStats.reviewCount
    : Number(offer.requesterReviewCount || listingMaster.reviewCount || 0);
  const completedJobs = hasRequesterIdentity
    ? completedStats.completedJobs
    : Number(offer.requesterCompletedJobs || listingMaster.completedJobs || 0);

  return {
    name: offer.requesterName || listingMaster.name || "Usta profili",
    profession: offer.requesterProfession || `${listing.category || "Genel"} uzmanı`,
    rating,
    reviewCount,
    favoriteCount: Number(offer.requesterFavoriteCount || getLocalMasterFavoriteCount(masterKey) || 0),
    phone: offer.requesterPhone || "",
    location: [offer.requesterCity, offer.requesterDistrict].filter(Boolean).join(" / ") ||
      [listing.city, listing.district].filter(Boolean).join(" / ") ||
      "Konum paylaşılmadı",
    completedJobs,
    verified: offer.requesterVerified !== false,
  };
}

function offerCard(offer) {
  const isIncoming = offer.type === "incoming";
  const isAcceptedIncoming = isIncoming && offer.status === "Kabul edildi";
  const masterProfile = isIncoming ? getOfferMasterProfile(offer) : null;
  const canCancelSentOffer = offer.type === "sent" && !["Kabul edildi", "Reddedildi", "İptal edildi"].includes(offer.status);
  return `
    <article class="offer-card" data-offer-type="${offer.type || "sent"}">
      <div class="offer-card-head">
        <div>
          <span class="badge ${offer.status === "Kabul edildi" ? "hot" : ""}">${offer.status || "Gönderildi"}</span>
          <h3>${offer.listingTitle}</h3>
        </div>
        <strong>${Number(offer.amount || 0).toLocaleString("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        })}</strong>
      </div>
      <p>${offer.message || "Mesaj eklenmedi."}</p>
      <div class="job-meta">
        <span class="badge">${offer.type === "incoming" ? "Gelen teklif" : "Gönderilen teklif"}</span>
        <span class="badge">${new Date(offer.createdAt).toLocaleDateString("tr-TR")}</span>
        ${isIncoming ? `<span class="badge favorite-count-badge">${masterProfile.favoriteCount || 0} favori</span>` : ""}
      </div>
      <div class="listing-bottom">
        <a class="ghost-link" href="ilan-detay.html?id=${offer.listingId}">İlana git</a>
        ${
          isIncoming
            ? `<button class="job-action ${isAcceptedIncoming ? "assigned-master-button" : ""}" type="button" data-master-review="${offer.id}">${isAcceptedIncoming ? "Usta atandı" : "Ustayı incele"}</button>`
            : `${canCancelSentOffer ? `<button class="danger-action" type="button" data-cancel-offer="${offer.id}">Teklifi iptal et</button>` : ""}`
        }
      </div>
    </article>
  `;
}

if (offersList) {
  const offerComparisonPanel = document.querySelector("#offerComparisonPanel");
  const sampleOffers = [
    {
      id: "sample-1",
      listingId: 1,
      listingTitle: "2+1 ev boya badana",
      amount: 4600,
      message: "Malzeme hazırsa aynı gün başlayabilirim.",
      type: "incoming",
      status: "Yeni",
      requesterName: "Ali K.",
      requesterProfession: "Boya ve tadilat ustası",
      requesterPhone: "0532 440 18 22",
      requesterCity: "İstanbul",
      requesterDistrict: "Kadıköy",
      requesterRating: 9.4,
      requesterReviewCount: 26,
      requesterCompletedJobs: 41,
      createdAt: new Date().toISOString(),
    },
  ];
  sampleOffers.length = 0;
  const currentUser = getCurrentUser();
  const currentOfferAccountKey = getAccountKey(currentUser);
  const currentOfferUid = currentUser.uid || "";
  let offers = [
    ...getStoredOffers().filter((offer) =>
      isOfferVisibleForAccount(offer, currentOfferAccountKey, currentUser),
    ),
    ...sampleOffers,
  ];
  const initialOfferFilter = new URLSearchParams(window.location.search).get("filter") || "all";

  function mergeVisibleOffers() {
    const offerMap = new Map();
    [
      ...getStoredOffers().filter((offer) =>
        isOfferVisibleForAccount(offer, currentOfferAccountKey, currentUser),
      ),
      ...sampleOffers,
      ...remoteOffers.filter(
        (offer) => isAfterDataReset(offer) && isOfferVisibleForAccount(offer, currentOfferAccountKey, currentUser),
      ),
    ].forEach((offer) => {
      offerMap.set(String(offer.id), offer);
    });
    offers = [...offerMap.values()];
  }
  const masterReviewBackdrop = document.createElement("div");
  masterReviewBackdrop.className = "master-review-backdrop";
  masterReviewBackdrop.hidden = true;
  masterReviewBackdrop.innerHTML = `
    <section class="master-review-panel" role="dialog" aria-modal="true" aria-labelledby="masterReviewTitle">
      <button class="close-button" type="button" data-close-master-review aria-label="Usta inceleme panelini kapat">×</button>
      <div id="masterReviewContent"></div>
    </section>
  `;
  document.body.appendChild(masterReviewBackdrop);
  const masterReviewContent = masterReviewBackdrop.querySelector("#masterReviewContent");

  function closeMasterReview() {
    masterReviewBackdrop.classList.remove("open");
    window.setTimeout(() => {
      masterReviewBackdrop.hidden = true;
    }, 160);
  }

  function openMasterReview(offer) {
    const master = getOfferMasterProfile(offer);
    const isAccepted = offer.status === "Kabul edildi";
    const visibleMasterPhone = isAccepted && master.phone ? master.phone : "";
    const amount = Number(offer.amount || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    });

    masterReviewContent.innerHTML = `
      <div class="master-review-head">
        <div class="master-review-avatar">${master.name.slice(0, 2).toLocaleUpperCase("tr-TR")}</div>
        <div>
          <p class="eyebrow">Usta profili</p>
          <h2 id="masterReviewTitle">${master.name}</h2>
          <span>${master.profession}</span>
        </div>
      </div>

      <div class="master-score-row">
        <div>
          <strong>${master.rating.toFixed(1)}/10</strong>
          <div class="stars">${getRatingStars(master.rating)}</div>
          <small>${master.reviewCount} değerlendirme</small>
        </div>
        <div>
          <strong>${master.completedJobs}</strong>
          <small>Tamamlanan iş</small>
        </div>
        <div>
          <strong>${master.favoriteCount || 0}</strong>
          <small>Favorileyen iş veren</small>
        </div>
        <div>
          <strong>${master.verified ? "Doğrulandı" : "Bekliyor"}</strong>
          <small>Telefon / profil</small>
        </div>
      </div>

      <dl class="master-review-list">
        <div><dt>Konum</dt><dd>${master.location}</dd></div>
        <div><dt>Telefon</dt><dd>${visibleMasterPhone || "Kabulden sonra paylaşılır"}</dd></div>
        <div><dt>Teklif</dt><dd>${amount}</dd></div>
        <div><dt>İlan</dt><dd>${offer.listingTitle}</dd></div>
      </dl>

      <div class="master-message-box">
        <strong>Ustanın mesajı</strong>
        <p>${offer.message || "Mesaj eklenmedi."}</p>
      </div>

      <div class="master-review-actions">
        <a class="ghost-link" href="ilan-detay.html?id=${offer.listingId}">İlana git</a>
        ${
          isAccepted
            ? `<span class="assigned-master-pill">Usta atandı</span>`
            : `<button class="danger-action" type="button" data-reject-offer="${offer.id}">Reddet</button>
        <button class="primary-action" type="button" data-accept-offer="${offer.id}">Uygun gör ve kabul et</button>`
        }
      </div>
    `;

    masterReviewBackdrop.hidden = false;
    window.requestAnimationFrame(() => masterReviewBackdrop.classList.add("open"));
  }

  function renderOfferComparison(activeOffers) {
    if (!offerComparisonPanel) return;
    const incomingOffers = activeOffers
      .filter((offer) => offer.type === "incoming")
      .sort((left, right) => Number(left.amount || 0) - Number(right.amount || 0));

    if (!incomingOffers.length) {
      offerComparisonPanel.innerHTML = "";
      return;
    }

    const minAmount = Math.min(...incomingOffers.map((offer) => Number(offer.amount || 0)));
    const maxRating = Math.max(...incomingOffers.map((offer) => getOfferMasterProfile(offer).rating));
    const listingCount = new Set(incomingOffers.map((offer) => String(offer.listingId))).size;

    offerComparisonPanel.innerHTML = `
      <div class="offer-comparison-head">
        <div>
          <p class="eyebrow">Teklif karşılaştırma</p>
          <h2>${incomingOffers.length} teklif · ${listingCount} ilan</h2>
        </div>
      </div>
      <div class="offer-comparison-table">
        ${incomingOffers
          .slice(0, 8)
          .map((offer) => {
            const master = getOfferMasterProfile(offer);
            const amount = Number(offer.amount || 0);
            return `
              <article class="offer-comparison-row">
                <div>
                  <strong>${escapeHtml(master.name)}</strong>
                  <span>${escapeHtml(offer.listingTitle || "İlan")}</span>
                </div>
                <span>${amount.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  maximumFractionDigits: 0,
                })}</span>
                <span>${master.rating.toFixed(1)}/10</span>
                <span>${master.completedJobs} iş</span>
                <div class="offer-comparison-actions">
                  ${amount === minAmount ? `<small>En uygun</small>` : ""}
                  ${master.rating === maxRating ? `<small>En yüksek puan</small>` : ""}
                  <button class="ghost-action" type="button" data-master-review="${offer.id}">İncele</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderOffers(filter = "all") {
    mergeVisibleOffers();
    const activeOffers = offers.filter((offer) => !(offer.type === "incoming" && offer.status === "Reddedildi"));
    const filtered = filter === "all" ? activeOffers : activeOffers.filter((offer) => offer.type === filter);
    renderOfferComparison(filter === "sent" ? [] : activeOffers);
    offersList.innerHTML = filtered.length
      ? filtered.map(offerCard).join("")
      : `<article class="offer-card"><h3>Teklif yok</h3></article>`;
  }

  offerComparisonPanel?.addEventListener("click", (event) => {
    const reviewButton = event.target.closest("[data-master-review]");
    if (!reviewButton) return;
    const offer = offers.find((item) => String(item.id) === reviewButton.dataset.masterReview);
    if (offer) openMasterReview(offer);
  });

  document.querySelectorAll("[data-offer-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-offer-filter]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderOffers(button.dataset.offerFilter);
    });
  });

  offersList.addEventListener("click", async (event) => {
    const reviewButton = event.target.closest("[data-master-review]");
    if (reviewButton) {
      const offer = offers.find((item) => String(item.id) === reviewButton.dataset.masterReview);
      if (offer) openMasterReview(offer);
      return;
    }

    const cancelButton = event.target.closest("[data-cancel-offer]");
    if (!cancelButton) return;

    const offer = offers.find((item) => String(item.id) === String(cancelButton.dataset.cancelOffer));
    if (!offer) return;

    offers = offers.map((item) =>
      String(item.id) === String(offer.id)
        ? { ...item, status: "İptal edildi", canceledAt: new Date().toISOString(), updatedAt: Date.now() }
        : item,
    );
    saveVisibleOffersForAccount(offers, currentOfferAccountKey);
    try {
      await cancelOfferForAccount(offer);
    } catch (error) {
      console.warn("Teklif iptali Firestore'a yazılamadı:", error);
    }
    renderOffers(document.querySelector("[data-offer-filter].active").dataset.offerFilter);
    showToast("Teklif iptal edildi. Teklif hakkın tekrar açıldı.");
  });

  masterReviewBackdrop.addEventListener("click", async (event) => {
    if (event.target === masterReviewBackdrop || event.target.closest("[data-close-master-review]")) {
      closeMasterReview();
      return;
    }

    const rejectButton = event.target.closest("[data-reject-offer]");
    const acceptButton = event.target.closest("[data-accept-offer]");
    if (!acceptButton && !rejectButton) return;
    const targetOfferId = acceptButton?.dataset.acceptOffer || rejectButton?.dataset.rejectOffer;
    const nextStatus = rejectButton ? "Reddedildi" : "Kabul edildi";
    const selectedOffer = offers.find((offer) => String(offer.id) === String(targetOfferId));

    offers = rejectButton
      ? offers.filter((offer) => String(offer.id) !== String(targetOfferId))
      : offers.map((offer) =>
          String(offer.id) === String(targetOfferId)
            ? { ...offer, status: nextStatus }
            : offer,
        );
    saveVisibleOffersForAccount(offers, currentOfferAccountKey);
    if (selectedOffer) {
      const notificationOffer = enrichRequesterOffer(selectedOffer);
      syncRelatedOfferStatus(notificationOffer, nextStatus);
      if (nextStatus === "Kabul edildi") {
        applyListingAssignmentLocally(notificationOffer);
      }
      try {
        await publishOfferStatusToFirestore(notificationOffer, nextStatus);
        if (nextStatus === "Kabul edildi") {
          await publishListingAssignmentToFirestore(notificationOffer);
        }
      } catch (error) {
        console.warn("Teklif durumu Firestore'a yaz\u0131lamad\u0131:", error);
      }
      await publishRequesterNotification(
        buildOfferRequesterNotification(notificationOffer, nextStatus),
        notificationOffer,
      );
    }
    renderOffers(document.querySelector("[data-offer-filter].active").dataset.offerFilter);
    closeMasterReview();
    showToast(rejectButton ? "Teklif reddedildi. Ustaya bildirim gönderildi." : "Usta atandı. İlan akıştan kaldırıldı.");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !masterReviewBackdrop.hidden) closeMasterReview();
  });

  const initialOfferFilterButton =
    document.querySelector(`[data-offer-filter="${initialOfferFilter}"]`) ||
    document.querySelector('[data-offer-filter="all"]');
  document.querySelectorAll("[data-offer-filter]").forEach((item) => item.classList.remove("active"));
  initialOfferFilterButton?.classList.add("active");
  renderOffers(initialOfferFilterButton?.dataset.offerFilter || "all");

  subscribeOfferFeed(() => {
    renderOffers(document.querySelector("[data-offer-filter].active")?.dataset.offerFilter || "all");
  });
}

function setupInviteButtons() {
  const inviteButtons = document.querySelectorAll("[data-invite-master]");
  if (!inviteButtons.length) return;

  const invitedMasters = new Set(getStoredInvites().map((invite) => invite.masterName));
  inviteButtons.forEach((button) => {
    if (!invitedMasters.has(button.dataset.inviteMaster)) return;
    button.textContent = "Davet gönderildi";
    button.disabled = true;
  });
}

function renderFavoriteMastersPage() {
  const favoritesTitle = document.querySelector("#favorites-title");
  const favoritesGrid = favoritesTitle?.closest(".all-listings-section")?.querySelector(".pro-grid");
  if (!favoritesGrid) return;

  const favorites = Object.values(getStoredFavoriteMasters()).sort(
    (left, right) => new Date(right.favoritedAt || 0) - new Date(left.favoritedAt || 0),
  );
  if (!favorites.length) return;

  favoritesGrid.innerHTML = favorites
    .map((favorite) => {
      const masterName = favorite.masterName || "Favori usta";
      const location = [favorite.city, favorite.district].filter(Boolean).join(" / ") || "Konum yok";
      return `
        <article class="pro-card">
          <div class="profile-avatar">${escapeHtml(masterName.slice(0, 2).toLocaleUpperCase("tr-TR"))}</div>
          <div>
            <h3>${escapeHtml(masterName)}</h3>
            <p>${escapeHtml(favorite.profession || "Hizmet veren")} · ${escapeHtml(location)}</p>
            <div class="stars">${getRatingStars(favorite.rating || 10)}</div>
            <small>${Number(favorite.rating || 10).toFixed(1)}/10 · ${getLocalMasterFavoriteCount(favorite.masterKey)} favori · ${escapeHtml(favorite.listingTitle || "Tamamlanan iş")}</small>
          </div>
          <button class="job-action" type="button" data-invite-master="${escapeHtml(masterName)}">İlana davet et</button>
        </article>
      `;
    })
    .join("");
}

document.addEventListener("click", (event) => {
  const inviteButton = event.target.closest("[data-invite-master]");
  if (inviteButton) {
    saveInvite(inviteButton.dataset.inviteMaster);
    inviteButton.textContent = "Davet gönderildi";
    inviteButton.disabled = true;
    showToast(`${inviteButton.dataset.inviteMaster} ilana davet edildi.`);
  }
});

renderFavoriteMastersPage();
setupInviteButtons();
