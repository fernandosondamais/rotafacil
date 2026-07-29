"use client";

import {
  FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

type AgendaStatus = "planned" | "confirmed" | "in_progress" | "completed" | "cancelled";
type MaintenanceStatus = Exclude<AgendaStatus, "confirmed">;
type VehicleUseStatus = "reserved" | "in_use" | "completed" | "cancelled";
type EntryType = "vehicle_use" | "visit" | "maintenance";

type Driver = { id: string; name: string; phone: string; color: string };
type WorkSite = {
  id: string;
  name: string;
  city: string;
  address: string;
  contactName: string;
  contactPhone: string;
  notes: string;
};
type Vehicle = { id: string; model: string; plate: string; color: string; label: string };
type Visit = {
  id: string;
  driverId: string;
  driverName: string;
  driverColor: string;
  workSiteId: string;
  workSiteName: string;
  city: string;
  address: string;
  vehicleId: string | null;
  vehicleLabel: string | null;
  visitDate: string;
  startTime: string;
  endTime: string;
  status: AgendaStatus;
  purpose: string;
  notes: string;
};
type Maintenance = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  driverId: string;
  driverName: string;
  driverColor: string;
  startAt: string;
  endAt: string;
  status: MaintenanceStatus;
  serviceDescription: string;
  provider: string;
  notes: string;
};
type VehicleUse = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  driverId: string;
  driverName: string;
  driverColor: string;
  destination: string;
  purpose: string;
  startAt: string;
  endAt: string;
  status: VehicleUseStatus;
  notes: string;
};
type AgendaData = {
  startDate: string;
  endDate: string;
  days: number;
  actor: { name: string; email: string };
  summary: {
    drivers: number;
    visits: number;
    maintenances: number;
    vehicleUses: number;
    confirmed: number;
    completed: number;
    driversScheduled: number;
  };
  drivers: Driver[];
  workSites: WorkSite[];
  vehicles: Vehicle[];
  visits: Visit[];
  maintenances: Maintenance[];
  vehicleUses: VehicleUse[];
};
type VisitForm = {
  driverId: string;
  workSiteId: string;
  vehicleId: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  notes: string;
};
type MaintenanceForm = {
  driverId: string;
  vehicleId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  serviceDescription: string;
  provider: string;
  notes: string;
};
type VehicleUseForm = {
  driverId: string;
  vehicleId: string;
  useDate: string;
  startTime: string;
  endTime: string;
  destination: string;
  purpose: string;
  notes: string;
};
type DriverForm = {
  name: string;
  phone: string;
  color: string;
};

const statusCopy: Record<AgendaStatus, { label: string; short: string }> = {
  planned: { label: "Planejada", short: "Planejada" },
  confirmed: { label: "Confirmada", short: "Confirmada" },
  in_progress: { label: "Em andamento", short: "Em visita" },
  completed: { label: "Concluída", short: "Concluída" },
  cancelled: { label: "Cancelada", short: "Cancelada" },
};

const vehicleUseStatusCopy: Record<VehicleUseStatus, string> = {
  reserved: "Reservado",
  in_use: "Em uso",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function startOfWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function makeDateRange(start: string, days: number) {
  return Array.from({ length: days }, (_, index) => addDays(start, index));
}

function dateLabel(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return {
    weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(value)
      .replace(".", ""),
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(value),
  };
}

function periodLabel(start: string, end: string) {
  const format = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
      .format(new Date(`${value}T12:00:00`))
      .replace(".", "");
  return `${format(start)} — ${format(end)}`;
}

function isWeekend(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
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

export function AgendaBoard() {
  const [startDate, setStartDate] = useState(() => startOfWeek(todayInSaoPaulo()));
  const [days, setDays] = useState(14);
  const [agenda, setAgenda] = useState<AgendaData | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [driversModalOpen, setDriversModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>("vehicle_use");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<VisitForm>({
    driverId: "",
    workSiteId: "",
    vehicleId: "",
    visitDate: todayInSaoPaulo(),
    startTime: "08:00",
    endTime: "17:00",
    purpose: "Visita de obra",
    notes: "",
  });
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>({
    driverId: "",
    vehicleId: "",
    startDate: todayInSaoPaulo(),
    startTime: "08:00",
    endDate: todayInSaoPaulo(),
    endTime: "17:00",
    serviceDescription: "Revisão preventiva",
    provider: "",
    notes: "",
  });
  const [vehicleUseForm, setVehicleUseForm] = useState<VehicleUseForm>({
    driverId: "",
    vehicleId: "",
    useDate: todayInSaoPaulo(),
    startTime: "08:00",
    endTime: "17:00",
    destination: "Visita externa",
    purpose: "Utilização do veículo",
    notes: "",
  });
  const [driverForm, setDriverForm] = useState<DriverForm>({
    name: "",
    phone: "",
    color: "#0f766e",
  });

  const loadAgenda = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      const params = new URLSearchParams({ start: startDate, days: String(days) });
      if (driverFilter) params.set("driver", driverFilter);
      if (status) params.set("status", status);
      if (deferredQuery.trim()) params.set("query", deferredQuery.trim());
      try {
        const response = await fetch(`/api/agenda?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(await readApiError(response));
        setAgenda((await response.json()) as AgendaData);
      } catch (error) {
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : "Falha ao carregar a agenda.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, deferredQuery, driverFilter, startDate, status],
  );

  useEffect(() => {
    // A carga inicial sincroniza a interface com a agenda persistida.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAgenda();
  }, [loadAgenda]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const dates = useMemo(() => makeDateRange(startDate, days), [days, startDate]);
  const visibleDrivers = useMemo(
    () => agenda?.drivers.filter((driver) => !driverFilter || driver.id === driverFilter) ?? [],
    [agenda, driverFilter],
  );
  const visitsByCell = useMemo(() => {
    const cells = new Map<string, Visit[]>();
    for (const visit of agenda?.visits ?? []) {
      const key = `${visit.driverId}:${visit.visitDate}`;
      const current = cells.get(key) ?? [];
      current.push(visit);
      cells.set(key, current);
    }
    return cells;
  }, [agenda]);
  const maintenancesByCell = useMemo(() => {
    const cells = new Map<string, Maintenance[]>();
    for (const maintenance of agenda?.maintenances ?? []) {
      let currentDate = maintenance.startAt.slice(0, 10);
      const endDate = maintenance.endAt.slice(0, 10);
      while (currentDate <= endDate) {
        const key = `${maintenance.driverId}:${currentDate}`;
        const current = cells.get(key) ?? [];
        current.push(maintenance);
        cells.set(key, current);
        currentDate = addDays(currentDate, 1);
      }
    }
    return cells;
  }, [agenda]);
  const vehicleUsesByCell = useMemo(() => {
    const cells = new Map<string, VehicleUse[]>();
    for (const vehicleUse of agenda?.vehicleUses ?? []) {
      let currentDate = vehicleUse.startAt.slice(0, 10);
      const endDate = vehicleUse.endAt.slice(0, 10);
      while (currentDate <= endDate) {
        const key = `${vehicleUse.driverId}:${currentDate}`;
        const current = cells.get(key) ?? [];
        current.push(vehicleUse);
        cells.set(key, current);
        currentDate = addDays(currentDate, 1);
      }
    }
    return cells;
  }, [agenda]);

  const actorName = agenda?.actor.name ?? "Paulo";
  const actorInitials = actorName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function openEntry(date = todayInSaoPaulo(), driverId = "", type: EntryType = "vehicle_use") {
    setEntryType(type);
    setForm((current) => ({ ...current, visitDate: date, driverId: driverId || current.driverId }));
    setMaintenanceForm((current) => ({
      ...current,
      startDate: date,
      endDate: date,
      driverId: driverId || current.driverId,
    }));
    setVehicleUseForm((current) => ({
      ...current,
      useDate: date,
      driverId: driverId || current.driverId,
    }));
    setModalOpen(true);
  }

  function changeForm(field: keyof VisitForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeMaintenanceForm(field: keyof MaintenanceForm, value: string) {
    setMaintenanceForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "startDate" && current.endDate < value ? { endDate: value } : {}),
    }));
  }

  function changeVehicleUseForm(field: keyof VehicleUseForm, value: string) {
    setVehicleUseForm((current) => ({ ...current, [field]: value }));
  }

  function openCellEntry(date: string, driverId: string) {
    openEntry(date, driverId, "vehicle_use");
  }

  async function submitDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("create-driver");
    try {
      const response = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driverForm),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setDriverForm((current) => ({ ...current, name: "", phone: "" }));
      setNotice({ tone: "success", text: "Motorista adicionado à agenda." });
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao adicionar o motorista.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function removeDriver(driver: Driver) {
    const confirmed = window.confirm(
      `Remover ${driver.name} da agenda? Os compromissos futuros deste motorista serão cancelados. O histórico concluído será preservado.`,
    );
    if (!confirmed) return;

    setBusyKey(`remove-driver-${driver.id}`);
    try {
      const response = await fetch(`/api/drivers/${driver.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as {
        driver: {
          cancelled: { reservations: number; visits: number; maintenances: number };
        };
      };
      const totalCancelled = Object.values(payload.driver.cancelled).reduce(
        (total, value) => total + value,
        0,
      );
      if (driverFilter === driver.id) setDriverFilter("");
      setForm((current) => ({ ...current, driverId: current.driverId === driver.id ? "" : current.driverId }));
      setMaintenanceForm((current) => ({
        ...current,
        driverId: current.driverId === driver.id ? "" : current.driverId,
      }));
      setVehicleUseForm((current) => ({
        ...current,
        driverId: current.driverId === driver.id ? "" : current.driverId,
      }));
      setNotice({
        tone: "success",
        text: totalCancelled
          ? `Motorista removido e ${totalCancelled} compromisso${totalCancelled === 1 ? "" : "s"} futuro${totalCancelled === 1 ? "" : "s"} cancelado${totalCancelled === 1 ? "" : "s"}.`
          : "Motorista removido da agenda.",
      });
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao remover o motorista.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function submitVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("create");
    try {
      const response = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setModalOpen(false);
      setNotice({ tone: "success", text: "Visita adicionada à agenda do motorista." });
      setForm((current) => ({ ...current, workSiteId: "", vehicleId: "", notes: "" }));
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao criar a visita.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function submitVehicleUse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const driver = agenda?.drivers.find((item) => item.id === vehicleUseForm.driverId);
    if (!driver) {
      setNotice({ tone: "error", text: "Selecione o motorista responsável." });
      return;
    }
    setBusyKey("create-vehicle-use");
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleUseForm.vehicleId,
          driverId: vehicleUseForm.driverId,
          userName: driver.name,
          destination: vehicleUseForm.destination,
          purpose: vehicleUseForm.purpose,
          startAt: `${vehicleUseForm.useDate}T${vehicleUseForm.startTime}:00-03:00`,
          endAt: `${vehicleUseForm.useDate}T${vehicleUseForm.endTime}:00-03:00`,
          notes: vehicleUseForm.notes,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setModalOpen(false);
      setNotice({ tone: "success", text: "Utilização do veículo adicionada à agenda." });
      setVehicleUseForm((current) => ({
        ...current,
        vehicleId: "",
        destination: "Visita externa",
        purpose: "Utilização do veículo",
        notes: "",
      }));
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao reservar o veículo.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function submitMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("create-maintenance");
    try {
      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintenanceForm),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setModalOpen(false);
      setNotice({ tone: "success", text: "Manutenção programada e veículo bloqueado no período." });
      setMaintenanceForm((current) => ({
        ...current,
        vehicleId: "",
        serviceDescription: "Revisão preventiva",
        provider: "",
        notes: "",
      }));
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao programar a manutenção.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function updateVisit(visit: Visit, action: "confirm" | "start" | "complete" | "cancel") {
    setBusyKey(`${action}-${visit.id}`);
    try {
      const response = await fetch(`/api/agenda/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const messages = {
        confirm: "Visita confirmada.",
        start: "Visita iniciada.",
        complete: "Visita concluída.",
        cancel: "Visita cancelada.",
      };
      setNotice({ tone: "success", text: messages[action] });
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao atualizar a visita.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function updateMaintenance(
    maintenance: Maintenance,
    action: "start" | "complete" | "cancel",
  ) {
    setBusyKey(`maintenance-${action}-${maintenance.id}`);
    try {
      const response = await fetch(`/api/maintenance/${maintenance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const messages = {
        start: "Manutenção iniciada.",
        complete: "Manutenção concluída e veículo liberado.",
        cancel: "Manutenção cancelada e veículo liberado.",
      };
      setNotice({ tone: "success", text: messages[action] });
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao atualizar a manutenção.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function cancelVehicleUse(vehicleUse: VehicleUse) {
    setBusyKey(`vehicle-use-cancel-${vehicleUse.id}`);
    try {
      const response = await fetch(`/api/reservations/${vehicleUse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setNotice({ tone: "success", text: "Utilização cancelada e veículo liberado." });
      await loadAgenda(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao cancelar a utilização.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="app-shell agenda-app">
      <aside className="sidebar" aria-label="Navegação principal">
        <Link className="brand" href="/" aria-label="RotaFácil — início">
          <FleetMark />
          <span>Rota<strong>Fácil</strong></span>
        </Link>
        <nav className="main-nav">
          <Link className="nav-item" href="/"><span className="nav-icon">⌂</span>Visão geral</Link>
          <Link className="nav-item" href="/#frota"><span className="nav-icon">▣</span>Veículos</Link>
          <Link className="nav-item active" href="/agenda"><span className="nav-icon">◫</span>Agenda</Link>
          <Link className="nav-item" href="/gestao"><span className="nav-icon">◒</span>Gestão</Link>
          <Link className="nav-item" href="/#registros"><span className="nav-icon">◎</span>Registros</Link>
        </nav>
        <div className="sidebar-note">
          <span className="sidebar-note-mark">AG</span>
          <div><strong>Rotas organizadas</strong><p>Motoristas e obras no mesmo mapa.</p></div>
        </div>
        <button className="profile-card" type="button" aria-label={`Perfil de ${actorName}`}>
          <span className="avatar">{actorInitials || "P"}</span>
          <span className="profile-copy"><strong>{actorName}</strong><small>Colaborador</small></span>
          <span aria-hidden="true">•••</span>
        </button>
      </aside>

      <main className="main-content agenda-main">
        <header className="topbar agenda-topbar">
          <div><p className="eyebrow">PLANEJAMENTO DE CAMPO</p><h1>Agenda operacional</h1><span>Organize visitas, motoristas e manutenções em uma única visão.</span></div>
          <div className="top-actions">
            <button
              className={`icon-button ${refreshing ? "spinning" : ""}`}
              type="button"
              onClick={() => void loadAgenda(true)}
              aria-label="Atualizar agenda"
              disabled={refreshing}
            >↻</button>
            <button className="secondary-button driver-manager-open" type="button" onClick={() => setDriversModalOpen(true)}>
              <span aria-hidden="true">♙</span>Motoristas
            </button>
            <button className="primary-button" type="button" onClick={() => openEntry()}>
              <span aria-hidden="true">＋</span>Novo agendamento
            </button>
          </div>
        </header>

        <section className="agenda-hero" aria-labelledby="agenda-period-title">
          <div>
            <p className="section-kicker">PERÍODO VISÍVEL</p>
            <h2 id="agenda-period-title">{periodLabel(startDate, addDays(startDate, days - 1))}</h2>
            <p>Clique em um espaço livre para programar uma visita ou manutenção.</p>
          </div>
          <div className="period-controls">
            <div className="period-arrows">
              <button type="button" onClick={() => setStartDate(addDays(startDate, -7))} aria-label="Semana anterior">←</button>
              <button type="button" onClick={() => setStartDate(startOfWeek(todayInSaoPaulo()))}>Semana atual</button>
              <button type="button" onClick={() => setStartDate(addDays(startDate, 7))} aria-label="Próxima semana">→</button>
            </div>
            <label>
              <span>Exibir</span>
              <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                <option value={7}>1 semana</option>
                <option value={14}>2 semanas</option>
                <option value={21}>3 semanas</option>
              </select>
            </label>
          </div>
        </section>

        <section className="agenda-summary" aria-label="Resumo da agenda">
          <article><span className="summary-symbol green">♙</span><div><strong>{loading ? "—" : agenda?.summary.drivers ?? 0}</strong><p>motoristas ativos</p></div></article>
          <article><span className="summary-symbol blue">◫</span><div><strong>{loading ? "—" : agenda?.summary.visits ?? 0}</strong><p>visitas no período</p></div></article>
          <article><span className="summary-symbol vehicle-use">▰</span><div><strong>{loading ? "—" : agenda?.summary.vehicleUses ?? 0}</strong><p>usos de veículos</p></div></article>
          <article><span className="summary-symbol maintenance">⚙</span><div><strong>{loading ? "—" : agenda?.summary.maintenances ?? 0}</strong><p>manutenções</p></div></article>
          <article><span className="summary-symbol amber">✓</span><div><strong>{loading ? "—" : agenda?.summary.confirmed ?? 0}</strong><p>confirmadas</p></div></article>
          <article><span className="summary-symbol mint">→</span><div><strong>{loading ? "—" : agenda?.summary.driversScheduled ?? 0}</strong><p>motoristas escalados</p></div></article>
        </section>

        <section className="agenda-panel">
          <div className="agenda-toolbar">
            <label className="agenda-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar motorista, obra, veículo ou manutenção"
              />
            </label>
            <label className="toolbar-select">
              <span>Motorista</span>
              <select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}>
                <option value="">Todos</option>
                {agenda?.drivers.map((driver) => <option value={driver.id} key={driver.id}>{driver.name}</option>)}
              </select>
            </label>
          </div>

          <div className="status-filters" aria-label="Filtrar por status">
            <button className={!status ? "active" : ""} type="button" onClick={() => setStatus("")}>Todas</button>
            {(Object.keys(statusCopy) as AgendaStatus[]).map((key) => (
              <button className={`${status === key ? "active" : ""} ${key}`} type="button" onClick={() => setStatus(key)} key={key}>
                <i />{statusCopy[key].label}
              </button>
            ))}
          </div>

          <div className="agenda-legend">
            <span><i className="planned" /> Planejada</span>
            <span><i className="confirmed" /> Confirmada</span>
            <span><i className="in_progress" /> Em andamento</span>
            <span><i className="completed" /> Concluída</span>
            <span><i className="cancelled" /> Cancelada</span>
            <span><i className="vehicle-use" /> Uso do veículo</span>
            <span><i className="maintenance" /> Manutenção</span>
          </div>

          <div className="agenda-scroll">
            <div className="agenda-grid" style={{ "--agenda-days": days } as React.CSSProperties}>
              <div className="agenda-corner"><span>Motorista</span><small>{visibleDrivers.length} na visão</small></div>
              {dates.map((date) => {
                const label = dateLabel(date);
                return (
                  <div className={`agenda-date-head ${isWeekend(date) ? "weekend" : ""} ${date === todayInSaoPaulo() ? "today" : ""}`} key={date}>
                    <span>{label.weekday}</span><strong>{label.day}</strong>
                  </div>
                );
              })}

              {loading
                ? Array.from({ length: 3 }, (_, index) => (
                    <div className="agenda-loading-row" key={index} style={{ gridColumn: `1 / span ${days + 1}` }} />
                  ))
                : visibleDrivers.map((driver) => (
                    <div className="agenda-driver-row" key={driver.id}>
                      <div className="agenda-driver">
                        <span className="driver-avatar" style={{ background: driver.color }}>{driver.name.slice(0, 2).toUpperCase()}</span>
                        <div><strong>{driver.name}</strong><small>{driver.phone}</small></div>
                      </div>
                      {dates.map((date) => {
                        const cellVisits = visitsByCell.get(`${driver.id}:${date}`) ?? [];
                        const cellMaintenances = maintenancesByCell.get(`${driver.id}:${date}`) ?? [];
                        const cellVehicleUses = vehicleUsesByCell.get(`${driver.id}:${date}`) ?? [];
                        return (
                          <div
                            className={`agenda-cell clickable ${isWeekend(date) ? "weekend" : ""} ${date === todayInSaoPaulo() ? "today" : ""}`}
                            key={date}
                            onClick={(event) => {
                              if ((event.target as HTMLElement).closest("article, button, a")) return;
                              openCellEntry(date, driver.id);
                            }}
                          >
                            <button className="cell-add" type="button" onClick={() => openCellEntry(date, driver.id)} aria-label={`Atribuir veículo e horário para ${driver.name} em ${date}`}>＋</button>
                            {cellVehicleUses.map((vehicleUse) => (
                              <article className={`visit-card vehicle-use-card ${vehicleUse.status}`} key={vehicleUse.id}>
                                <div className="visit-card-top">
                                  <span className="vehicle-use-kind"><i />Uso do veículo</span>
                                  <strong>{vehicleUse.startAt.slice(11, 16)}–{vehicleUse.endAt.slice(11, 16)}</strong>
                                </div>
                                <h3>{vehicleUse.vehicleLabel}</h3>
                                <p><span aria-hidden="true">⌖</span>{vehicleUse.destination}</p>
                                <p className="visit-purpose">{vehicleUseStatusCopy[vehicleUse.status]}</p>
                                <small>{vehicleUse.purpose}</small>
                                {vehicleUse.status === "reserved" && (
                                  <div className="visit-actions">
                                    <Link href="/">Abrir frota</Link>
                                    <button className="cancel" type="button" disabled={busyKey !== null} onClick={() => void cancelVehicleUse(vehicleUse)} aria-label="Cancelar utilização">×</button>
                                  </div>
                                )}
                              </article>
                            ))}
                            {cellVisits.map((visit) => (
                              <article className={`visit-card ${visit.status}`} key={visit.id}>
                                <div className="visit-card-top">
                                  <span className="visit-status"><i />{statusCopy[visit.status].short}</span>
                                  <strong>{visit.startTime}–{visit.endTime}</strong>
                                </div>
                                <h3>{visit.workSiteName}</h3>
                                <p><span aria-hidden="true">⌖</span>{visit.city}</p>
                                <p className="visit-purpose">{visit.purpose}</p>
                                {visit.vehicleLabel && <small><span aria-hidden="true">▰</span>{visit.vehicleLabel}</small>}
                                <div className="visit-actions">
                                  {visit.status === "planned" && <button type="button" disabled={busyKey !== null} onClick={() => void updateVisit(visit, "confirm")}>Confirmar</button>}
                                  {(visit.status === "planned" || visit.status === "confirmed") && <button type="button" disabled={busyKey !== null} onClick={() => void updateVisit(visit, "start")}>Iniciar</button>}
                                  {visit.status === "in_progress" && <button type="button" disabled={busyKey !== null} onClick={() => void updateVisit(visit, "complete")}>Concluir</button>}
                                  {(visit.status === "planned" || visit.status === "confirmed") && <button className="cancel" type="button" disabled={busyKey !== null} onClick={() => void updateVisit(visit, "cancel")} aria-label="Cancelar visita">×</button>}
                                </div>
                              </article>
                            ))}
                            {cellMaintenances.map((maintenance) => (
                              <article className={`visit-card maintenance-card ${maintenance.status}`} key={maintenance.id}>
                                <div className="visit-card-top">
                                  <span className="maintenance-kind"><i />Manutenção</span>
                                  <strong>{statusCopy[maintenance.status].short}</strong>
                                </div>
                                <h3>{maintenance.vehicleLabel}</h3>
                                <p className="visit-purpose"><span aria-hidden="true">⚙</span>{maintenance.serviceDescription}</p>
                                <p><span aria-hidden="true">◷</span>{maintenance.startAt.slice(11, 16)}–{maintenance.endAt.slice(11, 16)}</p>
                                {maintenance.provider && <small><span aria-hidden="true">⌂</span>{maintenance.provider}</small>}
                                <div className="visit-actions">
                                  {maintenance.status === "planned" && <button type="button" disabled={busyKey !== null} onClick={() => void updateMaintenance(maintenance, "start")}>Iniciar</button>}
                                  {maintenance.status === "in_progress" && <button type="button" disabled={busyKey !== null} onClick={() => void updateMaintenance(maintenance, "complete")}>Concluir</button>}
                                  {maintenance.status === "planned" && <button className="cancel" type="button" disabled={busyKey !== null} onClick={() => void updateMaintenance(maintenance, "cancel")} aria-label="Cancelar manutenção">×</button>}
                                </div>
                              </article>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
            </div>
          </div>

          {!loading && visibleDrivers.length === 0 && (
            <div className="empty-schedule">
              <strong>Nenhum motorista encontrado.</strong>
              {agenda?.drivers.length === 0
                ? <button type="button" onClick={() => setDriversModalOpen(true)}>Adicionar motorista</button>
                : <button type="button" onClick={() => { setDriverFilter(""); setStatus(""); setQuery(""); }}>Limpar filtros</button>}
            </div>
          )}
        </section>

        <footer>
          <FleetMark />
          <p>Agenda RotaFácil: planejamento diário com histórico e regras de conflito.</p>
          <span>Banco conectado · pronta para mobile</span>
        </footer>
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        <Link href="/"><span>⌂</span>Início</Link>
        <Link href="/#frota"><span>▣</span>Veículos</Link>
        <button type="button" onClick={() => openEntry()} aria-label="Novo agendamento">＋</button>
        <Link className="active" href="/agenda"><span>◫</span>Agenda</Link>
        <Link href="/gestao"><span>◒</span>Gestão</Link>
      </nav>

      {driversModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDriversModalOpen(false)}>
          <section className="reservation-modal driver-manager-modal" role="dialog" aria-modal="true" aria-labelledby="driver-manager-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="section-kicker">CADASTRO DA EQUIPE</p>
                <h2 id="driver-manager-title">Gerenciar motoristas</h2>
                <span>Adicione os motoristas reais e remova os registros de exemplo.</span>
              </div>
              <button type="button" onClick={() => setDriversModalOpen(false)} aria-label="Fechar">×</button>
            </div>

            <form className="driver-manager-form" onSubmit={submitDriver}>
              <label className="form-field full">
                <span>Nome do motorista</span>
                <input value={driverForm.name} minLength={2} maxLength={100} onChange={(event) => setDriverForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Fernando Valentim" required />
              </label>
              <label className="form-field">
                <span>Telefone <small>(opcional)</small></span>
                <input type="tel" value={driverForm.phone} maxLength={30} onChange={(event) => setDriverForm((current) => ({ ...current, phone: event.target.value }))} placeholder="(19) 99999-9999" />
              </label>
              <label className="form-field">
                <span>Cor na agenda</span>
                <select value={driverForm.color} onChange={(event) => setDriverForm((current) => ({ ...current, color: event.target.value }))}>
                  <option value="#0f766e">Verde</option>
                  <option value="#2563eb">Azul</option>
                  <option value="#7c3aed">Roxo</option>
                  <option value="#d97706">Laranja</option>
                  <option value="#db2777">Rosa</option>
                  <option value="#475569">Cinza</option>
                </select>
              </label>
              <div className="modal-actions full">
                <button className="primary-button" type="submit" disabled={busyKey !== null}>
                  {busyKey === "create-driver" ? "Adicionando…" : "Adicionar motorista"}
                </button>
              </div>
            </form>

            <div className="driver-manager-list" aria-live="polite">
              <div className="driver-manager-list-heading">
                <div><strong>Motoristas ativos</strong><small>{agenda?.drivers.length ?? 0} cadastrado{agenda?.drivers.length === 1 ? "" : "s"}</small></div>
                <span>Remover</span>
              </div>
              {agenda?.drivers.length ? agenda.drivers.map((driver) => (
                <article className="driver-manager-row" key={driver.id}>
                  <span className="driver-avatar" style={{ background: driver.color }}>{driver.name.slice(0, 2).toUpperCase()}</span>
                  <div><strong>{driver.name}</strong><small>{driver.phone || "Telefone não informado"}</small></div>
                  <button className="driver-remove-button" type="button" disabled={busyKey !== null} onClick={() => void removeDriver(driver)} aria-label={`Remover motorista ${driver.name}`}>
                    {busyKey === `remove-driver-${driver.id}` ? "Removendo…" : "Excluir"}
                  </button>
                </article>
              )) : (
                <div className="driver-manager-empty">Nenhum motorista ativo. Cadastre o primeiro motorista acima.</div>
              )}
            </div>
            <div className="form-note warning driver-manager-note"><span>!</span>Ao excluir, compromissos futuros serão cancelados e o histórico concluído será preservado. Atividades em andamento precisam ser concluídas primeiro.</div>
          </section>
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <section className="reservation-modal agenda-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p className="section-kicker">NOVO AGENDAMENTO</p><h2 id="agenda-modal-title">{entryType === "vehicle_use" ? "Atribuir veículo" : entryType === "visit" ? "Programar obra" : "Programar manutenção"}</h2><span>{entryType === "vehicle_use" ? "Defina o motorista e o horário de utilização." : entryType === "visit" ? "Defina o dia, motorista e local da visita." : "O veículo ficará indisponível durante todo o período."}</span></div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar">×</button>
            </div>
            <div className="agenda-type-switch" role="group" aria-label="Tipo de agendamento">
              <button className={entryType === "vehicle_use" ? "active vehicle-use" : "vehicle-use"} type="button" onClick={() => setEntryType("vehicle_use")}><span>▰</span>Uso do veículo</button>
              <button className={entryType === "visit" ? "active" : ""} type="button" onClick={() => setEntryType("visit")}><span>⌖</span>Visita à obra</button>
              <button className={entryType === "maintenance" ? "active maintenance" : "maintenance"} type="button" onClick={() => setEntryType("maintenance")}><span>⚙</span>Manutenção</button>
            </div>
            {entryType === "vehicle_use" ? (
              <form onSubmit={submitVehicleUse}>
                <label className="form-field full">
                  <span>Motorista</span>
                  <select value={vehicleUseForm.driverId} onChange={(event) => changeVehicleUseForm("driverId", event.target.value)} required>
                    <option value="">Selecione o motorista</option>
                    {agenda?.drivers.map((driver) => <option value={driver.id} key={driver.id}>{driver.name}</option>)}
                  </select>
                </label>
                <label className="form-field full">
                  <span>Veículo</span>
                  <select value={vehicleUseForm.vehicleId} onChange={(event) => changeVehicleUseForm("vehicleId", event.target.value)} required>
                    <option value="">Selecione um veículo cadastrado</option>
                    {agenda?.vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}
                  </select>
                </label>
                <label className="form-field full"><span>Data de utilização</span><input type="date" value={vehicleUseForm.useDate} onChange={(event) => changeVehicleUseForm("useDate", event.target.value)} required /></label>
                <label className="form-field"><span>Horário de saída</span><input type="time" value={vehicleUseForm.startTime} onChange={(event) => changeVehicleUseForm("startTime", event.target.value)} required /></label>
                <label className="form-field"><span>Horário de chegada</span><input type="time" value={vehicleUseForm.endTime} onChange={(event) => changeVehicleUseForm("endTime", event.target.value)} required /></label>
                <label className="form-field full"><span>Destino</span><input value={vehicleUseForm.destination} maxLength={240} onChange={(event) => changeVehicleUseForm("destination", event.target.value)} placeholder="Ex.: Stand de Sumaré e Hortolândia" required /></label>
                <label className="form-field full"><span>Motivo da utilização</span><input value={vehicleUseForm.purpose} maxLength={160} onChange={(event) => changeVehicleUseForm("purpose", event.target.value)} placeholder="Ex.: visita externa, retirada de material" /></label>
                <label className="form-field full"><span>Observações <small>(opcional)</small></span><textarea value={vehicleUseForm.notes} maxLength={1000} onChange={(event) => changeVehicleUseForm("notes", event.target.value)} placeholder="Informações úteis para a equipe…" /></label>
                <div className="form-note full"><span>✓</span>O sistema bloqueia conflitos de horário do veículo e do motorista.</div>
                <div className="modal-actions full"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={busyKey !== null}>{busyKey === "create-vehicle-use" ? "Salvando…" : "Reservar veículo"}</button></div>
              </form>
            ) : entryType === "visit" ? (
              <form onSubmit={submitVisit}>
                <label className="form-field">
                  <span>Dia</span>
                  <input type="date" value={form.visitDate} onChange={(event) => changeForm("visitDate", event.target.value)} required />
                </label>
                <label className="form-field">
                  <span>Motorista</span>
                  <select value={form.driverId} onChange={(event) => changeForm("driverId", event.target.value)} required>
                    <option value="">Selecione</option>
                    {agenda?.drivers.map((driver) => <option value={driver.id} key={driver.id}>{driver.name}</option>)}
                  </select>
                </label>
                <label className="form-field full">
                  <span>Obra de visita</span>
                  <select value={form.workSiteId} onChange={(event) => changeForm("workSiteId", event.target.value)} required>
                    <option value="">Selecione uma obra</option>
                    {agenda?.workSites.map((site) => <option value={site.id} key={site.id}>{site.name} · {site.city}</option>)}
                  </select>
                </label>
                <label className="form-field"><span>Início</span><input type="time" value={form.startTime} onChange={(event) => changeForm("startTime", event.target.value)} required /></label>
                <label className="form-field"><span>Término</span><input type="time" value={form.endTime} onChange={(event) => changeForm("endTime", event.target.value)} required /></label>
                <label className="form-field full">
                  <span>Veículo <small>(opcional)</small></span>
                  <select value={form.vehicleId} onChange={(event) => changeForm("vehicleId", event.target.value)}>
                    <option value="">Sem veículo definido</option>
                    {agenda?.vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}
                  </select>
                </label>
                <label className="form-field full"><span>Finalidade</span><input value={form.purpose} maxLength={160} onChange={(event) => changeForm("purpose", event.target.value)} placeholder="Ex.: vistoria, reunião técnica" /></label>
                <label className="form-field full"><span>Observações <small>(opcional)</small></span><textarea value={form.notes} maxLength={1000} onChange={(event) => changeForm("notes", event.target.value)} placeholder="Contato no local, orientações de acesso…" /></label>
                <div className="form-note full"><span>!</span>Conflitos de motorista e veículo são bloqueados automaticamente.</div>
                <div className="modal-actions full"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={busyKey !== null}>{busyKey === "create" ? "Salvando…" : "Adicionar à agenda"}</button></div>
              </form>
            ) : (
              <form onSubmit={submitMaintenance}>
                <label className="form-field full">
                  <span>Veículo ou equipamento</span>
                  <select value={maintenanceForm.vehicleId} onChange={(event) => changeMaintenanceForm("vehicleId", event.target.value)} required>
                    <option value="">Selecione um veículo cadastrado</option>
                    {agenda?.vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}
                  </select>
                </label>
                <label className="form-field full">
                  <span>Motorista responsável</span>
                  <select value={maintenanceForm.driverId} onChange={(event) => changeMaintenanceForm("driverId", event.target.value)} required>
                    <option value="">Selecione o responsável</option>
                    {agenda?.drivers.map((driver) => <option value={driver.id} key={driver.id}>{driver.name}</option>)}
                  </select>
                </label>
                <label className="form-field full"><span>Serviço a realizar</span><input value={maintenanceForm.serviceDescription} maxLength={160} onChange={(event) => changeMaintenanceForm("serviceDescription", event.target.value)} placeholder="Ex.: troca de óleo, revisão, pneus ou oficina" required /></label>
                <label className="form-field full"><span>Oficina ou fornecedor <small>(opcional)</small></span><input value={maintenanceForm.provider} maxLength={120} onChange={(event) => changeMaintenanceForm("provider", event.target.value)} placeholder="Nome da oficina ou prestador" /></label>
                <label className="form-field"><span>Data inicial</span><input type="date" value={maintenanceForm.startDate} onChange={(event) => changeMaintenanceForm("startDate", event.target.value)} required /></label>
                <label className="form-field"><span>Horário inicial</span><input type="time" value={maintenanceForm.startTime} onChange={(event) => changeMaintenanceForm("startTime", event.target.value)} required /></label>
                <label className="form-field"><span>Data final</span><input type="date" min={maintenanceForm.startDate} value={maintenanceForm.endDate} onChange={(event) => changeMaintenanceForm("endDate", event.target.value)} required /></label>
                <label className="form-field"><span>Horário final</span><input type="time" value={maintenanceForm.endTime} onChange={(event) => changeMaintenanceForm("endTime", event.target.value)} required /></label>
                <label className="form-field full"><span>Observações <small>(opcional)</small></span><textarea value={maintenanceForm.notes} maxLength={1000} onChange={(event) => changeMaintenanceForm("notes", event.target.value)} placeholder="Diagnóstico, peças, prazo previsto ou orientações…" /></label>
                <div className="form-note warning full"><span>⚙</span>A manutenção bloqueia apenas o veículo no período; o motorista pode continuar recebendo outras visitas.</div>
                <div className="modal-actions full"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={busyKey !== null}>{busyKey === "create-maintenance" ? "Salvando…" : "Programar manutenção"}</button></div>
              </form>
            )}
          </section>
        </div>
      )}

      {notice && (
        <div className={`toast ${notice.tone}`} role="status">
          <span>{notice.tone === "success" ? "✓" : "!"}</span>{notice.text}
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button>
        </div>
      )}
    </div>
  );
}
