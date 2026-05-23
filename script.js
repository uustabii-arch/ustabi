const toast = document.querySelector("#toast");

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function injectPageSwitcher() {
  if (document.querySelector(".page-switcher")) return;

  const pages = [
    { href: "index.html", label: "Başlangıç" },
    { href: "is-veren-kayit.html", label: "İş veren kaydı" },
    { href: "usta-kayit.html", label: "Usta kaydı" },
    { href: "pazar.html", label: "İlanlar" },
    { href: "ilan-koy.html", label: "İlan koy" },
    { href: "ilan-detay.html?id=1", label: "İlan detayı", match: "ilan-detay.html" },
    { href: "ilanlarim.html", label: "İlanlarım" },
    { href: "onceki-islerim.html", label: "Önceki işlerim" },
    { href: "profil-duzenle.html", label: "Profil düzenle" },
    { href: "guvenlik.html", label: "Güvenlik" },
    { href: "teklifler.html", label: "Teklifler" },
    { href: "bildirim-ayarlari.html", label: "Bildirimler" },
    { href: "favori-ustalar.html", label: "Favori ustalar" },
    { href: "odeme-guvence.html", label: "Ödeme güvence" },
  ];
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const fullName = formData.get("fullName");
    const profession =
      formData.get("profession") === "Diğer"
        ? formData.get("customProfession")
        : formData.get("profession");

    localStorage.setItem(
      "ustaUser",
      JSON.stringify({
        role,
        fullName,
        email: formData.get("email"),
        profession,
      }),
    );

    showToast(`${fullName} için ${role === "master" ? "usta" : "iş veren"} hesabı hazır.`);
    window.setTimeout(() => {
      window.location.href = `pazar.html?role=${role}`;
    }, 700);
  });
}

handleRegister(document.querySelector("#employerRegisterPage"), "employer");
handleRegister(document.querySelector("#masterRegisterPage"), "master");

const listingCreateForm = document.querySelector("#listingCreateForm");
const listingImageInput = document.querySelector("#listingImageInput");
const listingImagePreview = document.querySelector("#listingImagePreview");
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
const identityFileInput = document.querySelector("#identityFileInput");
const identityPreview = document.querySelector("#identityPreview");
const notificationForm = document.querySelector("#notificationForm");
const offersList = document.querySelector("#offersList");
const paymentForm = document.querySelector("#paymentForm");

const professionCategories = [
  "Boya",
  "Tesisat",
  "Elektrik",
  "Montaj",
  "Taşıma",
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
  "Diğer",
];

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

function populateProfessionSelects() {
  document.querySelectorAll('select[name="category"], #categoryFilter').forEach((select) => {
    const firstValue = select.id === "categoryFilter" ? "Tümü" : "";
    const firstText = select.id === "categoryFilter" ? "Tümü" : "Seç";
    const currentValue = select.value;
    select.innerHTML = `<option value="${firstValue}">${firstText}</option>`;
    professionCategories.forEach((category) => {
      select.add(new Option(category, category));
    });
    if ([firstValue, ...professionCategories].includes(currentValue)) {
      select.value = currentValue;
    }
  });

  const professionSelectEl = document.querySelector("#professionSelect");
  if (professionSelectEl) {
    const currentValue = professionSelectEl.value;
    professionSelectEl.innerHTML = `<option value="">Seç</option><option value="Diğer">Diğer</option>`;
    professionCategories
      .filter((category) => category !== "Diğer")
      .forEach((category) => professionSelectEl.add(new Option(category, category)));
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

function addOneMonth() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + 1);
  return toDateInputValue(date);
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

function isAllowedWorkDate(workDate) {
  return Boolean(workDate && workDate >= todayValue() && workDate <= addOneMonth());
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

function getStoredOffers() {
  try {
    return JSON.parse(localStorage.getItem("ustaOffers")) || [];
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

function getNotificationSettings() {
  try {
    return JSON.parse(localStorage.getItem("ustaNotifications")) || {};
  } catch {
    return {};
  }
}

function getNotificationInbox() {
  try {
    return JSON.parse(localStorage.getItem("ustaNotificationInbox")) || [];
  } catch {
    return [];
  }
}

function saveNotificationInbox(items) {
  localStorage.setItem("ustaNotificationInbox", JSON.stringify(items));
}

function pushNotification(notification) {
  const inbox = getNotificationInbox();
  const withoutDuplicate = inbox.filter((item) => item.id !== notification.id);
  const nextInbox = [notification, ...withoutDuplicate].sort(
    (left, right) => new Date(right.time) - new Date(left.time),
  );
  saveNotificationInbox(nextInbox);
}

function syncRelatedOfferStatus(sourceOffer, status) {
  const offers = getStoredOffers();
  const nextOffers = offers.map((offer) => {
    const sameListing = String(offer.listingId) === String(sourceOffer.listingId);
    const sameRequester =
      (offer.requesterName && sourceOffer.requesterName && offer.requesterName === sourceOffer.requesterName) ||
      String(offer.id) === `${sourceOffer.id}-sent` ||
      String(sourceOffer.id) === `${offer.id}-sent`;

    return sameListing && sameRequester ? { ...offer, status } : offer;
  });

  localStorage.setItem("ustaOffers", JSON.stringify(nextOffers));
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
  const now = Date.now();
  if (role === "employer") {
    return [
      {
        id: "welcome-employer-1",
        type: "offer",
        title: "Yeni usta teklifi",
        body: "Banyo fayans işine 3.800 ₺ teklif geldi.",
        time: new Date(now - 45 * 60000).toISOString(),
        read: false,
        href: "teklifler.html",
      },
      {
        id: "welcome-employer-2",
        type: "message",
        title: "Mesajın var",
        body: "Usta, iş tarihini netleştirmek için yazdı.",
        time: new Date(now - 3 * 3600000).toISOString(),
        read: false,
        href: "teklifler.html",
      },
    ];
  }

  return [
    {
      id: "welcome-master-1",
      type: "offer",
      title: "Teklifin inceleniyor",
      body: "2+1 ev boya badana ilanına gönderdiğin teklif iş verene ulaştı.",
      time: new Date(now - 30 * 60000).toISOString(),
      read: false,
      href: "teklifler.html",
    },
    {
      id: "welcome-master-2",
      type: "job",
      title: "Yakınında yeni iş",
      body: "Kadıköy'de elektrik tesisat işi yayınlandı.",
      time: new Date(now - 2 * 3600000).toISOString(),
      read: false,
      href: "pazar.html",
    },
  ];
}

function mergeOfferNotifications(inbox) {
  const existingIds = new Set(inbox.map((item) => item.id));
  const merged = [...inbox];

  getStoredOffers()
    .filter((offer) => offer.status === "Yeni" || offer.notificationTarget === "owner")
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
        type: offer.notificationTarget === "owner" ? "request" : "offer",
        title:
          offer.notificationTarget === "owner"
            ? "İlanına yeni talep geldi"
            : offer.type === "incoming"
              ? "Yeni teklif"
              : "Teklif gönderildi",
        body:
          offer.notificationTarget === "owner"
            ? `${offer.requesterName || "Bir usta"} "${offer.listingTitle}" ilanına ${amount} teklif gönderdi.`
            : offer.type === "incoming"
            ? `${offer.listingTitle} ilanına ${amount} teklif geldi.`
            : `${offer.listingTitle} ilanına ${amount} teklifin kaydedildi.`,
        time: offer.createdAt || new Date().toISOString(),
        read: false,
        href: offer.notificationTarget === "owner" ? "teklifler.html?filter=incoming" : "teklifler.html",
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

function getAllListings() {
  return [...getStoredListings(), ...defaultListings];
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

function getStoredListings() {
  try {
    return JSON.parse(localStorage.getItem("ustaListings")) || [];
  } catch {
    return [];
  }
}

if (workDateInput) {
  workDateInput.min = todayValue();
  workDateInput.max = addOneMonth();
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

    const updatedUser = {
      ...existingUser,
      role,
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
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
  const security = getSecurityState();

  securityForm.elements.phone.value = security.phone || user.phone || "";
  securityForm.elements.email.value = security.email || user.email || "";

  function renderVerificationCards() {
    verificationGrid.querySelectorAll("[data-verification]").forEach((card) => {
      const key = card.dataset.verification;
      const verified = Boolean(security[`${key}Verified`]);
      card.classList.toggle("verified", verified);
      card.querySelector("button").textContent = verified ? "Doğrulandı" : "Doğrula";
    });
  }

  renderVerificationCards();

  verificationGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-verify]");
    if (!button) return;

    const key = button.dataset.verify;
    security[`${key}Verified`] = true;
    saveSecurityState(security);
    renderVerificationCards();
    showToast("Doğrulama durumu güncellendi.");
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
    const nextSecurity = {
      ...currentSecurity,
      phone: formData.get("phone"),
      email: formData.get("email"),
      phoneVerified: currentSecurity.phoneVerified || false,
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
    const values = Array.isArray(settings[name]) ? settings[name] : [];
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
  listingCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(listingCreateForm);
    const image = await readImageAsDataUrl(formData.get("image"));
    const workDate = formData.get("workDate");
    const listings = getStoredListings();
    let currentUser = {};

    try {
      currentUser = JSON.parse(localStorage.getItem("ustaUser") || "{}");
    } catch {
      currentUser = {};
    }

    if (!isAllowedWorkDate(workDate)) {
      showToast("İlan tarihi bugünden eski veya 1 aydan ileri olamaz.");
      return;
    }

    listings.unshift({
      id: Date.now(),
      title: formData.get("title").trim(),
      category: formData.get("category"),
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
      featured: true,
      image,
      owner: {
        name: currentUser.fullName || "İş veren",
        rating: 10,
        reviewCount: 0,
      },
      master: {
        name: "Atanmadı",
        rating: 0,
        reviewCount: 0,
      },
    });

    localStorage.setItem("ustaListings", JSON.stringify(listings));
    showToast("İlan paylaşıldı. İlan sayfasına yönlendiriliyorsun.");
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
  const listings = getAllListings();

  const categoryMarks = {
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

  function setupProfile() {
    const params = new URLSearchParams(window.location.search);
    const user = getUser();
    const role = params.get("role") || user.role || "master";
    const displayName = user.fullName || "Profil";

    profileName.textContent = displayName;
    profileRole.textContent =
      role === "master" ? user.profession || "Usta hesabı" : "İş veren hesabı";
    setAvatarElement(profileAvatar, user);
    drawerName.textContent = displayName;
    drawerRole.textContent =
      role === "master" ? user.profession || "Usta hesabı" : "İş veren hesabı";
    setAvatarElement(drawerAvatar, user);
    marketSearch.placeholder =
      role === "master" ? "İlan, meslek veya ilçe ara" : "İlan, usta veya ilçe ara";
  }

  function openProfileDrawer() {
    closeNotificationPanel();
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

    notificationList.innerHTML = notificationInbox.length
      ? notificationInbox
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

    updateNotificationBadge();
  }

  function loadNotificationInbox() {
    const params = new URLSearchParams(window.location.search);
    const user = getUser();
    const role = params.get("role") || user.role || "master";
    let inbox = getNotificationInbox();

    if (!inbox.length) {
      inbox = getDefaultNotificationInbox(role);
      saveNotificationInbox(inbox);
    }

    notificationInbox = mergeOfferNotifications(inbox);
    saveNotificationInbox(notificationInbox);
    renderNotificationInbox();
  }

  function markNotificationRead(notificationId) {
    notificationInbox = notificationInbox.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item,
    );
    saveNotificationInbox(notificationInbox);
    renderNotificationInbox();
  }

  function markAllNotificationsReadHandler() {
    notificationInbox = notificationInbox.map((item) => ({ ...item, read: true }));
    saveNotificationInbox(notificationInbox);
    renderNotificationInbox();
    showToast("Tüm bildirimler okundu olarak işaretlendi.");
  }

  function setupNotifications() {
    if (!notificationButton || !notificationPanel || !notificationList) return;

    loadNotificationInbox();

    notificationButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleNotificationPanel();
    });

    markAllNotificationsRead?.addEventListener("click", (event) => {
      event.stopPropagation();
      markAllNotificationsReadHandler();
    });

    notificationList.addEventListener("click", (event) => {
      const item = event.target.closest("[data-notification-id]");
      if (!item) return;

      const notificationId = item.dataset.notificationId;
      markNotificationRead(notificationId);
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
      if (isExpiredListing(listing)) return false;

      const matchesQuery = [
        listing.title,
        listing.category,
        listing.city,
        listing.district,
        listing.details,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query);
      const matchesCategory = category === "Tümü" || listing.category === category;
      const matchesTime = selectedTime === "Tümü" || listing.time === selectedTime;

      return matchesQuery && matchesCategory && matchesTime;
    });
  }

  function listingCard(listing, featured = false) {
    const imageSrc = getListingImage(listing);
    const categoryMark =
      categoryMarks[listing.category] || listing.category.slice(0, 2).toLocaleUpperCase("tr-TR");
    const timeLabel = getTimeLabel(listing.workDate) || listing.time;

    return `
      <article class="${featured ? "featured-card" : "listing-card"}">
        <div class="${featured ? "featured-top" : "listing-top"}">
          <span class="category-icon">${categoryMark}</span>
          <strong class="budget">${currency.format(listing.budget)}</strong>
        </div>
        <div class="listing-photo">
          <img src="${imageSrc}" alt="${listing.title} ilan fotoğrafı" loading="lazy" onerror="this.onerror=null;this.src='assets/listing-placeholder.svg';" />
          ${featured ? `<span class="featured-photo-label">Öne çıkan</span>` : ""}
        </div>
        <div>
          <h3>${listing.title}</h3>
          <p>${listing.details}</p>
        </div>
        <div class="card-action-area">
          <div class="job-meta">
            <span class="badge ${timeLabel === "Bugün" ? "hot" : ""}">${timeLabel}</span>
          <span class="badge">${listing.category}</span>
          ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
          <span class="badge">${listing.district}</span>
          <span class="badge">${listing.offers} teklif</span>
        </div>
        <div class="listing-bottom">
            <span class="badge">${listing.phone ? `Tel: ${listing.phone}` : "Telefon doğrulandı"}</span>
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
    const featured = filteredListings.filter((listing) => listing.featured);

    currentFeatured = featured;
    featuredIndex = 0;

    if (featuredListings) {
      featuredListings.innerHTML = featured.length
        ? featured.map((listing) => listingCard(listing, true)).join("")
        : `<article class="featured-card"><h3>Öne çıkan sonuç yok</h3><p>Aramayı genişletince uygun ilanlar burada görünür.</p></article>`;
      updateFeaturedCarousel();
      restartCarousel();
    }

    listingGrid.innerHTML = filteredListings.length
      ? filteredListings.map((listing) => listingCard(listing)).join("")
      : `<article class="listing-card"><h3>Sonuç bulunamadı</h3><p>Arama veya filtreyi genişletmeyi dene.</p></article>`;
  }
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
    "Ödeme ve güvence": "odeme-guvence.html",
    "Bildirim ayarları": "bildirim-ayarlari.html",
    Güvenlik: "guvenlik.html",
  };
  profileDrawer.addEventListener("click", (event) => {
    const action = event.target.closest("[data-panel-action]");
    if (action) {
      const route = profileActionRoutes[action.dataset.panelAction];
      if (route) {
        window.location.href = route;
        return;
      }

      showToast(`${action.dataset.panelAction} özelliğinin detay ekranı sonraki adımda bağlanacak.`);
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
  const status = passive ? "Pasif" : "Aktif";

  return `
    <article class="listing-card ${passive ? "passive-listing" : ""}">
      <div class="listing-top">
        <span class="badge ${passive ? "" : "hot"}">${status}</span>
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
      </div>
      <div class="card-action-area">
        <div class="job-meta">
          <span class="badge">${listing.category}</span>
          ${listing.city ? `<span class="badge">${listing.city}</span>` : ""}
          <span class="badge">${listing.district}</span>
          <span class="badge">${getTimeLabel(listing.workDate)}</span>
        </div>
        <div class="listing-bottom">
          <span class="badge">${listing.phone ? `Tel: ${listing.phone}` : "Telefon yok"}</span>
          <span class="badge">${listing.offers || 0} teklif</span>
        </div>
      </div>
    </article>
  `;
}

const myListingsGrid = document.querySelector("#myListingsGrid");
if (myListingsGrid) {
  const listings = getStoredListings();
  myListingsGrid.innerHTML = listings.length
    ? listings.map((listing) => accountListingCard(listing, isExpiredListing(listing))).join("")
    : `<article class="listing-card"><h3>${myListingsGrid.dataset.empty}</h3><p>İlan koyduğunda burada aktif ve pasif durumlarıyla görünür.</p></article>`;
}

const pastJobsGrid = document.querySelector("#pastJobsGrid");
if (pastJobsGrid) {
  const expiredListings = getStoredListings().filter(isExpiredListing);
  pastJobsGrid.innerHTML = expiredListings.length
    ? expiredListings.map((listing) => accountListingCard(listing, true)).join("")
    : `<article class="listing-card"><h3>${pastJobsGrid.dataset.empty}</h3><p>Süresi biten veya tamamlanan işler burada pasif olarak listelenecek.</p></article>`;
}

const listingDetail = document.querySelector("#listingDetail");
if (listingDetail) {
  const params = new URLSearchParams(window.location.search);
  const listingId = Number(params.get("id"));
  const listing = getAllListings().find((item) => Number(item.id) === listingId);

  if (!listing) {
    listingDetail.innerHTML = `
      <section class="detail-empty">
        <p class="eyebrow">İlan bulunamadı</p>
        <h1>Bu ilan yayından kalkmış olabilir.</h1>
        <a class="detail-back-link" href="pazar.html">İlanlara dön</a>
      </section>
    `;
  } else {
    const imageSrc = getListingImage(listing);
    const inactive = isExpiredListing(listing);
    const owner = listing.owner || { name: "İş veren", rating: 10, reviewCount: 0 };
    const master = listing.master || { name: "Usta atanmadı", rating: 0, reviewCount: 0 };
    const savedRating = getStoredRatings()[listing.id];

    listingDetail.innerHTML = `
      <div class="detail-toolbar">
        <a class="detail-back-link" href="pazar.html">
          <span aria-hidden="true">‹</span>
          İlanlara dön
        </a>
        <span class="detail-status ${inactive ? "passive" : ""}">${inactive ? "Pasif ilan" : "Aktif ilan"}</span>
      </div>

      <section class="detail-hero">
        <div class="detail-photo">
          <img src="${imageSrc}" alt="${listing.title} ilan fotoğrafı" onerror="this.onerror=null;this.src='assets/listing-placeholder.svg';" />
        </div>
        <div class="detail-copy">
          <p class="eyebrow">${listing.category}</p>
          <h1>${listing.title}</h1>
          <p>${listing.details}</p>
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
              <span>Usta puanı</span>
              <strong>${master.name}</strong>
              <div class="stars">${getRatingStars(master.rating)}</div>
              <small>${master.rating ? `${master.rating}/10 · ${master.reviewCount} değerlendirme` : "Henüz atanmadı"}</small>
            </div>
          </div>
          <strong class="detail-budget">${Number(listing.budget || 0).toLocaleString("tr-TR", {
            style: "currency",
            currency: "TRY",
            maximumFractionDigits: 0,
          })}</strong>
          <div class="detail-primary-actions">
            <a class="ghost-link" href="#detailOfferForm">Talep alanına git</a>
            <a class="ghost-link" href="tel:${listing.phone || ""}">Ara</a>
          </div>
        </div>
      </section>

      <section class="detail-grid">
        <article class="detail-panel">
          <h2>İlan bilgileri</h2>
          <dl class="detail-list">
            <div><dt>Telefon</dt><dd>${listing.phone || "Paylaşılmadı"}</dd></div>
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
            <div><dt>Durum</dt><dd>${inactive ? "Pasif" : "Aktif"}</dd></div>
          </dl>
        </article>

        <article class="detail-panel">
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
        </article>

        <article class="detail-panel rating-panel">
          <h2>İş sonu puanlama</h2>
          <p>İş veren işi tamamlandı olarak onayladıktan sonra ustayı 10 üzerinden puanlayabilir. Usta da iş vereni değerlendirebilir.</p>
          <form class="offer-form" id="ratingForm">
            <label>
              Puan
              <input name="rating" type="number" min="1" max="10" step="1" value="${savedRating?.score || 10}" />
            </label>
            <label>
              Değerlendirme notu
              <textarea name="note" rows="4" placeholder="İş zamanında tamamlandı mı, iletişim nasıldı?">${savedRating?.note || ""}</textarea>
            </label>
            <button class="primary-action" type="submit">İşi tamamlandı onayla ve puan ver</button>
          </form>
          ${savedRating ? `<div class="saved-rating"><strong>Verilen puan: ${savedRating.score}/10</strong><span>${savedRating.note || "Not eklenmedi."}</span></div>` : ""}
        </article>
      </section>
    `;

    const detailOfferForm = document.querySelector("#detailOfferForm");
    detailOfferForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(detailOfferForm);
      const user = getCurrentUser();
      const offerId = Date.now();
      const createdAt = new Date().toISOString();
      const amount = Number(formData.get("amount"));
      const message = formData.get("message").trim();
      const requesterName = user.fullName || user.profession || "Bir usta";
      const requesterProfession = user.profession || `${listing.category || "Genel"} ustası`;
      const requesterRating = Number(user.rating || 9.1);
      const requesterReviewCount = Number(user.reviewCount || 12);
      const sentOffer = {
        id: `${offerId}-sent`,
        listingId: listing.id,
        listingTitle: listing.title,
        amount,
        message,
        type: "sent",
        status: "Gönderildi",
        requesterName,
        requesterProfession,
        requesterPhone: user.phone || "",
        requesterCity: user.city || listing.city || "",
        requesterDistrict: user.district || listing.district || "",
        requesterRating,
        requesterReviewCount,
        createdAt,
      };
      const ownerOffer = {
        ...sentOffer,
        id: offerId,
        type: "incoming",
        status: "Yeni",
        notificationTarget: "owner",
      };

      saveOffer(sentOffer);
      saveOffer(ownerOffer);
      pushNotification({
        id: `offer-${ownerOffer.id}`,
        type: "request",
        title: "İlanına yeni talep geldi",
        body: `${requesterName} "${listing.title}" ilanına ${amount.toLocaleString("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        })} teklif gönderdi.`,
        time: createdAt,
        read: false,
        href: "teklifler.html?filter=incoming",
      });

      detailOfferForm.reset();
      showToast("Talep gönderildi. İlan sahibinin bildirim kutusuna düştü.");
    });

    const ratingForm = document.querySelector("#ratingForm");
    ratingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(ratingForm);
      saveRating(listing.id, {
        score: Number(formData.get("rating")),
        note: formData.get("note").trim(),
        completedAt: new Date().toISOString(),
      });
      showToast("İş tamamlandı olarak onaylandı ve puan kaydedildi.");
    });
  }
}

function getOfferMasterProfile(offer) {
  const listing = getAllListings().find((item) => String(item.id) === String(offer.listingId)) || {};
  const listingMaster = listing.master || {};
  const rating = Number(offer.requesterRating || listingMaster.rating || 9.1);
  const reviewCount = Number(offer.requesterReviewCount || listingMaster.reviewCount || 12);

  return {
    name: offer.requesterName || listingMaster.name || "Usta profili",
    profession: offer.requesterProfession || `${listing.category || "Genel"} ustası`,
    rating,
    reviewCount,
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
      </div>
      <div class="listing-bottom">
        <a class="ghost-link" href="ilan-detay.html?id=${offer.listingId}">İlana git</a>
        ${
          isIncoming
            ? `<button class="job-action" type="button" data-master-review="${offer.id}">Ustayı incele</button>`
            : `<button class="job-action" type="button" data-offer-status="${offer.id}">Durumu güncelle</button>`
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
  let offers = [...getStoredOffers(), ...sampleOffers];
  const initialOfferFilter = new URLSearchParams(window.location.search).get("filter") || "all";
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
          <strong>${master.verified ? "Doğrulandı" : "Bekliyor"}</strong>
          <small>Telefon / profil</small>
        </div>
      </div>

      <dl class="master-review-list">
        <div><dt>Konum</dt><dd>${master.location}</dd></div>
        <div><dt>Telefon</dt><dd>${master.phone || "Teklif kabul edilince paylaşılır"}</dd></div>
        <div><dt>Teklif</dt><dd>${amount}</dd></div>
        <div><dt>İlan</dt><dd>${offer.listingTitle}</dd></div>
      </dl>

      <div class="master-message-box">
        <strong>Ustanın mesajı</strong>
        <p>${offer.message || "Mesaj eklenmedi."}</p>
      </div>

      <div class="master-review-actions">
        <a class="ghost-link" href="ilan-detay.html?id=${offer.listingId}">İlana git</a>
        <button class="danger-action" type="button" data-reject-offer="${offer.id}">Reddet</button>
        <button class="primary-action" type="button" data-accept-offer="${offer.id}">Uygun gör ve kabul et</button>
      </div>
    `;

    masterReviewBackdrop.hidden = false;
    window.requestAnimationFrame(() => masterReviewBackdrop.classList.add("open"));
  }

  function renderOffers(filter = "all") {
    const filtered = filter === "all" ? offers : offers.filter((offer) => offer.type === filter);
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

  offersList.addEventListener("click", (event) => {
    const reviewButton = event.target.closest("[data-master-review]");
    if (reviewButton) {
      const offer = offers.find((item) => String(item.id) === reviewButton.dataset.masterReview);
      if (offer) openMasterReview(offer);
      return;
    }

    const button = event.target.closest("[data-offer-status]");
    if (!button) return;

    offers = offers.map((offer) =>
      String(offer.id) === button.dataset.offerStatus
        ? { ...offer, status: offer.status === "Kabul edildi" ? "Gönderildi" : "Kabul edildi" }
        : offer,
    );
    localStorage.setItem(
      "ustaOffers",
      JSON.stringify(offers.filter((offer) => !String(offer.id).startsWith("sample"))),
    );
    renderOffers(document.querySelector("[data-offer-filter].active").dataset.offerFilter);
    showToast("Teklif durumu güncellendi.");
  });

  masterReviewBackdrop.addEventListener("click", (event) => {
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

    offers = offers.map((offer) =>
      String(offer.id) === String(targetOfferId)
        ? { ...offer, status: nextStatus }
        : offer,
    );
    localStorage.setItem(
      "ustaOffers",
      JSON.stringify(offers.filter((offer) => !String(offer.id).startsWith("sample"))),
    );
    if (selectedOffer) {
      syncRelatedOfferStatus(selectedOffer, nextStatus);
      pushNotification({
        id: `offer-response-${selectedOffer.id}-${nextStatus}`,
        type: rejectButton ? "rejected" : "offer",
        title: rejectButton ? "Teklifin reddedildi" : "Teklifin kabul edildi",
        body: `"${selectedOffer.listingTitle}" ilanı için gönderdiğin teklif ${nextStatus.toLocaleLowerCase("tr-TR")}.`,
        time: new Date().toISOString(),
        read: false,
        href: "teklifler.html?filter=sent",
      });
    }
    renderOffers(document.querySelector("[data-offer-filter].active").dataset.offerFilter);
    closeMasterReview();
    showToast(rejectButton ? "Teklif reddedildi. Ustaya bildirim gönderildi." : "Usta teklifi kabul edildi.");
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

document.addEventListener("click", (event) => {
  const inviteButton = event.target.closest("[data-invite-master]");
  if (inviteButton) {
    saveInvite(inviteButton.dataset.inviteMaster);
    inviteButton.textContent = "Davet gönderildi";
    inviteButton.disabled = true;
    showToast(`${inviteButton.dataset.inviteMaster} ilana davet edildi.`);
  }
});

setupInviteButtons();
