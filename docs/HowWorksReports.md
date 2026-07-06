1\. LinePulse Reports bölümü şu an nasıl çalışıyor?

Reports menüsü ikiye ayrılıyor:

A) General Reports (Genel Raporlar) — Line Daily KPI, Daily, Weekly, Monthly, Quarterly, Yearly, Detail, Machine Timeline. Bunlar temelde büyük bir veri tablosu (data grid). Örneğin Line Daily KPI raporunda üstte üç filtre var (Start Date, End Date, Line) ve bir "Generate Report" butonu. Bastığında her satır bir gün/hat olacak şekilde şu kolonlar (measure'lar) hazır olarak dolar:

Line, Date, Calendar Time, Scheduled Time, Volume, Reject, Theo. volume, Target Volume, Up Time %, Rate Loss %, Reject Loss %, Planned Downtime Loss %, Unplanned Downtime Loss %, Number of Stops, Number of Short Stops, Breakdown, Process Stops, No Definition Stoppage Code, Planned Stops, MTBF, Design Target Speed, Planned/Unplanned Stop Duration, No Data Flow Duration, No Demand Duration, Running Duration, Low Speed Duration, Total Runtime.

Her kolonun kendi "search" ve sıralama (↑↓) özelliği var, sayfalama ve export (yeşil buton) mevcut. Yani kullanıcı hazır bir tabloyu görüyor, sadece tarih/hat filtresini değiştirebiliyor.

B) Analysis Reports (Analiz Raporları) — Uptime \& Losses, Unplanned Downtime, Planned Downtime, MTBF \& Up Stops. Bunlar tablo değil, grafiksel dashboard. Örneğin Uptime \& Losses ekranında: üstte çoklu-seçim filtreler (Production Center, Line, tarih aralığı), altında KPI kartları (Uptime, Rate Loss, Quality Losses, Unplanned/Planned Downtime, Total Losses, Availability — her biri değer + trend sparkline + yüzde değişim), ortada bir trend grafiği (All / Month / Week / Day granülerlik seçimiyle stacked bar + line), sağda bir composition (donut) grafiği ve "Top Contributors" listesi.

Önemli nokta: Her iki tipte de ekranlar statik/sabit. Hangi measure'ların, hangi grafik tipinin, hangi kırılımın (breakdown/dimension) gösterileceği koda gömülü. Kullanıcı sadece filtre değiştirebiliyor, kendi raporunu kuramıyor. Senden istenen tam olarak bu sınırı kaldırmak.

2\. Custom Report işi tam olarak ne?

Amaç: kullanıcının, geliştiricilere ihtiyaç duymadan kendi raporunu sıfırdan tasarlayabilmesi. Yani bir "rapor tasarlama motoru" (report builder) yapıyorsun. Kullanıcı; hangi ölçümleri (measures/KPI) istediğini, bunları hangi kırılımlarla (dimensions) böleceğini ve nasıl (tablo mu, çizgi mi, bar mı, donut mu) göreceğini kendisi seçecek.

Bu işi ürünsel olarak 3 soruyla özetleyebilirsin: Kullanıcı ne yapacak? (rapor kurgulayacak), Ne girecek? (measure + dimension + filtre + grafik tipi seçimi), Ne dönecek? (o seçime göre üretilen dinamik grafik + veri seti).

3\. Girdi tarafı — kullanıcının vereceği/seçeceği şeyler

Kullanıcının seçeceklerini üç kovada topla:

Measures (KPI / ölçümler): Ham metrikler ve türetilmiş KPI'lar. Ham olanlar: Volume, Plan Volume, Theoric Volume, Target Volume, Reject, Number of Stops, Number of Short Stops, Duration türleri (Running, Planned/Unplanned Stop, Low Speed, No Demand, No Data Flow), Calendar/Scheduled Time, MTBF, Design Target Speed. Türetilmiş olanlar: Uptime %, Rate Loss %, Reject Loss %, Planned/Unplanned Downtime Loss %, Availability, Total Losses. Türetilmiş KPI'lar ham measure'lardan formülle hesaplandığı için builder'da bunların hesap tanımını bir yerde tutman gerekir (örn. uptime = running\_duration / scheduled\_time).

Dimensions (kırılımlar / breakdown): Ölçümü neye göre böleceği. Örneğin Line, Production Center, Machine, Date (gün/hafta/ay/çeyrek/yıl granülerliği), Shift, Order Number, Stop Reason / Stoppage Code. "Farklı kırılımlar ile" derken kastedilen tam olarak bu — aynı Uptime'ı bir gün hatlara göre, ertesi gün duruş sebeplerine göre görebilmesi.

Filtreler: Tarih aralığı, hat, üretim merkezi, vardiya vb. (mevcut raporlardaki filtrelerin aynısı ama artık kullanıcı hangilerini ekleyeceğine kendi karar veriyor).

Görselleştirme (visualization): Table (data grid), Line, Bar/Stacked Bar, Donut/Pie, KPI card. Kullanıcı measure + dimension + grafik tipini eşleştirecek (örn: "Uptime ve Loss'u, Line kırılımıyla, Stacked Bar olarak göster").

4\. Çıktı tarafı — sistemin döndüreceği şey

Kullanıcının seçtiği measure + dimension + filtre + grafik tipi kombinasyonuna göre iki şey üretilecek: (1) Veri seti — seçilen dimension'lara göre grupla, seçilen measure'ları hesapla, bir satır/kolon yapısı çıkar; (2) Grafik — o veri setini seçilen grafik tipiyle çiz. Ayrıca kullanıcının bu kurguyu kaydedebilmesi (bir rapor tanımı olarak saklamak, sonra tekrar açmak) ve tabloyu/grafiği export edebilmesi beklenir. Yani mantık şu şekilde akar: kullanıcı seçim yapar → bir "rapor tanımı (report definition)" oluşur → bu tanım backend'e sorgu olarak gider (şimdilik dummy data ile karşılanacak) → dönen veri seti seçilen grafik bileşenine bağlanır.

5\. Senin yapacağın geliştirme (PrimeVue + Vue.js, dummy data ile)

İstenen: ana projeden ayrı, yeni bir Vue.js + PrimeVue projesi aç ve tüm veriyi dummy olarak üret (ekip sana dummy data'yı Pazartesi ulaştıracak; gelmezse sen kendin uyduracak şekilde başlayabilirsin). Kabaca kuracağın yapı:

Bir report builder ekranı: solda ya da üstte measure listesi, dimension listesi, filtre alanları ve grafik tipi seçici (PrimeVue'nun MultiSelect, Dropdown, PickList / drag-drop, Calendar, SelectButton bileşenleri buna çok uygun). Ortada/sağda ise seçime göre canlı güncellenen önizleme (preview) alanı — burada PrimeVue DataTable (tablo çıktısı için) ve Chart bileşeni (Chart.js sarmalayıcısı; line/bar/doughnut çizer) kullanacaksın. Kullanıcı seçim değiştirdikçe dummy veriyi bu seçime göre grupla/hesapla ve preview'i güncelle.

Mimari olarak kritik parça: seçimleri tutan bir report definition modeli (örn. { measures: \[], dimensions: \[], filters: {}, chartType: '' }) ve bu tanımı alıp dummy data üzerinde çalışan bir aggregation/transform fonksiyonu (group-by + measure hesabı). Bu katmanı temiz yazarsan, ileride dummy data yerine gerçek API geldiğinde sadece veri kaynağını değiştirmen yeterli olur; UI ve dönüşüm mantığı aynı kalır.

---

# EK NOTLAR — Canlı LinePulse ekranlarından scrape edilerek çıkarılan teknik bilgiler (2026-07-05)

Bu bölüm, gerçek LinePulse arayüzü (platform.enerpulse.tech/linepulse) admin oturumuyla incelenerek doldurulmuştur. Custom Report Builder'ı gerçeğe en yakın kurmak için referans olarak kullan.

## E0. Erişim / ortam notları
- URL: `https://platform.enerpulse.tech/linepulse/#/app/...` (Angular/SPA, hash-router). Backend API tabanı: `https://platform.enerpulse.tech/linepulseApi/api/...`
- Oturum: admin olarak giriş yapılmış Chrome profili üzerinden erişiliyor (aynı profil → çerez paylaşımlı). Claude in Chrome kendi ayrı "MCP sekme grubunda" çalıştığı için kullanıcının normal sekmelerini görmez; sayfayı MCP sekmesinde ayrıca açmak gerekir.
- Sol menü: Dashboard, Time Line, Loss Tree, Operator Dashboard, Orders, **Reports (Analysis Reports + General Reports)**, Alarms, Definitions, Auth.

## E1. General Reports → Line Daily KPI (tablo raporu)
Filtreler: Start Date, End Date, Line (multiselect; örn "Link-up 38, Link-Up-37"), "Generate Report" butonu, yeşil Excel export butonu, sağ üstte "filtreleri temizle" ikonu.

Tablo davranışı: her kolonda ayrı arama kutusu (metin kolonlarında "Search by text", sayısal kolonlarda "Search by value" + huni/filtre menüsü), her kolonda sıralama (↑↓), sayfalama (10/…), yatay kaydırma. Yani PrimeVue DataTable: `sortable`, `filter`, `paginator`, `scrollable` + kolon bazlı filtre.

**Tam kolon (measure) listesi — 28 kolon, ekrandaki sırayla:**
1. Line (dimension, metin)
2. Date (dimension, tarih — gün granülü)
3. Calendar Time (dk)
4. Scheduled Time (dk)
5. Volume (adet)
6. Reject (adet)
7. Theo. volume (adet — teorik max üretim)
8. Target Volume (adet)
9. Up Time % 
10. Rate Loss %
11. Reject Loss %
12. Planned Downtime Loss %
13. Unplanned Downtime Loss %
14. Number of Stops (adet)
15. Number of Short Stops (adet)
16. Breakdown (adet)
17. Process Stops (adet)
18. No Definition Stoppage Code (adet)
19. Planned Stops (adet)
20. MTBF (dk)
21. Design Target Speed (adet/dk — örn hep 8400)
22. Planned Stop Duration (dk)
23. Unplanned Stop Duration (dk)
24. No Data Flow Duration (dk)
25. No Demand Duration (dk)
26. Running Duration (dk)
27. Low Speed Duration (dk)
28. Total Runtime (dk)

**Gerçek örnek satır (Link-up 38, 05.06.2026):** Calendar 1440, Scheduled 1440, Volume 9.254.800, Reject 576.286, Theo.vol 12.671.413, Target 12.095.440, UpTime 73.04, RateLoss 10.77, RejectLoss 4.55, PlannedDT 0, UnplannedDT 11.65, #Stops 37, #ShortStops 14, Breakdown 0, ProcessStops 4, NoDefCode 8, PlannedStops 0, MTBF 34.30, DesignSpeed 8400, PlannedStopDur 0, UnplannedStopDur 167.70, NoDataFlow 0, NoDemand 0, Running 1143.81, LowSpeed 124.60, TotalRuntime 1269.02.

Birimler: süreler dakika (1440 dk = 1 gün), volume/reject adet, speed adet/dk, %'ler 0–100 (bazıları 100'ü aşabilir, bkz. Availability).

## E2. ÇÖZÜLEN türetilmiş KPI formülleri (gerçek verilerle DOĞRULANDI)
Bu formüller örnek satırlar üzerinde aritmetikle teyit edildi — builder'ın "derived measure" motorunda bunları kullan:

- **Up Time % = Volume / Theo. volume × 100** (doğrulandı: 9.254.800 / 12.671.413 = %73.04; 4.110.640 / 19.680.613 = %20.89).
- **Reject Loss % = Reject / Theo. volume × 100** (doğrulandı: 576.286 / 12.671.413 = %4.55).
- **Planned Downtime Loss % ≈ Planned Stop Duration × Design Target Speed / Theo. volume × 100** (yaklaşık; kayıp = duruşta üretilemeyen teorik hacim).
- **Unplanned Downtime Loss % ≈ Unplanned Stop Duration × Design Target Speed / Theo. volume × 100**.
- **Rate Loss %** = kalan (düşük hızda çalışma kaybı) = 100 − (UpTime + RejectLoss + PlannedDT + UnplannedDT).
- **KRİTİK KURAL:** UpTime% + RateLoss% + RejectLoss% + PlannedDowntimeLoss% + UnplannedDowntimeLoss% = **%100** (her satırda ±0.01 yuvarlamayla doğrulandı). Yani beş kova, Theo. volume'a göre üretim + tüm kayıpların tam waterfall'ı. Bu, klasik OEE/TEEP loss-tree yapısıdır.
- Theo. volume ≈ Design Target Speed × ilgili süre (teorik tavan).
- Total Runtime ≈ Running Duration + Low Speed Duration.

**Aggregation uyarısı (builder için hayati):** Bir dimension'a göre gruplarken yüzdeler ORTALANAMAZ. Önce ham measure'lar (Volume, Reject, Theo.volume, süreler) toplanır, SONRA yüzde formülü uygulanır. Yani her türetilmiş KPI'ın "numerator/denominator ham bileşenleri" tanımı motor içinde tutulmalı.

## E3. Analysis Reports → Uptime & Losses (grafiksel dashboard, route: pr-losses)
Layout (yukarıdan aşağı):
- **Filtre çubuğu:** Start Date → End Date, Production Center (multiselect), Line (multiselect), seçilenleri gösteren chip'ler + "Clear all", yeşil Excel + kırmızı PDF export, bildirim (zil) ikonu.
- **8 KPI kartı (üst şerit):** Uptime, Rate Loss, Quality Losses, Unplanned Downtime, Planned Downtime, Total Losses, Availability, Periods Reported. Her kartta: büyük değer + trend sparkline + renkli % değişim (yeşil artı / kırmızı eksi). Örnek değerler: Uptime 53.99%, Rate Loss 21.61%, Quality Losses 34.08%, Unplanned DT 20.77%, Planned DT 0.40%, Total Losses 76.85%, Availability 109.68% (100'ü aşabiliyor), Periods Reported 14.
- **Trend grafiği (orta):** Sağ üstte granülerlik SelectButton'u **All / Month / Week / Day**. Yığılmış bar (Rate Loss + Quality Losses + Unplanned Downtime + Planned Downtime) + üstüne **Uptime çizgisi** (combo bar+line). X ekseni haftalar (W14…W27).
- **Composition (sağ, donut):** Ortada "Total Losses 76.85%", altında **Top Contributors** listesi (Uptime 53.99%, Rate Loss 21.61%, Quality Losses 34.08%, Unplanned 20.77%, Planned 0.40% — her biri değer + ok).
- **Per-line breakdown (alt):** Aynı measure setinin **Line kırılımıyla** yığılmış bar hâli (Link-up 38, Link-Up-37) + Uptime çizgisi. Bu, "aynı ölçümü farklı dimension ile göster" örneğinin canlı hâli — Custom Builder'ın hedeflediği tam davranış.

**Terminoloji eşlemesi:** Bu ekrandaki **"Quality Losses" = tablo raporundaki "Reject Loss"**. Aynı KPI, farklı isim. Builder'da isim/etiket sözlüğü tutmakta fayda var.

## E4. Keşfedilen route'lar ve API endpoint'leri
Analysis Reports route'ları:
- Uptime & Losses → `#/app/reports/pr-losses`
- Unplanned Downtime → `#/app/reports/unplanned-downtime`
- Planned Downtime → `#/app/reports/planned-downtime`
- MTBF & Up Stops → `#/app/reports/mtbf-up-stops`
- General Reports örnek: Line Daily KPI → `#/app/reports/line-daily-kpi`

API endpoint'leri (hepsi POST, `.../linepulseApi/api/`):
- `Report/GetEquipmentTimeLineChartDailyData` — pr-losses dashboard verisi (trend + breakdown; sayfada 2 kez çağrılıyor).
- `ProductionCenter/GetUserProductionCentersSelectList` — Production Center filtre listesi.
- `Line/GetUserLineByProductionCentersSelectList` — seçili PC'ye göre Line filtre listesi (bağımlı dropdown).
- `Dashboard/SystemStatus`, `Notification/GetUnreadCount`, `RoleMenu/GetUserRoleMenus` — arka plan/menü çağrıları.
Not: Line Daily KPI tablosu client-side cache'li — aynı filtreyle "Generate Report" tekrar basınca yeni istek atmıyor; sadece filtre değişince fetch ediyor. (Request/response gövdeleri henüz alınmadı; gerekirse javascript_tool ile fetch edilip şema netleştirilebilir.)

## E5. Custom Report Builder için çıkarımlar
- **Measures kataloğu** = E1'deki 28 alan; ham vs. türetilmiş ayrımı E2'deki formüllerle net.
- **Dimensions** (gözlemlenen): Line, Production Center, Date (day/week/month/quarter/year granülerliği). MTBF/stop raporlarında muhtemelen Machine/Equipment, Stop Reason/Stoppage Code da var (diğer analysis ekranlarında teyit edilecek).
- **Visualization tipleri** (gözlemlenen): DataTable (kolon filtre/sort/paginate), Stacked Bar, Line, Combo (bar+line), Donut, KPI card (değer + sparkline + delta%).
- **Granülerlik kontrolü**: All/Month/Week/Day SelectButton — builder'da Date dimension için standart bir kontrol olmalı.
- **Filtre bağımlılığı**: Line listesi seçili Production Center'a bağlı — builder filtrelerinde bu bağımlılığı destekle.
- Dummy data'yı bu 28 measure + (Line, ProductionCenter, Date) dimensionlarını kapsayacak, hat-gün granülünde üret; türetilmiş KPI'ları E2 formülleriyle hesapla ki toplamları %100 tutsun.



