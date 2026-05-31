import { useState, useEffect, useRef, useCallback } from "react";
import MapView from "./MapView";

// ── MOCK DATA ────────────────────────────────────────────────────────────────
const ZONES = [
  { id: 1, name: "Depan Gang Sirojudin 3", risk: "bahaya", level: 87, lat: -7.056643, lng: 110.436249 },
  { id: 2, name: "Persimpangan Utama", risk: "waspada", level: 61, lat: -7.056477, lng: 110.436498 },
  { id: 3, name: "Kos Area Barat", risk: "waspada", level: 58, lat: -7.057674, lng: 110.435833 },
  { id: 4, name: "Area Masjid", risk: "aman", level: 22, lat: -6.9730, lng: 110.4170 },
  { id: 5, name: "Ujung Selatan", risk: "aman", level: 15, lat: -6.9790, lng: 110.4140 },
];

const RISK_COLOR = {
  bahaya:  { bg: "#FF3B3B", light: "#FFE5E5", text: "#C0000A", label: "BAHAYA" },
  waspada: { bg: "#FF9500", light: "#FFF3E0", text: "#B35A00", label: "WASPADA" },
  aman:    { bg: "#34C759", light: "#E8FAF0", text: "#1A6B34", label: "AMAN" },
};


const API_KEY = "76546fc132786b1968209788ba4ee55d";
function useSensorData() {
  const [data, setData] = useState({
    curahHujan: null, ketinggianAir: null, debitAir: null,
    suhu: null, humidity: null, deskripsi: "Memuat...", lastUpdate: null, loading: true,
  });
  const fetchWeather = async () => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Semarang&appid=${API_KEY}&units=metric`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal mengambil data");
      const curahHujan = json.rain ? +(json.rain["1h"] || 0).toFixed(1) : 0;
      const suhu = +json.main.temp.toFixed(1);
      const humidity = json.main.humidity;
      const ketinggianAir = Math.min(100, Math.round(curahHujan * 8 + humidity * 0.3));
      const debitAir = +(curahHujan * 0.15 + 0.5).toFixed(2);
      setData(prev => ({ ...prev, curahHujan, ketinggianAir, debitAir, suhu, humidity,
        deskripsi: json.weather[0].description, lastUpdate: new Date(), loading: false }));
    } catch (err) {
      console.error("Gagal fetch:", err);
      setData(prev => ({ ...prev, deskripsi: "Gagal memuat data", lastUpdate: new Date(), loading: false }));
    }
  };
  useEffect(() => {
    fetchWeather();
    const t = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return data;
}

function useHistoryData() {
  const base = [55, 60, 58, 72, 80, 78, 65, 70, 76, 82, 78, 75];
  return base.map((v, i) => ({ t: `${8 + i}:00`, v }));
}

function useAlertHistory() {
  const [alerts, setAlerts] = useState([]);

  const addAlert = (title, msg, risk, icon = "🚨") => {
    const now = new Date();
    const time = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const date = "Hari ini";
    const newAlert = {
      id: Date.now(),
      time,
      date,
      risk,
      title,
      msg,
      icon,
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 20));
  };

  return { alerts, addAlert };
}



// ── UTILS ───────────────────────────────────────────────────────────────────
function RiskBadge({ risk, size = "sm" }) {
  const c = RISK_COLOR[risk];
  const pad = size === "lg" ? "6px 18px" : "3px 10px";
  const fs  = size === "lg" ? 13 : 11;
  return (
    <span style={{
      background: c.bg, color: "#fff", borderRadius: 20,
      padding: pad, fontSize: fs, fontWeight: 700,
      letterSpacing: "0.08em", display: "inline-block",
    }}>
      {c.label}
    </span>
  );
}

function PulsingDot({ risk }) {
  const c = RISK_COLOR[risk].bg;
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: c, animation: "pulse 1.6s ease-out infinite",
      }}/>
      <span style={{ position: "absolute", inset: 2, borderRadius: "50%", background: c }}/>
    </span>
  );
}

function GaugeBar({ value, max = 100, risk }) {
  const c = RISK_COLOR[risk]?.bg ?? "#34C759";
  return (
    <div style={{ background: "#F0F0F0", borderRadius: 8, height: 8, overflow: "hidden" }}>
      <div style={{
        width: `${(value / max) * 100}%`, height: "100%",
        background: c, borderRadius: 8,
        transition: "width 0.6s ease",
      }}/>
    </div>
  );
}

function MiniChart({ data }) {
  const W = 260, H = 60;
  const min = Math.min(...data.map(d => d.v));
  const max = Math.max(...data.map(d => d.v));
  const py = (v) => H - ((v - min) / (max - min)) * (H - 8) - 4;

  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${py(d.v)}`).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline
        points={[...data.map((d, i) => `${(i / (data.length - 1)) * W},${py(d.v)}`), `${W},${H}`, `0,${H}`].join(" ")}
        fill="url(#cg)" stroke="none"
      />
      <polyline points={pts} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((d, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * W} cy={py(d.v)} r="3"
          fill="#fff" stroke="#3B82F6" strokeWidth="1.5"/>
      ))}
    </svg>
  );
}

// ── SCREENS ─────────────────────────────────────────────────────────────────

function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 711d5cac5ebc7be732c8676261d7c9125b4f9a89
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #0A1628 0%, #0F2952 60%, #1A3A6B 100%)",
      gap: 20, animation: "fadeIn 0.5s ease",
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 38, boxShadow: "0 12px 40px rgba(59,130,246,0.5)",
        animation: "bounceIn 0.7s ease 0.3s both",
      }}>💧</div>
      <div style={{ textAlign: "center", animation: "slideUp 0.6s ease 0.6s both" }}>
        <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
          SirojudinAlert
        </div>
        <div style={{ color: "#93C5FD", fontSize: 13, marginTop: 4 }}>
          Sistem Early Warning Banjir
        </div>
      </div>
      <div style={{ color: "#475569", fontSize: 12, position: "absolute", bottom: 40, animation: "fadeIn 1s ease 1.5s both" }}>
        Jl. Sirojudin — Semarang
      </div>
    </div>
  );
}

function HomeScreen({ sensor, onNav, zones }) {
  const topRisk = zones.find(z => z.risk === "bahaya") || zones[0];
  const bahayaCount = zones.filter(z => z.risk === "bahaya").length;
  const waspadaCount = zones.filter(z => z.risk === "waspada").length;
  const timeStr = sensor.lastUpdate ? sensor.lastUpdate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";
  const formatValue = (value, unit = "") => value === null || value === undefined ? "-" : `${value}${unit}`;
  const humidityLabel = sensor.humidity === null ? "Memuat..." : `${sensor.humidity}%`;

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F4F7FF" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0F2952 0%, #1D4ED8 100%)",
        padding: "48px 20px 28px", color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "#93C5FD", letterSpacing: "0.1em", textTransform: "uppercase" }}>Selamat datang</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>SirojudinAlert</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#93C5FD" }}>Pembaruan terakhir</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{timeStr}</div>
          </div>
        </div>

        {/* Status card */}
        <div style={{
          marginTop: 20, background: "rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "16px 18px",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PulsingDot risk={topRisk.risk}/>
            <div style={{ fontSize: 13, color: "#CBD5E1" }}>Status wilayah saat ini</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <RiskBadge risk={topRisk.risk} size="lg"/>
            <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.4 }}>
              {bahayaCount} zona bahaya · {waspadaCount} zona waspada
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 80px" }}>
        {/* Sensor cards */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
          Data Sensor Real-time
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Curah Hujan", val: formatValue(sensor.curahHujan, " mm/h"), icon: "🌧️", sub: sensor.curahHujan === null ? "Memuat..." : sensor.curahHujan > 30 ? "Lebat" : "Sedang" },
            { label: "Ketinggian Air", val: formatValue(sensor.ketinggianAir, " cm"), icon: "📏", sub: sensor.ketinggianAir === null ? "Memuat..." : sensor.ketinggianAir > 70 ? "Kritis" : "Normal" },
            { label: "Debit Air", val: formatValue(sensor.debitAir, " m³/s"), icon: "🌊", sub: sensor.debitAir === null ? "Memuat..." : sensor.debitAir > 2 ? "Tinggi" : "Normal" },
            { label: "Suhu Udara", val: formatValue(sensor.suhu, "°C"), icon: "🌡️", sub: sensor.suhu === null ? "Memuat..." : humidityLabel },
          ].map(card => (
            <div key={card.label} style={{
              background: "#fff", borderRadius: 14, padding: "14px 14px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 22 }}>{card.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0F2952", marginTop: 6 }}>{card.val}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{card.label}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
          Menu Utama
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Peta Risiko", icon: "🗺️", screen: "map", desc: "Lihat zona bahaya" },
            { label: "Monitoring", icon: "📊", screen: "monitor", desc: "Data sensor & grafik" },
            { label: "Peringatan", icon: "🚨", screen: "alert", desc: "Riwayat alert" },
            { label: "Panduan", icon: "📋", screen: "guide", desc: "Mitigasi banjir" },
          ].map(a => (
            <button key={a.screen} onClick={() => onNav(a.screen)} style={{
              background: "#fff", borderRadius: 14, padding: "16px 14px",
              border: "none", cursor: "pointer", textAlign: "left",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontSize: 24 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2952", marginTop: 8 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{a.desc}</div>
            </button>
          ))}
        </div>

        {/* Zone list preview */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>
          Status Zona
        </div>
        {zones.map(z => (
          <div key={z.id} style={{
            background: "#fff", borderRadius: 12, padding: "12px 14px",
            marginBottom: 8, display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            <PulsingDot risk={z.risk}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2952" }}>{z.name}</div>
              <GaugeBar value={z.level} risk={z.risk}/>
            </div>
            <RiskBadge risk={z.risk}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapScreen({ zones }) {
  const [selected, setSelected] = useState(null);
  const sel = selected !== null ? zones.find(z => z.id === selected) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4F7FF" }}>
      <div style={{
        background: "linear-gradient(135deg, #0F2952, #1D4ED8)",
        padding: "48px 20px 16px", color: "#fff",
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>🗺️ Peta Risiko Banjir</div>
        <div style={{ fontSize: 12, color: "#93C5FD", marginTop: 2 }}>Jl. Sirojudin & sekitarnya</div>
      </div>

      {/* Map area (real map) */}
      <div style={{ position: "relative", flex: "0 0 52%", background: "#E8F0FE", overflow: "hidden" }}>
        <MapView zones={zones} onSelect={(id) => setSelected(selected === id ? null : id)} />

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 10, right: 10,
          background: "rgba(255,255,255,0.92)", borderRadius: 10, padding: "8px 10px",
          fontSize: 10, backdropFilter: "blur(4px)",
        }}>
          {["bahaya", "waspada", "aman"].map(r => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: RISK_COLOR[r].bg }}/>
              <span style={{ color: "#334155", textTransform: "capitalize" }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 80px" }}>
        {sel ? (
          <div style={{
            background: "#fff", borderRadius: 16, padding: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            border: `2px solid ${RISK_COLOR[sel.risk].bg}`,
            marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0F2952" }}>{sel.name}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Zona {sel.id}</div>
              </div>
              <RiskBadge risk={sel.risk} size="lg"/>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                <span>Level risiko</span><span style={{ fontWeight: 700, color: RISK_COLOR[sel.risk].bg }}>{sel.level}%</span>
              </div>
              <GaugeBar value={sel.level} risk={sel.risk}/>
            </div>
            <div style={{
              marginTop: 12, padding: "10px 12px", borderRadius: 10,
              background: RISK_COLOR[sel.risk].light,
              fontSize: 12, color: RISK_COLOR[sel.risk].text, lineHeight: 1.6,
            }}>
              {sel.risk === "bahaya" && "⚠️ Segera evakuasi warga. Hindari kawasan ini. Hubungi tim penanggulangan bencana."}
              {sel.risk === "waspada" && "⚡ Pantau terus perkembangan. Siapkan barang darurat. Hindari aktivitas di tepi saluran."}
              {sel.risk === "aman" && "✅ Kondisi normal. Tetap pantau informasi terbaru dari aplikasi ini."}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 8, marginBottom: 12 }}>
            Ketuk penanda di peta untuk detail zona
          </div>
        )}

        {zones.map(z => (
          <div key={z.id}
            onClick={() => setSelected(selected === z.id ? null : z.id)}
            style={{
              background: selected === z.id ? RISK_COLOR[z.risk].light : "#fff",
              borderRadius: 12, padding: "12px 14px", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 12,
              border: `1px solid ${selected === z.id ? RISK_COLOR[z.risk].bg : "transparent"}`,
              cursor: "pointer",
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: RISK_COLOR[z.risk].bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0,
            }}>{z.id}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2952" }}>{z.name}</div>
              <GaugeBar value={z.level} risk={z.risk}/>
            </div>
            <RiskBadge risk={z.risk}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitorScreen({ sensor }) {
  const history = useHistoryData();
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F4F7FF" }}>
      <div style={{
        background: "linear-gradient(135deg, #0F2952, #1D4ED8)",
        padding: "48px 20px 20px", color: "#fff",
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>📊 Monitoring Sensor</div>
        <div style={{ fontSize: 12, color: "#93C5FD", marginTop: 2 }}>Data real-time dari titik sensor IoT</div>
      </div>

      <div style={{ padding: "16px 16px 80px" }}>
        {/* Main chart */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2952" }}>Ketinggian Air</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Hari ini (per jam)</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1D4ED8" }}>{sensor.ketinggianAir} <span style={{ fontSize: 13, fontWeight: 400, color: "#94A3B8" }}>cm</span></div>
          </div>
          <MiniChart data={history}/>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {["08:00", "11:00", "14:00", "17:00", "19:00"].map(t => (
              <span key={t} style={{ fontSize: 10, color: "#94A3B8" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Sensor detail cards */}
        {[
          { label: "Curah Hujan", val: sensor.curahHujan, unit: "mm/h", icon: "🌧️",
            risk: sensor.curahHujan > 30 ? "bahaya" : sensor.curahHujan > 15 ? "waspada" : "aman",
            desc: "Dari rain gauge di titik hulu Sirojudin", max: 60 },
          { label: "Ketinggian Air", val: sensor.ketinggianAir, unit: "cm", icon: "📏",
            risk: sensor.ketinggianAir > 70 ? "bahaya" : sensor.ketinggianAir > 45 ? "waspada" : "aman",
            desc: "Sensor ultrasonik di saluran utama", max: 100 },
          { label: "Debit Aliran", val: sensor.debitAir, unit: "m³/s", icon: "🌊",
            risk: sensor.debitAir > 2.2 ? "waspada" : "aman",
            desc: "Flow sensor di persimpangan utama", max: 5 },
          { label: "Suhu Udara", val: sensor.suhu, unit: "°C", icon: "🌡️",
            risk: "aman", desc: "Sensor cuaca DHT22 area Sirojudin", max: 40 },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2952" }}>{s.label}</div>
                  <RiskBadge risk={s.risk}/>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0F2952", margin: "4px 0" }}>
                  {s.val} <span style={{ fontSize: 12, fontWeight: 400, color: "#94A3B8" }}>{s.unit}</span>
                </div>
                <GaugeBar value={s.val} max={s.max} risk={s.risk}/>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>{s.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertScreen({ sensor = {}, zones = [], alerts = [] }) {

  const groupedAlerts = Object.entries(
    alerts.reduce((g, a) => { (g[a.date] = g[a.date] || []).push(a); return g; }, {})
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F4F7FF" }}>
      <div style={{
        background: "linear-gradient(135deg, #0F2952, #1D4ED8)",
        padding: "48px 20px 20px", color: "#fff",
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>🚨 Riwayat Peringatan</div>
        <div style={{ fontSize: 12, color: "#93C5FD", marginTop: 2 }}>Log notifikasi sistem (real-time)</div>
      </div>

      <div style={{ padding: "16px 16px 80px" }}>
        {groupedAlerts.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 20, padding: "20px" }}>
            ✅ Tidak ada peringatan. Sistem berjalan normal.
          </div>
        ) : (
          groupedAlerts.map(([date, items]) => (
            <div key={date}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, marginTop: 4 }}>
                {date}
              </div>
              {items.map(a => (
                <div key={a.id} style={{
                  background: "#fff", borderRadius: 14, padding: "14px 14px",
                  marginBottom: 10, display: "flex", gap: 12,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                  borderLeft: `4px solid ${RISK_COLOR[a.risk].bg}`,
                }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2952" }}>{a.title}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8", flexShrink: 0, marginLeft: 8 }}>{a.time}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>{a.msg}</div>
                    <div style={{ marginTop: 8 }}><RiskBadge risk={a.risk}/></div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GuideScreen() {
  const [open, setOpen] = useState(null);
  const guides = [
    {
      id: 1, icon: "🟥", title: "Status BAHAYA — Tindakan Segera",
      steps: [
        "Segera evakuasi ke tempat lebih tinggi",
        "Hubungi BPBD Semarang: 024-3541944",
        "Matikan listrik di area bawah rumah",
        "Bawa dokumen penting & obat-obatan",
        "Jangan melewati genangan yang mengalir deras",
      ]
    },
    {
      id: 2, icon: "🟧", title: "Status WASPADA — Persiapan",
      steps: [
        "Pantau terus aplikasi SirojudinAlert",
        "Siapkan tas darurat (obat, dokumen, makanan)",
        "Angkat barang berharga ke tempat lebih tinggi",
        "Informasikan keluarga tentang kondisi",
        "Hindari aktivitas di dekat saluran air",
      ]
    },
    {
      id: 3, icon: "🟩", title: "Status AMAN — Pencegahan Rutin",
      steps: [
        "Bersihkan saluran air secara berkala",
        "Jangan buang sampah ke saluran",
        "Pasang tandon air untuk mengurangi genangan",
        "Laporkan kerusakan infrastruktur ke kelurahan",
        "Ikuti sosialisasi mitigasi banjir setempat",
      ]
    },
    {
      id: 4, icon: "📞", title: "Kontak Darurat",
      steps: [
        "BPBD Semarang: 024-3541944",
        "PMI Semarang: 024-3547711",
        "Pemadam Kebakaran: 113",
        "Polisi: 110",
        "Kelurahan Banyumanik: 024-7473008",
      ]
    },
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F4F7FF" }}>
      <div style={{
        background: "linear-gradient(135deg, #0F2952, #1D4ED8)",
        padding: "48px 20px 20px", color: "#fff",
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>📋 Panduan Mitigasi</div>
        <div style={{ fontSize: 12, color: "#93C5FD", marginTop: 2 }}>Langkah-langkah berdasarkan status risiko</div>
      </div>

      <div style={{ padding: "16px 16px 80px" }}>
        {guides.map(g => (
          <div key={g.id} style={{
            background: "#fff", borderRadius: 14, marginBottom: 10,
            overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}>
            <button onClick={() => setOpen(open === g.id ? null : g.id)}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "16px 16px", display: "flex", alignItems: "center", gap: 12,
              }}>
              <div style={{ fontSize: 22 }}>{g.icon}</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2952" }}>{g.title}</div>
              </div>
              <div style={{ fontSize: 18, color: "#94A3B8", transform: open === g.id ? "rotate(180deg)" : "none", transition: "0.2s" }}>
                ⌄
              </div>
            </button>
            {open === g.id && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid #F1F5F9" }}>
                {g.steps.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "8px 0",
                    borderBottom: i < g.steps.length - 1 ? "1px solid #F8FAFC" : "none",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#EFF6FF", color: "#1D4ED8",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, paddingTop: 2 }}>{s}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NAV BAR ──────────────────────────────────────────────────────────────────
function NavBar({ current, onNav }) {
  const items = [
    { id: "home", icon: "🏠", label: "Beranda" },
    { id: "map", icon: "🗺️", label: "Peta" },
    { id: "monitor", icon: "📊", label: "Sensor" },
    { id: "alert", icon: "🚨", label: "Alert" },
    { id: "guide", icon: "📋", label: "Panduan" },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: "rgba(255,255,255,0.97)",
      borderTop: "1px solid #E2E8F0",
      display: "flex", padding: "8px 0 16px",
      backdropFilter: "blur(12px)",
      zIndex: 100,
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onNav(item.id)}
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "4px 0",
            opacity: current === item.id ? 1 : 0.45,
            transition: "opacity 0.2s",
          }}>
          <div style={{ fontSize: 20 }}>{item.icon}</div>
          <div style={{
            fontSize: 10, fontWeight: current === item.id ? 700 : 400,
            color: current === item.id ? "#1D4ED8" : "#64748B",
          }}>{item.label}</div>
          {current === item.id && (
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1D4ED8" }}/>
          )}
        </button>
      ))}
    </div>
  );
}

// ── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("splash");
  const sensor = useSensorData();
  const [zones, setZones] = useState(ZONES);
  const { alerts, addAlert } = useAlertHistory();
  const lastConditionRef = useRef({ lastRisk: null, lastMaxLevel: null, lastRainState: null });
  const handleSplashDone = useCallback(() => setScreen("home"), []);

  useEffect(() => {
    if (!sensor.loading && sensor.curahHujan !== null) {
      setZones(prev => {
        const updated = ZONES.map((z, i) => {
          const base = sensor.curahHujan * 8 + (sensor.humidity || 0) * 0.3;
          const targetLevel = Math.min(95, Math.max(5, Math.round(base - i * 8)));
          const previousLevel = prev[i]?.level ?? targetLevel;
          const levelChange = targetLevel - previousLevel;
          const level = Math.min(95, Math.max(5, previousLevel + Math.max(-4, Math.min(4, levelChange))));
          const risk = level > 65 ? "bahaya" : level > 35 ? "waspada" : "aman";
          return { ...z, risk, level };
        });

        const maxLevel = Math.max(...updated.map(z => z.level));
        const maxRisk = updated.find(z => z.risk === "bahaya")
          ? "bahaya"
          : updated.find(z => z.risk === "waspada")
          ? "waspada"
          : "aman";
        const rainState = sensor.curahHujan > 30 ? "lebat" : sensor.curahHujan > 15 ? "sedang" : "ringan";

        // Detect changes and generate alerts
        if (lastConditionRef.current.lastRisk !== maxRisk) {
          if (maxRisk === "bahaya") {
            addAlert(
              "⚠️ Kondisi BAHAYA Terdeteksi!",
              `Level air mencapai ${maxLevel}%. Segera lakukan evakuasi. Hubungi BPBD.`,
              "bahaya",
              "🚨"
            );
          } else if (maxRisk === "waspada" && lastConditionRef.current.lastRisk !== null) {
            addAlert(
              "⚡ Status Berubah ke WASPADA",
              `Level air meningkat ke ${maxLevel}%. Siapkan barang darurat.`,
              "waspada",
              "⚡"
            );
          } else if (maxRisk === "aman" && lastConditionRef.current.lastRisk !== null) {
            addAlert(
              "✅ Kondisi Kembali Normal",
              `Semua zona menunjukkan level aman. Lanjutkan pemantauan.`,
              "aman",
              "✅"
            );
          }
          lastConditionRef.current.lastRisk = maxRisk;
        }

        if (lastConditionRef.current.lastRainState !== rainState && rainState === "lebat") {
          addAlert(
            "🌧️ Curah Hujan Lebat",
            `Curah hujan mencapai ${sensor.curahHujan} mm/h. Pantau terus perkembangan.`,
            sensor.curahHujan > 30 ? "bahaya" : "waspada",
            "🌧️"
          );
          lastConditionRef.current.lastRainState = rainState;
        }

        lastConditionRef.current.lastMaxLevel = maxLevel;
        return updated;
      });
    }
  }, [sensor.curahHujan, sensor.humidity, sensor.loading, addAlert]);

  if (screen === "splash") {
    return (
      <div style={{
        width: 360, height: 720, margin: "0 auto", borderRadius: 40, overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,0.3)", position: "relative", background: "#0A1628"
      }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes bounceIn { 0% { transform: scale(0.5); opacity: 0 } 70% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
          @keyframes pulse { 0% { transform: scale(1); opacity: 0.8 } 100% { transform: scale(2.5); opacity: 0 } }
        `}</style>
        <SplashScreen onDone={handleSplashDone}/>
      </div>
    );
  }

  const screens = { home: HomeScreen, map: MapScreen, monitor: MonitorScreen, alert: AlertScreen, guide: GuideScreen };
  const Screen = screens[screen] || HomeScreen;

  return (
    <div style={{ width: 360, height: 720, margin: "0 auto", borderRadius: 40, overflow: "hidden",
      boxShadow: "0 30px 80px rgba(0,0,0,0.3)", position: "relative", background: "#F4F7FF" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8 } 100% { transform: scale(2.5); opacity: 0 } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Notch */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 28, background: "#0A1628", borderRadius: "0 0 16px 16px",
        zIndex: 200,
      }}/>

      {/* Status bar time */}
      <div style={{
        position: "absolute", top: 6, left: 20, right: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 201, pointerEvents: "none",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
          {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span style={{ fontSize: 11, color: "#fff" }}>📶 🔋</span>
      </div>

      {/* Screen content */}
      <div style={{ height: "100%", paddingBottom: 0 }}>
        {screen === "alert" ? (
          <Screen sensor={sensor} onNav={setScreen} zones={zones} alerts={alerts} />
        ) : (
          <Screen sensor={sensor} onNav={setScreen} zones={zones} />
        )}
      </div>

      <NavBar current={screen} onNav={setScreen}/>
    </div>
  );
}

