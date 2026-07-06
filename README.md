# LinePulse · Custom Report Builder

Kullanıcıların, geliştiriciye ihtiyaç duymadan **kendi raporlarını sıfırdan
tasarlayabildiği** bir dinamik rapor motoru. Kullanıcı hangi ölçümleri
(measures/KPI), hangi kırılımlarla (dimensions) ve hangi grafik tipiyle (tablo /
bar / stacked / line / donut) göreceğini seçer; sistem seçime göre **veri seti +
grafik** üretir.

Mevcut LinePulse raporları statik ekranlardır (kullanıcı yalnızca filtre
değiştirebilir). Bu proje o sınırı kaldırır: kullanıcı raporu kendisi kurgular.

> Vue 3 + PrimeVue 4 (Aura teması) + Chart.js ile yazılmıştır. Tüm veri
> **dummy**'dir; gerçek API geldiğinde yalnızca veri kaynağı katmanı değişir,
> UI ve dönüşüm mantığı aynı kalır.

## Ekranlar

- **Line Daily KPI** — gerçek LinePulse'taki tablo raporunun birebir kabuğu (28
  kolon, kolon bazlı filtre/sıralama, sayfalama). Referans/demo amaçlı.
- **Custom Report** — asıl iş. Sağdaki *Report Builder* panelinden measure +
  dimension + grafik tipi + filtre seçilir; solda grafik, altta tam genişlik
  veri seti canlı güncellenir. Grafikte scroll ile zoom, seriye gelince odak
  (diğerlerini soluklaştırma) gibi etkileşimler vardır.

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # üretim derlemesi -> dist/
npm run preview    # derlemeyi yerelde önizle
```

## Proje yapısı

```
.
├── index.html
├── vite.config.js
├── package.json
├── docs/                     # iş tanımı ve araştırma notları
│   ├── job.md                # istenen iş
│   ├── HowWorksReports.md    # LinePulse raporlarının analizi + doğrulanmış KPI formülleri
│   └── design/               # tasarım eskizleri
└── src/
    ├── main.js               # PrimeVue kurulumu (LinePulse teması)
    ├── App.vue               # basit view yönlendirme (router yerine)
    ├── style.css
    ├── layout/
    │   ├── AppSidebar.vue     # LinePulse sol menüsü
    │   └── AppTopbar.vue
    ├── views/
    │   ├── LineDailyKpi.vue   # tablo raporu (statik kabuk)
    │   └── CustomReport.vue   # rapor oluşturucu (asıl ekran)
    ├── data/
    │   ├── dummyData.js       # deterministik dummy kayıtlar + COLUMNS (ortak veri kaynağı)
    │   └── reportCatalog.js   # MEASURES (ham + türetilmiş) & DIMENSIONS kataloğu
    └── lib/
        └── reportEngine.js    # report definition -> { columns, rows } (filtre + group-by + hesap)
```

## Mimari (kritik parça)

Rapor bir **report definition** modeliyle temsil edilir:

```js
{ measures: [], dimensions: [], dateGranularity: 'day', filters: { dateFrom, dateTo, lines } }
```

`reportEngine.runReport(definition, records)` bu tanımı alır; kayıtları filtreler,
seçilen dimension'lara göre gruplar ve measure'ları hesaplar.

### Türetilmiş KPI'lar ve doğru aggregation

Türetilmiş KPI'lar (Up Time %, Rate/Reject/Downtime Loss %, Availability, MTBF)
`reportCatalog.js` içinde **pay/payda (num/den)** fonksiyonlarıyla tanımlıdır.
Gruplarken yüzdeler **ortalanmaz**: önce pay ve payda satır satır toplanır, sonra
oran hesaplanır. Böylece beş loss kovası (Up Time + Rate + Reject + Planned +
Unplanned) her grupta **%100'e tamamlanır** — gerçek LinePulse ile birebir.

Formüller canlı LinePulse ekranlarından çıkarılıp gerçek verilerle doğrulanmıştır
(bkz. `docs/HowWorksReports.md`).


## Teknolojiler

Vue 3 · PrimeVue 4 · Chart.js 4 · chartjs-plugin-zoom · Vite
