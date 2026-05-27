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
const DATA_RESET_AT = Date.parse("2026-05-24T15:11:45+03:00");
const DATA_RESET_STORAGE_KEY = "ustaDataResetAt";
const ADMIN_EMAIL = "sayedarman1352@gmail.com";

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
  const value = record?.createdAt || record?.respondedAt || record?.updatedAt || record?.time;
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
    image: safeImage && safeImage.length < 180000 ? safeImage : "",
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
    badge: "Denemek için",
    description: "İlk ilanlarını renklendir, birkaç işi öne çıkar ve akışta daha hızlı fark edil.",
    features: ["5 renkli ilan hakkı", "2 öne çıkan görünüm", "Küçük bütçeyle reklam testi"],
  },
  {
    id: "growth",
    title: "Büyüme",
    credits: 120,
    price: 100,
    badge: "En dengeli",
    description: "Daha sık ilan paylaşanlar için görünürlük ve renkli arka planı birlikte kullan.",
    features: ["12 renkli ilan hakkı", "6 öne çıkan görünüm", "Daha uzun süre vitrinde kalma"],
  },
  {
    id: "boost",
    title: "Görünürlük",
    credits: 300,
    price: 200,
    badge: "Yoğun kullanım",
    description: "Çok ilan açanlar ve hızlı teklif toplamak isteyenler için güçlü reklam kredisi.",
    features: ["30 renkli ilan hakkı", "15 öne çıkan görünüm", "Yoğun dönemlerde ekstra vitrin"],
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
  Diğer:
    "https://images.unsplash.com/photo-1683115096447-5d01c11d3ead?auto=format&fit=crop&q=80&w=1200",
};

function addGroupedProfessionOptions(select, options = {}) {
  const { excludeOther = false, searchTerm = "" } = options;
  const normalizedSearch = normalizeAccountValue(searchTerm);
  professionCategoryGroups.forEach((group) => {
    const groupMatchesSearch = normalizeAccountValue(group.title).includes(normalizedSearch);
    const groupItems = group.items.filter((item) => {
      if (excludeOther && item === "Diğer") return false;
      if (!normalizedSearch) return true;
      return groupMatchesSearch || normalizeAccountValue(item).includes(normalizedSearch);
    });
    if (!groupItems.length) return;

    const optionGroup = document.createElement("optgroup");
    optionGroup.label = group.title;
    groupItems.forEach((category) => {
      optionGroup.append(new Option(category, category));
    });
    select.append(optionGroup);
  });
}

function populateCategorySelect(select, options = {}) {
  const { firstValue = "", firstText = "Seç", searchTerm = "" } = options;
  const currentValue = select.value;
  select.innerHTML = `<option value="${firstValue}">${firstText}</option>`;
  addGroupedProfessionOptions(select, { searchTerm });

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

  return {
    id: `listing-moderation-${listing.id}-${moderationStatus}-${Date.now()}`,
    type: approved ? "approved" : "rejected",
    title: approved ? "İlanın onaylandı" : "İlanın reddedildi",
    body: approved
      ? `"${listing.title}" ilanı admin onayından geçti ve ana akışta yayınlandı.`
      : `"${listing.title}" ilanı admin tarafından reddedildi.${reason ? ` Sebep: ${reason}` : ""}`,
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
];

defaultListings.length = 0;

function getAllListings() {
  const listingMap = new Map();
  [...getStoredListings(), ...remoteListings.filter(isAfterDataReset)].forEach((listing) => {
    listingMap.set(String(listing.id), {
      ...listing,
      categoryGroup: listing.categoryGroup || getCategoryGroupTitle(listing.category),
      tags: getListingTags(listing),
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

async function compressImageAsDataUrl(file, maxWidth = 960, quality = 0.75) {
  if (!file || !file.size) return "";

  const originalDataUrl = await readImageAsDataUrl(file);
  if (!originalDataUrl.startsWith("data:image/")) {
    return originalDataUrl;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        resolve(originalDataUrl);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    });
    image.addEventListener("error", () => resolve(originalDataUrl));
    image.src = originalDataUrl;
  });
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
    const image = await readImageAsDataUrl(profilePhotoInput.files?.[0]);
    if (image) {
      profilePhotoPreview.innerHTML = `<img src="${image}" alt="Profil fotoğrafı önizleme" />`;
    }
  });

  portfolioPhotosInput?.addEventListener("change", async () => {
    const files = Array.from(portfolioPhotosInput.files || []).slice(0, 6);
    const images = await Promise.all(files.map(readImageAsDataUrl));
    portfolioPreview.innerHTML = images
      .filter(Boolean)
      .map((src) => `<img src="${src}" alt="İş fotoğrafı önizleme" />`)
      .join("");
  });

  profileEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(profileEditForm);
    const existingUser = getUser();
    const profilePhoto = await readImageAsDataUrl(formData.get("profilePhoto"));
    const portfolioFiles = Array.from(portfolioPhotosInput?.files || []).slice(0, 6);
    const portfolioPhotos = portfolioFiles.length
      ? (await Promise.all(portfolioFiles.map(readImageAsDataUrl))).filter(Boolean)
      : existingUser.portfolioPhotos || [];

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
      profilePhoto: profilePhoto || existingUser.profilePhoto || "",
      portfolioPhotos,
    };

    localStorage.setItem("ustaUser", JSON.stringify(updatedUser));
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
              <article class="admin-moderation-item" data-admin-listing="${listing.id}">
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
      : `<article class="admin-moderation-item"><h3>İlan yok</h3><p>Yeni ilan geldiğinde burada görünecek.</p></article>`;
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

  const balance = getCreditBalance();
  if (creditBalanceText) {
    creditBalanceText.textContent = `Bakiyen: ${formatCredits(balance)}`;
  }

  creditTopupGrid.innerHTML = `
    <div class="plan-usage">
      <div>
        <strong>İlanını daha görünür yap</strong>
        <span>Renkli ilan ${formatCredits(promotionCreditCosts.colored)} · Öne çıkan vitrin ${formatCredits(promotionCreditCosts.featured)}</span>
      </div>
      <small>Kredi sadece reklam görünürlüğü içindir; ilan açma ve teklif gönderme hakkın sınırsız kalır.</small>
    </div>
    ${creditPackages
      .map(
        (pack) => `
          <article class="plan-card credit-card ${pack.id === "growth" ? "active" : ""}">
            <div>
              <span class="plan-price">${pack.price} TL · ${pack.badge}</span>
              <h3>${pack.title}</h3>
              <p>${pack.description}</p>
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

  function filterListingCategories() {
    if (!categorySelect) return;
    populateCategorySelect(categorySelect, {
      firstValue: "",
      firstText: "Seç",
      searchTerm: categorySearchInput?.value || "",
    });
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
  syncCustomCategoryField();

  listingCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(listingCreateForm);
    const submitButton = listingCreateForm.querySelector('button[type="submit"]');
    const image = await compressImageAsDataUrl(formData.get("image"));
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

    const selectedCategory = String(formData.get("category") || "");
    const customCategoryTitle = String(formData.get("customCategory") || "").trim();
    const category = selectedCategory === "Diğer" ? customCategoryTitle : selectedCategory;
    const categoryGroup = selectedCategory === "Diğer" ? "Diğer" : getCategoryGroupTitle(selectedCategory);
    const tags = parseListingTags(formData.get("tags"));

    if (selectedCategory === "Diğer" && !customCategoryTitle) {
      showToast("Diğer kategorisi için işe özel başlık yazman gerekiyor.");
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
      title: formData.get("title").trim(),
      category,
      categoryGroup,
      customCategoryTitle,
      tags,
      city: formData.get("city"),
      district: formData.get("district"),
      workDate,
      time: getTimeLabel(workDate),
      duration: formData.get("duration"),
      budget: Number(formData.get("budget")),
      materials: formData.get("materials"),
      phone: formData.get("phone"),
      addressNote: formData.get("addressNote").trim(),
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
      image,
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
      } catch (authError) {
        console.warn("Firebase oturumu açılamadı, ilan yine de deneniyor:", authError);
      }

      const listingRef = await publishSharedListing(listingData, image);
      const sharedListing = buildSharedListingPayload(listingData, image);
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
  let listings = getAllListings();

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

  let selectedTime = "Tümü";
  let featuredIndex = 0;
  let currentFeatured = [];
  let carouselTimer;
  const featuredListings = document.querySelector("#featuredListings");
  const featuredPrev = document.querySelector("#featuredPrev");
  const featuredNext = document.querySelector("#featuredNext");
  const featuredCarousel = document.querySelector(".featured-carousel");
  const marketSearch = document.querySelector("#marketSearch");
  const categoryFilter = document.querySelector("#categoryFilter");
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
      drawerCreditBalance.hidden = !isRegisteredUser(getUser());
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
    const params = new URLSearchParams(window.location.search);
    const user = getUser();
    const registered = isRegisteredUser(user);
    const role = params.get("role") || user.role || "master";
    const displayName = registered ? user.fullName || "Profil" : "Misafir";
    const profileButtonName = registered ? displayName : "Hesap";
    const roleLabel = registered
      ? role === "master" ? user.profession || "Hizmet veren hesabı" : "İş veren hesabı"
      : "İlanları keşfet";

    document.body.classList.toggle("guest-user", !registered);
    profileButton.setAttribute("aria-label", registered ? "Profil panelini aç" : "Hesap panelini aç");
    profileName.textContent = profileButtonName;
    profileRole.textContent = roleLabel;
    setAvatarElement(profileAvatar, registered ? user : { fullName: "Misafir" });
    drawerName.textContent = displayName;
    drawerRole.textContent = roleLabel;
    setAvatarElement(drawerAvatar, registered ? user : { fullName: "Misafir" });
    if (drawerUpgradeLink) {
      drawerUpgradeLink.textContent = registered ? "Kredi yükle" : "Kayıt ol";
      drawerUpgradeLink.href = registered ? "kredi-yukle.html" : "kayit.html";
    }
    if (adminPanelAction) {
      adminPanelAction.hidden = !isAdminUser(user);
    }
    updateDrawerCreditBalance();
    updateDrawerVerificationState(user);
    marketSearch.placeholder = "İlan, sektör, beceri veya ilçe ara";
    restartSharedFeeds();
  }

  function openProfileDrawer() {
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

  function openNotificationPanel() {
    if (!notificationPanel || !notificationButton) return;
    closeDrawer();
    notificationPanel.hidden = false;
    window.requestAnimationFrame(() => notificationPanel.classList.add("open"));
    notificationButton.setAttribute("aria-expanded", "true");
  }

  function toggleNotificationPanel() {
    if (!notificationPanel || !notificationButton) return;
    if (notificationPanel.hidden) openNotificationPanel();
    else closeNotificationPanel();
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
      : `<li class="notification-empty">Henüz bildirim yok. Yeni teklif veya mesaj gelince burada görünür.</li>`;

    if (!visibleNotifications.length) {
      notificationList.innerHTML =
        `<li class="notification-empty">Yeni bildirim yok. Okuduklarını side paneldeki Bildirim geçmişi alanından görebilirsin.</li>`;
    }

    updateNotificationBadge();
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

  function getFilteredListings() {
    const query = marketSearch.value.trim().toLocaleLowerCase("tr-TR");
    const category = categoryFilter.value;

    return listings.filter((listing) => {
      if (isUnavailableListing(listing)) return false;
      if (!isApprovedListing(listing)) return false;

      const matchesQuery = [
        listing.title,
        listing.category,
        listing.categoryGroup,
        listing.city,
        listing.district,
        listing.details,
        listing.expectations,
        ...getListingTags(listing),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query);
      const matchesCategory = category === "Tümü" || listing.category === category || listing.categoryGroup === category;
      const matchesTime = selectedTime === "Tümü" || listing.time === selectedTime;

      return matchesQuery && matchesCategory && matchesTime;
    });
  }

  function listingCard(listing, featured = false) {
    const imageSrc = getListingImage(listing);
    const categoryMark =
      categoryMarks[listing.category] || listing.category.slice(0, 2).toLocaleUpperCase("tr-TR");
    const timeLabel = getTimeLabel(listing.workDate) || listing.time;
    const promoted = Boolean(listing.highlighted);
    const priorityLabel = listing.carouselPriorityLabel || (listing.carouselPriority ? "Öne çıkan sıra" : "");
    const tagBadges = renderTagBadges(listing.tags, featured ? 4 : 5);

    return `
      <article class="${featured ? "featured-card" : "listing-card"} ${promoted ? "colored-listing" : ""} ${listing.carouselPriority >= 3 ? "premium-listing" : ""}"${getHighlightStyle(listing)}>
        <div class="${featured ? "featured-top" : "listing-top"}">
          <span class="category-icon">${categoryMark}</span>
          <strong class="budget">${currency.format(listing.budget)}</strong>
        </div>
        <div class="listing-photo">
          <img src="${imageSrc}" alt="${listing.title} ilan fotoğrafı" loading="lazy" onerror="this.onerror=null;this.src='assets/listing-placeholder.svg';" />
          ${featured ? `<span class="featured-photo-label">${priorityLabel || "Öne çıkan"}</span>` : ""}
        </div>
        <div>
          <h3>${listing.title}</h3>
          <p>${listing.details}</p>
          ${tagBadges}
        </div>
        <div class="card-action-area">
          <div class="job-meta">
            <span class="badge ${timeLabel === "Bugün" ? "hot" : ""}">${timeLabel}</span>
          <span class="badge">${listing.category}</span>
          ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
          <span class="badge">${listing.district}</span>
          <span class="badge">${listing.offers} teklif</span>
          ${promoted ? `<span class="badge promo-badge">Renkli ilan</span>` : ""}
        </div>
        <div class="listing-bottom">
            <a class="job-action" href="ilan-detay.html?id=${listing.id}">Teklif ver</a>
          </div>
        </div>
      </article>
    `;
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
    const filteredListings = getFilteredListings();
    const sortByPromotion = (left, right) =>
      Number(right.carouselPriority || 0) - Number(left.carouselPriority || 0) ||
      getRecordTimestamp(right) - getRecordTimestamp(left);
    const featured = filteredListings.filter((listing) => listing.featured).sort(sortByPromotion);
    const orderedListings = [...filteredListings].sort(sortByPromotion);

    currentFeatured = featured;
    featuredIndex = 0;

    if (featuredListings) {
      featuredListings.innerHTML = featured.length
        ? featured.map((listing) => listingCard(listing, true)).join("")
        : `<article class="featured-card"><h3>Öne çıkan sonuç yok</h3><p>Aramayı genişletince uygun ilanlar burada görünür.</p></article>`;
      updateFeaturedCarousel();
      restartCarousel();
    }

    listingGrid.innerHTML = orderedListings.length
      ? orderedListings.map((listing) => listingCard(listing)).join("")
      : `<article class="listing-card"><h3>Sonuç bulunamadı</h3><p>Arama veya filtreyi genişletmeyi dene.</p></article>`;
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
  profileButton.addEventListener("click", openProfileDrawer);
  closeProfileDrawer.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);
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
  profileDrawer.addEventListener("click", (event) => {
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

    if (profileDrawer.classList.contains("open")) {
      closeDrawer();
      return;
    }

    if (notificationPanel && !notificationPanel.hidden) {
      closeNotificationPanel();
    }
  });

  marketSearch.addEventListener("input", renderListings);
  categoryFilter.addEventListener("change", renderListings);

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((item) => item.classList.remove("active"));
      chip.classList.add("active");
      selectedTime = chip.dataset.time;
      renderListings();
    });
  });

  setupProfile();
  setupNotifications();
  renderListings();
}

function accountListingCard(listing, passive = false) {
  const imageSrc = getListingImage(listing);
  const assigned = isAssignedListing(listing);
  const completed = isCompletedListing(listing);
  const status = completed ? "Tamamlandı" : assigned ? "Usta atandı" : passive ? "Pasif" : "Aktif";
  const assignedMaster = listing.assignedMaster || listing.master || {};
  const canComplete = assigned && !completed && isApprovedListing(listing);
  const tagBadges = renderTagBadges(listing.tags, 5);

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
      </div>
      <div>
        <h3>${listing.title}</h3>
        <p>${listing.details}</p>
        ${tagBadges}
      </div>
      <div class="card-action-area">
        <div class="job-meta">
          <span class="badge">${listing.category}</span>
          ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
          <span class="badge">${listing.district}</span>
          <span class="badge">${getTimeLabel(listing.workDate)}</span>
        </div>
        <div class="listing-bottom">
          <span class="badge">${listing.offers || 0} teklif</span>
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
        <p>${master.name} için puan verip istersen favorilerine ekleyebilirsin.</p>
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
            <small>Bu bilgi, ustanın başka tekliflerinde favori sayısı olarak görünür.</small>
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
      : `<article class="listing-card"><h3>${myListingsGrid.dataset.empty}</h3><p>İlan koyduğunda admin onayından sonra ortak akışta yayınlanır.</p></article>`;
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
      : `<article class="listing-card"><h3>${pastJobsGrid.dataset.empty}</h3><p>Süresi biten veya tamamlanan işler burada pasif olarak listelenecek.</p></article>`;
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
            <span class="badge">${listing.district}</span>
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
            ${!inactive && !alreadyOffered ? `<a class="ghost-link" href="${registeredUser ? "#detailOfferForm" : "#registerToOffer"}">${registeredUser ? "Talep alanına git" : "Teklif için kayıt ol"}</a>` : ""}
            ${alreadyOffered ? `<span class="ghost-link disabled-link">Teklifin alındı</span>` : ""}
            ${canRevealListingPhone ? `<a class="ghost-link phone-action" href="tel:${listing.phone}">Ara</a>` : `<span class="ghost-link disabled-link">Telefon gizli</span>`}
          </div>
        </div>
      </section>

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
            <div><dt>Konum</dt><dd>${[listing.city, listing.district].filter(Boolean).join(" / ")}</dd></div>
            <div><dt>Adres notu</dt><dd>${listing.addressNote || "Paylaşılmadı"}</dd></div>
            <div><dt>Beklentiler</dt><dd>${listing.expectations || "Paylaşılmadı"}</dd></div>
            <div><dt>Durum</dt><dd>${statusLabel}</dd></div>
          </dl>
        </article>

        <article class="detail-panel">
          ${
            registeredUser
              ? alreadyOffered
                ? `
                <div class="guest-offer-panel">
                  <p class="eyebrow">Teklif durumu</p>
                  <h2>Bu ilana teklifin alındı.</h2>
                  <p>Aynı ilana yalnızca bir kez teklif gönderebilirsin. Gönderdiğin teklifi Teklifler sayfasından takip edebilirsin.</p>
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
                  <p>İlanları kayıt olmadan gezebilirsin. Teklif göndermek için hizmet veren hesabı açman veya mevcut hesabına girmen gerekir.</p>
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
          requesterRating: Number(user.rating || 9.1),
          requesterReviewCount: Number(user.reviewCount || 12),
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
  const rating = Number(offer.requesterRating || listingMaster.rating || 9.1);
  const reviewCount = Number(offer.requesterReviewCount || listingMaster.reviewCount || 12);
  const masterKey = getMasterStatKey({
    requesterKey: offer.requesterKey,
    requesterUid: offer.requesterUid,
    requesterEmail: offer.requesterEmail,
    requesterName: offer.requesterName,
  });

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
    completedJobs: Number(offer.requesterCompletedJobs || Math.max(4, reviewCount + 3)),
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

  function renderOffers(filter = "all") {
    mergeVisibleOffers();
    const activeOffers = offers.filter((offer) => !(offer.type === "incoming" && offer.status === "Reddedildi"));
    const filtered = filter === "all" ? activeOffers : activeOffers.filter((offer) => offer.type === filter);
    offersList.innerHTML = filtered.length
      ? filtered.map(offerCard).join("")
      : `<article class="offer-card"><h3>Teklif yok</h3><p>Gönderilen veya gelen teklifler burada görünecek.</p></article>`;
  }

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
