"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type VehicleMetric = {
  id: string;
  plate: string;
  model: string;
  color: string;
  category: string;
  odometerKm: number | null;
  usageHours: number;
  plannedHours: number;
  executionRate: number;
  trips: number;
  reservations: number;
  completed: number;
  cancelled: number;
  drivers: string[];
  photoCompliance: number | null;
  lastUse: string | null;
};

type DriverMetric = {
  name: string;
  email: string;
  usageHours: number;
  plannedHours: number;
  averageHours: number;
  trips: number;
  completed: number;
  vehicles: string[];
  destinations: number;
};

type ManagementData = {
  actor: { name: string; email: string };
  period: {
    startDate: string;
    endDate: string;
    businessDays: number;
    capacityHours: number;
  };
  summary: {
    totalVehicles: number;
    activeDrivers: number;
    reservations: number;
    actualTrips: number;
    usageHours: number;
    plannedHours: number;
    averageTripHours: number;
    capacityUtilization: number;
    cancellationRate: number;
    photoCompliance: number;
    departurePunctuality: number | null;
    returnPunctuality: number | null;
  };
  highlights: {
    topDriver: DriverMetric | null;
    topVehicle: VehicleMetric | null;
    longestTrip: { driver: string; vehicle: string; destination: string; hours: number } | null;
    topDriverShare: number;
  };
  alerts: {
    overdueTrips: number;
    pendingPhotos: number;
    unusedVehicles: number;
    highConcentration: number;
  };
  vehicles: VehicleMetric[];
  drivers: DriverMetric[];
  destinations: Array<{ name: string; visits: number; usageHours: number }>;
  daily: Array<{ date: string; usageHours: number; reservations: number }>;
  statusDistribution: { reserved: number; inUse: number; completed: number; cancelled: number };
};

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function formatHours(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} h`;
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}

function formatDateTime(value: string | null) {
  if (!value) return "Sem utilização";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(value))
    .replace(".", "");
}

function formatKm(value: number | null) {
  return value == null ? "Não informado" : `${new Intl.NumberFormat("pt-BR").format(value)} km`;
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "Não foi possível concluir a operação.";
  } catch {
    return "Não foi possível concluir a operação.";
  }
}

function FleetMark() {
  return (
    <span className="fleet-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function MetricRing({ value, label, unavailable = false }: { value: number; label: string; unavailable?: boolean }) {
  return (
    <article className="quality-metric">
      <div
        className={`quality-ring ${unavailable ? "unavailable" : ""}`}
        style={{ "--metric": `${Math.max(0, Math.min(100, value))}%` } as React.CSSProperties}
      >
        <strong>{unavailable ? "—" : `${value}%`}</strong>
      </div>
      <div><strong>{label}</strong><p>{unavailable ? "Aguardando registros suficientes" : "no período selecionado"}</p></div>
    </article>
  );
}

export function ManagementDashboard() {
  const today = todayInSaoPaulo();
  const [startDate, setStartDate] = useState(() => addDays(today, -29));
  const [endDate, setEndDate] = useState(today);
  const [preset, setPreset] = useState(30);
  const [data, setData] = useState<ManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ start: startDate, end: endDate });
        const response = await fetch(`/api/management?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(await readApiError(response));
        setData((await response.json()) as ManagementData);
        setNotice(null);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Falha ao carregar os indicadores.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endDate, startDate],
  );

  useEffect(() => {
    // Sincroniza o painel com os registros persistidos no período.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  function applyPreset(days: number) {
    const end = todayInSaoPaulo();
    setPreset(days);
    setEndDate(end);
    setStartDate(addDays(end, -(days - 1)));
  }

  const maxVehicleHours = Math.max(1, ...(data?.vehicles.map((vehicle) => vehicle.usageHours) ?? []));
  const maxDriverHours = Math.max(1, ...(data?.drivers.map((driver) => driver.usageHours) ?? []));
  const trend = useMemo(() => {
    const values = data?.daily ?? [];
    return values.length > 31 ? values.slice(-31) : values;
  }, [data]);
  const maxDailyHours = Math.max(1, ...trend.map((day) => day.usageHours));
  const actorName = data?.actor.name ?? "Paulo";
  const actorInitials = actorName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const alerts = data
    ? [
        data.alerts.overdueTrips > 0 && {
          tone: "critical",
          icon: "!",
          title: "Utilizações em atraso",
          text: `${data.alerts.overdueTrips} veículo${data.alerts.overdueTrips === 1 ? "" : "s"} ultrapassou o horário previsto de retorno.`,
        },
        data.alerts.pendingPhotos > 0 && {
          tone: "warning",
          icon: "◉",
          title: "Registros fotográficos pendentes",
          text: `${data.alerts.pendingPhotos} utilização${data.alerts.pendingPhotos === 1 ? "" : "ões"} sem todas as evidências obrigatórias.`,
        },
        data.alerts.unusedVehicles > 0 && {
          tone: "neutral",
          icon: "▰",
          title: "Veículos sem utilização",
          text: `${data.alerts.unusedVehicles} veículo${data.alerts.unusedVehicles === 1 ? "" : "s"} sem horas registradas neste período.`,
        },
        data.alerts.highConcentration > 0 && {
          tone: "info",
          icon: "♙",
          title: "Uso concentrado em um motorista",
          text: `${data.alerts.highConcentration}% das horas estão concentradas no primeiro colocado do ranking.`,
        },
      ].filter(Boolean) as Array<{ tone: string; icon: string; title: string; text: string }>
    : [];

  return (
    <div className="app-shell management-app">
      <aside className="sidebar" aria-label="Navegação principal">
        <Link className="brand" href="/" aria-label="RotaFácil — início">
          <FleetMark />
          <span>Rota<strong>Fácil</strong></span>
        </Link>
        <nav className="main-nav">
          <Link className="nav-item" href="/"><span className="nav-icon">⌂</span>Visão geral</Link>
          <Link className="nav-item" href="/#frota"><span className="nav-icon">▣</span>Veículos</Link>
          <Link className="nav-item" href="/agenda"><span className="nav-icon">◫</span>Agenda</Link>
          <Link className="nav-item active" href="/gestao"><span className="nav-icon">◒</span>Gestão</Link>
          <Link className="nav-item" href="/#registros"><span className="nav-icon">◎</span>Registros</Link>
        </nav>
        <div className="sidebar-note">
          <span className="sidebar-note-mark">BI</span>
          <div><strong>Decisões com dados</strong><p>Indicadores operacionais sempre atualizados.</p></div>
        </div>
        <button className="profile-card" type="button" aria-label={`Perfil de ${actorName}`}>
          <span className="avatar">{actorInitials || "P"}</span>
          <span className="profile-copy"><strong>{actorName}</strong><small>Gestão de frota</small></span>
          <span aria-hidden="true">•••</span>
        </button>
      </aside>

      <main className="main-content management-main">
        <header className="topbar management-topbar">
          <div><p className="eyebrow">INTELIGÊNCIA OPERACIONAL</p><h1>Painel gerencial</h1><span>Acompanhe o uso da frota e o desempenho da equipe.</span></div>
          <button
            className={`icon-button ${refreshing ? "spinning" : ""}`}
            type="button"
            onClick={() => void loadData(true)}
            aria-label="Atualizar indicadores"
            disabled={refreshing}
          >↻</button>
        </header>

        <section className="management-filter" aria-label="Período de análise">
          <div className="period-preset">
            {[7, 30, 90].map((days) => (
              <button className={preset === days ? "active" : ""} type="button" onClick={() => applyPreset(days)} key={days}>
                {days} dias
              </button>
            ))}
          </div>
          <div className="custom-period">
            <label><span>De</span><input type="date" value={startDate} max={endDate} onChange={(event) => { setPreset(0); setStartDate(event.target.value); }} /></label>
            <span aria-hidden="true">→</span>
            <label><span>Até</span><input type="date" value={endDate} min={startDate} max={today} onChange={(event) => { setPreset(0); setEndDate(event.target.value); }} /></label>
          </div>
          <p><strong>{data?.period.businessDays ?? "—"}</strong> dias úteis · capacidade-base de {data?.period.capacityHours ?? "—"} h</p>
        </section>

        {notice && <div className="management-error" role="alert"><span>!</span>{notice}<button type="button" onClick={() => void loadData()}>Tentar novamente</button></div>}

        <section className="management-kpis" aria-label="Indicadores principais">
          <article className="management-kpi hero-kpi">
            <div className="kpi-icon">◷</div><p>Tempo total em uso</p><strong>{loading ? "—" : formatHours(data?.summary.usageHours ?? 0)}</strong>
            <span>de {formatHours(data?.summary.plannedHours ?? 0)} planejadas</span>
          </article>
          <article className="management-kpi">
            <div className="kpi-icon purple">♙</div><p>Maior utilização</p><strong>{loading ? "—" : data?.highlights.topDriver?.name ?? "Sem dados"}</strong>
            <span>{data?.highlights.topDriver ? `${formatHours(data.highlights.topDriver.usageHours)} · ${data.highlights.topDriver.trips} utilizações` : "Nenhuma saída registrada"}</span>
          </article>
          <article className="management-kpi">
            <div className="kpi-icon blue">◒</div><p>Ocupação da capacidade</p><strong>{loading ? "—" : `${data?.summary.capacityUtilization ?? 0}%`}</strong>
            <span>janela de 9 h por dia útil</span>
          </article>
          <article className="management-kpi">
            <div className="kpi-icon amber">↔</div><p>Média por utilização</p><strong>{loading ? "—" : formatHours(data?.summary.averageTripHours ?? 0)}</strong>
            <span>{data?.summary.actualTrips ?? 0} utilizações efetivas</span>
          </article>
          <article className="management-kpi">
            <div className="kpi-icon mint">◫</div><p>Reservas no período</p><strong>{loading ? "—" : data?.summary.reservations ?? 0}</strong>
            <span>{data?.summary.activeDrivers ?? 0} motoristas com uso efetivo</span>
          </article>
        </section>

        <section className="management-highlights" aria-label="Destaques do período">
          <article>
            <span className="highlight-number">01</span>
            <div><p>VEÍCULO MAIS UTILIZADO</p><h2>{data?.highlights.topVehicle ? `${data.highlights.topVehicle.model} · ${data.highlights.topVehicle.plate}` : "Sem utilização no período"}</h2><span>{data?.highlights.topVehicle ? `${formatHours(data.highlights.topVehicle.usageHours)} em ${data.highlights.topVehicle.trips} utilizações` : "Altere o período para consultar o histórico."}</span></div>
          </article>
          <article>
            <span className="highlight-number">02</span>
            <div><p>MAIOR TEMPO POR MOTORISTA</p><h2>{data?.highlights.topDriver?.name ?? "Sem utilização no período"}</h2><span>{data?.highlights.topDriver ? `${formatHours(data.highlights.topDriver.usageHours)} · média de ${formatHours(data.highlights.topDriver.averageHours)}` : "Nenhuma saída iniciada."}</span></div>
          </article>
          <article>
            <span className="highlight-number">03</span>
            <div><p>UTILIZAÇÃO MAIS LONGA</p><h2>{data?.highlights.longestTrip ? `${data.highlights.longestTrip.driver} · ${formatHours(data.highlights.longestTrip.hours)}` : "Sem utilização no período"}</h2><span>{data?.highlights.longestTrip ? `${data.highlights.longestTrip.vehicle} · ${data.highlights.longestTrip.destination}` : "Aguardando registros concluídos ou em andamento."}</span></div>
          </article>
        </section>

        <div className="management-layout">
          <section className="management-card vehicle-ranking-card">
            <div className="management-card-heading"><div><p className="section-kicker">FROTA</p><h2>Tempo de utilização por veículo</h2></div><span>horas efetivas</span></div>
            <div className="horizontal-ranking">
              {loading
                ? Array.from({ length: 5 }, (_, index) => <div className="ranking-skeleton" key={index} />)
                : data?.vehicles.map((vehicle, index) => (
                    <div className="ranking-row" key={vehicle.id}>
                      <span className="ranking-position">{String(index + 1).padStart(2, "0")}</span>
                      <div className="ranking-label"><strong>{vehicle.model}</strong><small>{vehicle.plate} · {vehicle.trips} utilizações</small></div>
                      <div className="ranking-track"><span style={{ width: `${Math.max(2, (vehicle.usageHours / maxVehicleHours) * 100)}%` }} /></div>
                      <strong className="ranking-value">{formatHours(vehicle.usageHours)}</strong>
                    </div>
                  ))}
            </div>
          </section>

          <section className="management-card quality-card">
            <div className="management-card-heading"><div><p className="section-kicker">QUALIDADE</p><h2>Disciplina operacional</h2></div></div>
            <div className="quality-grid">
              <MetricRing value={data?.summary.photoCompliance ?? 100} label="Fotos obrigatórias" />
              <MetricRing value={data?.summary.departurePunctuality ?? 0} label="Saídas pontuais" unavailable={data?.summary.departurePunctuality == null} />
              <MetricRing value={data?.summary.returnPunctuality ?? 0} label="Retornos pontuais" unavailable={data?.summary.returnPunctuality == null} />
              <MetricRing value={100 - (data?.summary.cancellationRate ?? 0)} label="Reservas mantidas" />
            </div>
          </section>
        </div>

        <div className="management-layout lower">
          <section className="management-card driver-ranking-card">
            <div className="management-card-heading"><div><p className="section-kicker">EQUIPE</p><h2>Ranking de utilização por motorista</h2></div><span>{data?.drivers.length ?? 0} com uso efetivo</span></div>
            <div className="driver-ranking">
              {data?.drivers.length ? data.drivers.map((driver, index) => (
                <article key={driver.email}>
                  <span className={`driver-rank rank-${index + 1}`}>{index + 1}</span>
                  <span className="management-driver-avatar">{driver.name.slice(0, 2).toUpperCase()}</span>
                  <div className="driver-rank-copy"><strong>{driver.name}</strong><small>{driver.trips} utilizações · {driver.vehicles.length} veículos · {driver.destinations} destinos</small><span><i style={{ width: `${Math.max(3, (driver.usageHours / maxDriverHours) * 100)}%` }} /></span></div>
                  <div className="driver-rank-hours"><strong>{formatHours(driver.usageHours)}</strong><small>média {formatHours(driver.averageHours)}</small></div>
                </article>
              )) : <div className="management-empty"><strong>Nenhuma utilização efetiva.</strong><p>Reservas iniciadas ou concluídas aparecerão aqui.</p></div>}
            </div>
          </section>

          <section className="management-card trend-card">
            <div className="management-card-heading"><div><p className="section-kicker">EVOLUÇÃO</p><h2>Horas de utilização por dia</h2></div><span>{trend.length > 0 ? `${formatCompactDate(trend[0].date)} — ${formatCompactDate(trend[trend.length - 1].date)}` : ""}</span></div>
            <div className="trend-chart" aria-label="Gráfico de horas utilizadas por dia">
              {trend.map((day, index) => (
                <div className="trend-column" key={day.date} title={`${formatCompactDate(day.date)}: ${formatHours(day.usageHours)}`}>
                  <span className="trend-value">{day.usageHours > 0 ? day.usageHours.toLocaleString("pt-BR") : ""}</span>
                  <div><i style={{ height: `${Math.max(day.usageHours > 0 ? 6 : 1, (day.usageHours / maxDailyHours) * 100)}%` }} /></div>
                  <small>{index === 0 || index === trend.length - 1 || index % Math.max(1, Math.floor(trend.length / 5)) === 0 ? formatCompactDate(day.date).split(" ")[0] : ""}</small>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="management-layout compact">
          <section className="management-card alerts-card">
            <div className="management-card-heading"><div><p className="section-kicker">ATENÇÃO</p><h2>Alertas para gestão</h2></div><span>{alerts.length} pontos</span></div>
            <div className="management-alerts">
              {alerts.length ? alerts.map((alert) => (
                <article className={alert.tone} key={alert.title}><span>{alert.icon}</span><div><strong>{alert.title}</strong><p>{alert.text}</p></div></article>
              )) : <article className="success"><span>✓</span><div><strong>Operação sem alertas críticos</strong><p>Não há pendências relevantes no período selecionado.</p></div></article>}
            </div>
          </section>

          <section className="management-card destinations-card">
            <div className="management-card-heading"><div><p className="section-kicker">DESTINOS</p><h2>Locais mais visitados</h2></div></div>
            <ol>
              {data?.destinations.length ? data.destinations.map((destination) => (
                <li key={destination.name}><span>⌖</span><div><strong>{destination.name}</strong><small>{destination.visits} visitas</small></div><strong>{formatHours(destination.usageHours)}</strong></li>
              )) : <li className="management-empty"><div><strong>Sem destinos registrados</strong><small>Aguardando utilizações efetivas.</small></div></li>}
            </ol>
          </section>
        </div>

        <section className="management-card fleet-detail-card">
          <div className="management-card-heading"><div><p className="section-kicker">DETALHAMENTO</p><h2>Avaliação individual da frota</h2></div><span>{data?.summary.totalVehicles ?? 0} veículos ativos</span></div>
          <div className="fleet-detail-table" role="table" aria-label="Indicadores detalhados por veículo">
            <div className="fleet-detail-row head" role="row">
              <span role="columnheader">Veículo</span><span role="columnheader">Odômetro</span><span role="columnheader">Uso efetivo</span><span role="columnheader">Planejado</span><span role="columnheader">Execução</span><span role="columnheader">Motoristas</span><span role="columnheader">Fotos</span><span role="columnheader">Último uso</span>
            </div>
            {data?.vehicles.map((vehicle) => (
              <article className="fleet-detail-row" role="row" key={vehicle.id}>
                <div className="fleet-detail-vehicle" role="cell"><span>▰</span><div><strong>{vehicle.model}</strong><small>{vehicle.plate} · {vehicle.color}</small></div></div>
                <strong role="cell" className={vehicle.odometerKm == null ? "attention" : ""}>{formatKm(vehicle.odometerKm)}</strong>
                <strong role="cell">{formatHours(vehicle.usageHours)}</strong>
                <span role="cell">{formatHours(vehicle.plannedHours)}</span>
                <div className="execution-cell" role="cell"><span><i style={{ width: `${vehicle.executionRate}%` }} /></span><strong>{vehicle.executionRate}%</strong></div>
                <span role="cell">{vehicle.drivers.length ? vehicle.drivers.join(", ") : "—"}</span>
                <span role="cell" className={vehicle.photoCompliance != null && vehicle.photoCompliance < 100 ? "attention" : ""}>{vehicle.photoCompliance == null ? "—" : `${vehicle.photoCompliance}%`}</span>
                <span role="cell">{formatDateTime(vehicle.lastUse)}</span>
              </article>
            ))}
          </div>
        </section>

        <footer>
          <FleetMark />
          <p>Indicadores calculados a partir das reservas, saídas, chegadas e fotos registradas no RotaFácil.</p>
          <span>Gestão por dados · atualização sob demanda</span>
        </footer>
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        <Link href="/"><span>⌂</span>Início</Link>
        <Link href="/#frota"><span>▣</span>Veículos</Link>
        <Link href="/agenda" className="mobile-nav-main"><span>◫</span>Agenda</Link>
        <Link className="active" href="/gestao"><span>◒</span>Gestão</Link>
        <Link href="/#registros"><span>◎</span>Registros</Link>
      </nav>
    </div>
  );
}
