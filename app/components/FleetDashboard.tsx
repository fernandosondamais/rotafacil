"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Availability = "available" | "reserved" | "in_use" | "maintenance";
type ReservationStatus = "reserved" | "in_use" | "completed" | "cancelled";

type Vehicle = {
  id: string;
  plate: string;
  model: string;
  color: string;
  category: string;
  odometerKm: number | null;
  maintenance: boolean;
  availability: Availability;
  activeReservation: {
    id: string;
    status: ReservationStatus;
    userName: string;
    destination: string;
    startAt: string;
    endAt: string;
  } | null;
  activeMaintenance: {
    id: string;
    status: "planned" | "in_progress";
    serviceDescription: string;
    provider: string;
    startAt: string;
    endAt: string;
  } | null;
};

type Reservation = {
  id: string;
  vehicleId: string;
  plate: string;
  model: string;
  color: string;
  userName: string;
  userEmail: string;
  destination: string;
  purpose: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  notes: string;
  checkoutAt: string | null;
  returnAt: string | null;
  checkoutPhotos: number;
  returnPhotos: number;
};

type Dashboard = {
  date: string;
  actor: { name: string; email: string };
  summary: {
    total: number;
    available: number;
    reserved: number;
    inUse: number;
    maintenance: number;
    utilization: number;
  };
  vehicles: Vehicle[];
  reservations: Reservation[];
};

type ReservationForm = {
  vehicleId: string;
  userName: string;
  destination: string;
  purpose: string;
  startTime: string;
  endTime: string;
  notes: string;
};

type VehicleForm = {
  model: string;
  plate: string;
  color: string;
  category: string;
  odometerKm: string;
  status: "active" | "maintenance";
};

const emptyVehicleForm: VehicleForm = {
  model: "",
  plate: "",
  color: "Branca",
  category: "Picape",
  odometerKm: "0",
  status: "active",
};

const statusCopy: Record<Availability, { label: string; hint: string }> = {
  available: { label: "Disponível", hint: "Livre para reserva" },
  reserved: { label: "Reservado", hint: "Agendamento confirmado" },
  in_use: { label: "Em uso", hint: "Veículo em circulação" },
  maintenance: { label: "Manutenção", hint: "Temporariamente indisponível" },
};

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatOdometer(value: number | null) {
  return value == null
    ? "Não informado"
    : `${new Intl.NumberFormat("pt-BR").format(value)} km`;
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

export function FleetDashboard() {
  const [selectedDate, setSelectedDate] = useState(todayInSaoPaulo);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [plateQuery, setPlateQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [returnToReservation, setReturnToReservation] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<ReservationForm>({
    vehicleId: "",
    userName: "Paulo",
    destination: "",
    purpose: "Visita externa",
    startTime: "08:00",
    endTime: "17:00",
    notes: "",
  });
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicleForm);

  const loadDashboard = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/dashboard?date=${encodeURIComponent(selectedDate)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(await readApiError(response));
        const payload = (await response.json()) as Dashboard;
        setDashboard(payload);
        setForm((current) => ({
          ...current,
          userName:
            current.userName === "Paulo" || !current.userName ? payload.actor.name : current.userName,
        }));
      } catch (error) {
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : "Falha ao carregar a frota.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    // A carga inicial sincroniza a interface com a frota persistida.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const filteredVehicles = useMemo(() => {
    const query = plateQuery.trim().toLocaleUpperCase("pt-BR");
    if (!dashboard || !query) return dashboard?.vehicles ?? [];
    return dashboard.vehicles.filter(
      (vehicle) =>
        vehicle.plate.toLocaleUpperCase("pt-BR").includes(query) ||
        vehicle.model.toLocaleUpperCase("pt-BR").includes(query),
    );
  }, [dashboard, plateQuery]);

  const queryResult = useMemo(() => {
    if (!plateQuery.trim() || filteredVehicles.length !== 1) return null;
    return filteredVehicles[0];
  }, [filteredVehicles, plateQuery]);

  const selectedReservationVehicle = useMemo(
    () => dashboard?.vehicles.find((vehicle) => vehicle.id === form.vehicleId) ?? null,
    [dashboard, form.vehicleId],
  );

  function openReservation(vehicleId = "") {
    setForm((current) => ({ ...current, vehicleId }));
    setModalOpen(true);
  }

  function changeForm(field: keyof ReservationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openVehicleForm(vehicle?: Vehicle, resumeReservation = false) {
    setEditingVehicleId(vehicle?.id ?? null);
    setReturnToReservation(resumeReservation);
    setVehicleForm(
      vehicle
        ? {
            model: vehicle.model,
            plate: vehicle.plate,
            color: vehicle.color,
            category: vehicle.category,
            odometerKm: vehicle.odometerKm == null ? "" : String(vehicle.odometerKm),
            status: vehicle.maintenance ? "maintenance" : "active",
          }
        : emptyVehicleForm,
    );
    if (resumeReservation) setModalOpen(false);
    setVehicleModalOpen(true);
  }

  function closeVehicleForm() {
    setVehicleModalOpen(false);
    if (returnToReservation) setModalOpen(true);
    setReturnToReservation(false);
  }

  function changeVehicleForm(field: keyof VehicleForm, value: string) {
    setVehicleForm((current) => ({ ...current, [field]: value } as VehicleForm));
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("vehicle-save");
    try {
      const response = await fetch(
        editingVehicleId ? `/api/vehicles/${editingVehicleId}` : "/api/vehicles",
        {
          method: editingVehicleId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vehicleForm),
        },
      );
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as { vehicle: { id: string } };
      const wasCreating = !editingVehicleId;
      const shouldResumeReservation = returnToReservation && wasCreating;
      setVehicleModalOpen(false);
      setReturnToReservation(false);
      setNotice({
        tone: "success",
        text: wasCreating ? "Veículo adicionado à frota." : "Dados do veículo atualizados.",
      });
      if (shouldResumeReservation) {
        setForm((current) => ({
          ...current,
          vehicleId: vehicleForm.status === "active" ? payload.vehicle.id : "",
        }));
        setModalOpen(true);
      }
      await loadDashboard(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao salvar o veículo.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function archiveCurrentVehicle() {
    if (!editingVehicleId) return;
    const confirmed = window.confirm(
      "Remover este veículo da frota?\n\nO histórico será preservado. Reservas futuras serão canceladas. Utilizações em andamento precisam ser concluídas antes.",
    );
    if (!confirmed) return;

    setBusyKey("vehicle-archive");
    try {
      const response = await fetch(`/api/vehicles/${editingVehicleId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response));
      setVehicleModalOpen(false);
      setReturnToReservation(false);
      setEditingVehicleId(null);
      setNotice({ tone: "success", text: "Veículo removido da frota operacional." });
      await loadDashboard(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao remover o veículo.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("create");
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: form.vehicleId,
          userName: form.userName,
          destination: form.destination,
          purpose: form.purpose,
          startAt: `${selectedDate}T${form.startTime}:00-03:00`,
          endAt: `${selectedDate}T${form.endTime}:00-03:00`,
          notes: form.notes,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setModalOpen(false);
      setNotice({ tone: "success", text: "Reserva criada e veículo bloqueado para o período." });
      setForm((current) => ({ ...current, destination: "", notes: "" }));
      await loadDashboard(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao criar a reserva.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function updateStatus(reservation: Reservation, action: "cancel" | "start" | "complete") {
    setBusyKey(`${action}-${reservation.id}`);
    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const messages = {
        cancel: "Reserva cancelada. O veículo está disponível novamente.",
        start: "Saída registrada. Boa viagem!",
        complete: "Chegada registrada e veículo liberado.",
      };
      setNotice({ tone: "success", text: messages[action] });
      await loadDashboard(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao atualizar a reserva.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function uploadPhoto(
    reservation: Reservation,
    stage: "checkout" | "return",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const key = `photo-${stage}-${reservation.id}`;
    setBusyKey(key);
    try {
      const body = new FormData();
      body.append("stage", stage);
      body.append("photo", file);
      const response = await fetch(`/api/reservations/${reservation.id}/photos`, {
        method: "POST",
        body,
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setNotice({
        tone: "success",
        text: stage === "checkout" ? "Foto de saída salva." : "Foto de chegada salva.",
      });
      await loadDashboard(true);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Falha ao enviar a foto.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  const actorName = dashboard?.actor.name ?? "Paulo";
  const actorInitials = actorName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <a className="brand" href="/frota" aria-label="RotaFácil — início">
          <FleetMark />
          <span>Rota<strong>Fácil</strong></span>
        </a>

        <nav className="main-nav">
          <a className="nav-item active" href="/frota"><span className="nav-icon">⌂</span>Visão geral</a>
          <a className="nav-item" href="#frota"><span className="nav-icon">▣</span>Veículos</a>
          <a className="nav-item" href="/agenda"><span className="nav-icon">◫</span>Agenda</a>
          <a className="nav-item" href="/gestao"><span className="nav-icon">◒</span>Gestão</a>
          <a className="nav-item" href="#registros"><span className="nav-icon">◎</span>Registros</a>
        </nav>

        <div className="sidebar-note">
          <span className="sidebar-note-mark">RF</span>
          <div><strong>Frota organizada</strong><p>Disponibilidade sempre atualizada.</p></div>
        </div>

        <button
          className="profile-card"
          type="button"
          aria-label={`Sair da sessão de ${actorName}`}
          onClick={() => {
            void fetch("/api/auth/logout", { method: "POST" }).then(() => {
              window.location.href = "/";
            });
          }}
        >
          <span className="avatar">{actorInitials || "P"}</span>
          <span className="profile-copy"><strong>{actorName}</strong><small>Sair</small></span>
          <span aria-hidden="true">•••</span>
        </button>
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div><p className="eyebrow">CENTRAL DA FROTA</p><h1>Bom dia, {actorName.split(" ")[0]}.</h1></div>
          <div className="top-actions">
            <button
              className={`icon-button ${refreshing ? "spinning" : ""}`}
              type="button"
              onClick={() => void loadDashboard(true)}
              aria-label="Atualizar informações"
              disabled={refreshing}
            >↻</button>
            <button className="primary-button" type="button" onClick={() => openReservation()}>
              <span aria-hidden="true">＋</span>Nova reserva
            </button>
          </div>
        </header>

        <section className="availability-hero" aria-labelledby="availability-title">
          <div className="hero-copy">
            <p className="section-kicker">CONSULTA RÁPIDA</p>
            <h2 id="availability-title">Qual veículo você precisa?</h2>
            <p>Consulte a placa e saiba na hora se o veículo está livre.</p>
          </div>
          <div className="search-panel">
            <label className="field date-field">
              <span>Data da utilização</span>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <label className="field plate-field">
              <span>Placa ou modelo</span>
              <span className="input-with-icon">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={plateQuery}
                  onChange={(event) => setPlateQuery(event.target.value)}
                  placeholder="Ex.: GEP-7C21"
                />
              </span>
            </label>
            <div className="search-meta" aria-live="polite">
              <span>{formatShortDate(selectedDate)}</span>
              <strong>{filteredVehicles.length}</strong> veículo{filteredVehicles.length === 1 ? "" : "s"}
            </div>
          </div>

          {queryResult && (
            <div className={`availability-result ${queryResult.availability}`}>
              <span className="result-dot" aria-hidden="true" />
              <div>
                <strong>{queryResult.model} · {queryResult.plate}</strong>
                <p>
                  {queryResult.availability === "available"
                    ? "Está liberado para esta data."
                    : `${statusCopy[queryResult.availability].label} — ${queryResult.activeReservation?.userName ?? "indisponível"}.`}
                </p>
              </div>
              {queryResult.availability === "available" && (
                <button type="button" onClick={() => openReservation(queryResult.id)}>Reservar</button>
              )}
            </div>
          )}
        </section>

        <section className="summary-grid" aria-label="Resumo da frota">
          <article className="summary-card accent">
            <div><p>Disponíveis</p><strong>{loading ? "—" : dashboard?.summary.available ?? 0}</strong><span>prontos para uso</span></div>
            <div className="mini-meter green" aria-hidden="true">
              <span style={{ width: `${dashboard?.summary.total ? (dashboard.summary.available / dashboard.summary.total) * 100 : 0}%` }} />
            </div>
          </article>
          <article className="summary-card">
            <div><p>Reservados</p><strong>{loading ? "—" : dashboard?.summary.reserved ?? 0}</strong><span>para {formatShortDate(selectedDate)}</span></div>
            <div className="summary-symbol amber" aria-hidden="true">◫</div>
          </article>
          <article className="summary-card">
            <div><p>Em uso agora</p><strong>{loading ? "—" : dashboard?.summary.inUse ?? 0}</strong><span>em circulação</span></div>
            <div className="summary-symbol blue" aria-hidden="true">→</div>
          </article>
          <article className="summary-card utilization-card">
            <div><p>Ocupação do dia</p><strong>{loading ? "—" : `${dashboard?.summary.utilization ?? 0}%`}</strong><span>da frota programada</span></div>
            <div
              className="radial-progress"
              style={{ "--progress": `${dashboard?.summary.utilization ?? 0}%` } as React.CSSProperties}
              aria-hidden="true"
            />
          </article>
        </section>

        <section className="section-block" id="frota">
          <div className="section-heading">
            <div><p className="section-kicker">MAPA DA FROTA</p><h2>Veículos em {formatLongDate(selectedDate)}</h2></div>
            <div className="section-heading-actions">
              <span className="live-label"><i /> Atualizado agora</span>
              <button className="text-button vehicle-add-button" type="button" onClick={() => openVehicleForm()}>
                Adicionar veículo <span aria-hidden="true">＋</span>
              </button>
            </div>
          </div>

          <div className="vehicle-grid">
            {loading
              ? Array.from({ length: 4 }, (_, index) => <div className="vehicle-card skeleton" key={index} />)
              : filteredVehicles.map((vehicle) => {
                  const copy = statusCopy[vehicle.availability];
                  return (
                    <article className={`vehicle-card ${vehicle.availability}`} key={vehicle.id}>
                      <div className="vehicle-card-top">
                        <span className="vehicle-type">{vehicle.category}</span>
                        <div className="vehicle-card-controls">
                          <span className={`status-pill ${vehicle.availability}`}><i /> {copy.label}</span>
                          <button className="vehicle-edit-button" type="button" onClick={() => openVehicleForm(vehicle)} aria-label={`Editar ${vehicle.model}`} title="Editar veículo">✎</button>
                        </div>
                      </div>
                      <div className="vehicle-visual" aria-hidden="true">
                        <span className="car-roof" /><span className="car-body" />
                        <i className="wheel one" /><i className="wheel two" />
                      </div>
                      <div className="vehicle-name"><h3>{vehicle.model}</h3><span>{vehicle.color}</span></div>
                      <div className="vehicle-identifiers">
                        <div className="plate">{vehicle.plate}</div>
                        <div className={`odometer-badge ${vehicle.odometerKm == null ? "missing" : ""}`}>
                          <span aria-hidden="true">◷</span>
                          <div><small>ODÔMETRO</small><strong>{formatOdometer(vehicle.odometerKm)}</strong></div>
                        </div>
                      </div>
                      {vehicle.activeMaintenance ? (
                        <div className="vehicle-booking maintenance-booking">
                          <div><span>{formatTime(vehicle.activeMaintenance.startAt)}–{formatTime(vehicle.activeMaintenance.endAt)}</span><strong>{vehicle.activeMaintenance.status === "in_progress" ? "Em manutenção" : "Manutenção programada"}</strong></div>
                          <p>{vehicle.activeMaintenance.serviceDescription}{vehicle.activeMaintenance.provider ? ` · ${vehicle.activeMaintenance.provider}` : ""}</p>
                        </div>
                      ) : (
                        <>
                          {vehicle.activeReservation ? (
                            <div className="vehicle-booking">
                              <div><span>{formatTime(vehicle.activeReservation.startAt)}–{formatTime(vehicle.activeReservation.endAt)}</span><strong>{vehicle.activeReservation.userName}</strong></div>
                              <p>{vehicle.activeReservation.destination}</p>
                            </div>
                          ) : null}
                          {vehicle.availability === "in_use" ? (
                            <div className="maintenance-note"><span aria-hidden="true">⚙</span>Em uso agora — aguarde a devolução</div>
                          ) : vehicle.availability === "maintenance" ? (
                            <div className="maintenance-note"><span aria-hidden="true">⚙</span>Indisponível para reservas</div>
                          ) : (
                            <button className="reserve-link" type="button" onClick={() => openReservation(vehicle.id)}>
                              {vehicle.activeReservation ? "Reservar em outro horário" : "Reservar este veículo"}{" "}
                              <span aria-hidden="true">→</span>
                            </button>
                          )}
                        </>
                      )}
                    </article>
                  );
                })}
          </div>

          {!loading && filteredVehicles.length === 0 && (
            <div className="empty-state"><span>⌕</span><strong>Nenhum veículo encontrado</strong><p>Confira a placa ou pesquise pelo nome do modelo.</p></div>
          )}
        </section>

        <section className="section-block schedule-section" id="agenda">
          <div className="section-heading">
            <div><p className="section-kicker">AGENDA DO DIA</p><h2>Saídas e chegadas</h2></div>
            <button className="text-button" type="button" onClick={() => openReservation()}>Adicionar reserva <span aria-hidden="true">＋</span></button>
          </div>

          <div className="schedule-table" role="table" aria-label="Reservas do dia">
            <div className="schedule-row table-head" role="row">
              <span role="columnheader">Horário</span><span role="columnheader">Veículo</span>
              <span role="columnheader">Responsável e destino</span><span role="columnheader">Registro</span>
              <span role="columnheader">Ações</span>
            </div>
            {dashboard?.reservations.map((reservation) => (
              <article className="schedule-row" role="row" key={reservation.id}>
                <div className="time-cell" role="cell"><strong>{formatTime(reservation.startAt)}</strong><span>{formatTime(reservation.endAt)}</span></div>
                <div className="vehicle-cell" role="cell"><span className="table-vehicle-icon" aria-hidden="true">▰</span><div><strong>{reservation.model}</strong><small>{reservation.plate}</small></div></div>
                <div className="destination-cell" role="cell"><strong>{reservation.userName}</strong><span>{reservation.destination}</span></div>
                <div className="photo-cell" role="cell">
                  {reservation.status === "reserved" && (
                    <label className={`photo-button ${reservation.checkoutPhotos ? "complete" : ""}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={(event) => void uploadPhoto(reservation, "checkout", event)}
                        disabled={busyKey !== null}
                      />
                      <span aria-hidden="true">◉</span>
                      {busyKey === `photo-checkout-${reservation.id}` ? "Enviando…" : reservation.checkoutPhotos ? `Saída · ${reservation.checkoutPhotos}` : "Foto de saída"}
                    </label>
                  )}
                  {reservation.status === "in_use" && (
                    <label className={`photo-button ${reservation.returnPhotos ? "complete" : ""}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        onChange={(event) => void uploadPhoto(reservation, "return", event)}
                        disabled={busyKey !== null}
                      />
                      <span aria-hidden="true">◉</span>
                      {busyKey === `photo-return-${reservation.id}` ? "Enviando…" : reservation.returnPhotos ? `Chegada · ${reservation.returnPhotos}` : "Foto de chegada"}
                    </label>
                  )}
                </div>
                <div className="row-actions" role="cell">
                  {reservation.status === "reserved" ? (
                    <>
                      <button
                        className="small-action primary"
                        type="button"
                        disabled={busyKey !== null || reservation.checkoutPhotos < 1}
                        onClick={() => void updateStatus(reservation, "start")}
                      >{busyKey === `start-${reservation.id}` ? "Iniciando…" : "Iniciar"}</button>
                      <button
                        className="more-action"
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => void updateStatus(reservation, "cancel")}
                        aria-label={`Cancelar reserva de ${reservation.model}`}
                        title="Cancelar reserva"
                      >×</button>
                    </>
                  ) : (
                    <button
                      className="small-action dark"
                      type="button"
                      disabled={busyKey !== null || reservation.returnPhotos < 1}
                      onClick={() => void updateStatus(reservation, "complete")}
                    >{busyKey === `complete-${reservation.id}` ? "Finalizando…" : "Finalizar"}</button>
                  )}
                </div>
              </article>
            ))}

            {!loading && dashboard?.reservations.length === 0 && (
              <div className="empty-schedule"><strong>Nenhuma reserva para esta data.</strong><button type="button" onClick={() => openReservation()}>Criar a primeira reserva</button></div>
            )}
          </div>
        </section>

        <footer id="registros">
          <FleetMark />
          <p>RotaFácil mantém reservas, fotos e alterações registradas com segurança.</p>
          <span>Versão web · preparada para mobile</span>
        </footer>
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        <a className="active" href="/frota"><span>⌂</span>Início</a>
        <a href="#frota"><span>▣</span>Veículos</a>
        <button type="button" onClick={() => openReservation()} aria-label="Nova reserva">＋</button>
        <a href="/agenda"><span>◫</span>Agenda</a>
        <a href="/gestao"><span>◒</span>Gestão</a>
      </nav>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModalOpen(false)}>
          <section
            className="reservation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div><p className="section-kicker">NOVO AGENDAMENTO</p><h2 id="reservation-modal-title">Reservar um veículo</h2><span>{formatLongDate(selectedDate)}</span></div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar">×</button>
            </div>
            <form onSubmit={submitReservation}>
              <div className="form-field full">
                <span>Veículo</span>
                <select aria-label="Veículo" value={form.vehicleId} onChange={(event) => changeForm("vehicleId", event.target.value)} required>
                  <option value="">Selecione um veículo</option>
                  {dashboard?.vehicles.map((vehicle) => (
                    <option
                      value={vehicle.id}
                      key={vehicle.id}
                      disabled={vehicle.availability === "maintenance" || vehicle.availability === "in_use"}
                    >
                      {vehicle.model} · {vehicle.plate}
                      {vehicle.availability === "maintenance"
                        ? " — em manutenção"
                        : vehicle.availability === "in_use"
                          ? " — em uso"
                          : vehicle.availability === "reserved"
                            ? " — possui reserva no dia"
                            : ""}
                    </option>
                  ))}
                </select>
                <button className="vehicle-create-shortcut" type="button" onClick={() => openVehicleForm(undefined, true)}>
                  <span aria-hidden="true">＋</span>Cadastrar um novo veículo
                </button>
                {selectedReservationVehicle && (
                  <div className="selected-vehicle-odometer">
                    <span><i aria-hidden="true">◷</i>Odômetro atual</span>
                    <strong>{formatOdometer(selectedReservationVehicle.odometerKm)}</strong>
                  </div>
                )}
              </div>
              <label className="form-field full"><span>Responsável</span><input value={form.userName} onChange={(event) => changeForm("userName", event.target.value)} placeholder="Nome do usuário" maxLength={100} required /></label>
              <label className="form-field full"><span>Destino</span><input value={form.destination} onChange={(event) => changeForm("destination", event.target.value)} placeholder="Ex.: Stand de Sumaré e Hortolândia" maxLength={240} required /></label>
              <label className="form-field full"><span>Motivo da utilização</span><input value={form.purpose} onChange={(event) => changeForm("purpose", event.target.value)} placeholder="Ex.: Visita à obra" maxLength={160} /></label>
              <label className="form-field"><span>Saída</span><input type="time" value={form.startTime} onChange={(event) => changeForm("startTime", event.target.value)} required /></label>
              <label className="form-field"><span>Chegada prevista</span><input type="time" value={form.endTime} onChange={(event) => changeForm("endTime", event.target.value)} required /></label>
              <label className="form-field full"><span>Observações <small>opcional</small></span><textarea value={form.notes} onChange={(event) => changeForm("notes", event.target.value)} placeholder="Informações úteis para a equipe" maxLength={1000} rows={3} /></label>
              <div className="form-note full"><span>✓</span>O sistema bloqueará automaticamente conflitos de horário.</div>
              <div className="modal-actions full">
                <button className="secondary-button" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={busyKey !== null}>{busyKey === "create" ? "Salvando…" : "Confirmar reserva"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {vehicleModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeVehicleForm}>
          <section
            className="reservation-modal vehicle-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vehicle-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="section-kicker">{editingVehicleId ? "EDITAR VEÍCULO" : "NOVO VEÍCULO"}</p>
                <h2 id="vehicle-modal-title">{editingVehicleId ? "Atualizar cadastro" : "Adicionar à frota"}</h2>
                <span>{editingVehicleId ? "Altere os dados ou a situação operacional." : "Cadastre os dados principais para liberar novas reservas."}</span>
              </div>
              <button type="button" onClick={closeVehicleForm} aria-label="Fechar">×</button>
            </div>
            <form onSubmit={submitVehicle}>
              <label className="form-field full">
                <span>Modelo</span>
                <input value={vehicleForm.model} onChange={(event) => changeVehicleForm("model", event.target.value)} placeholder="Ex.: Chevrolet Montana" maxLength={120} required autoFocus />
              </label>
              <label className="form-field">
                <span>Placa</span>
                <input value={vehicleForm.plate} onChange={(event) => changeVehicleForm("plate", event.target.value.toLocaleUpperCase("pt-BR"))} placeholder="ABC-1D23" maxLength={8} required />
              </label>
              <label className="form-field">
                <span>Cor</span>
                <input value={vehicleForm.color} onChange={(event) => changeVehicleForm("color", event.target.value)} placeholder="Ex.: Branca" maxLength={60} required />
              </label>
              <label className="form-field full">
                <span>Odômetro atual <small>quilometragem total do veículo</small></span>
                <span className="input-with-suffix">
                  <input type="number" min="0" max="9999999" step="1" inputMode="numeric" value={vehicleForm.odometerKm} onChange={(event) => changeVehicleForm("odometerKm", event.target.value)} placeholder="Ex.: 58240" required />
                  <strong>km</strong>
                </span>
              </label>
              <label className="form-field">
                <span>Categoria</span>
                <select value={vehicleForm.category} onChange={(event) => changeVehicleForm("category", event.target.value)} required>
                  {['Picape', 'Furgão', 'SUV', 'Sedã', 'Hatch', 'Van', 'Caminhão', 'Outro'].map((category) => <option value={category} key={category}>{category}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Situação</span>
                <select value={vehicleForm.status} onChange={(event) => changeVehicleForm("status", event.target.value)} required>
                  <option value="active">Ativo e disponível</option>
                  <option value="maintenance">Em manutenção</option>
                </select>
              </label>
              {vehicleForm.status === "maintenance" && (
                <div className="form-note warning full"><span>!</span>O veículo ficará indisponível para novas reservas até ser reativado.</div>
              )}
              <div className="form-note full"><span>✓</span>A placa será padronizada e a quilometragem não poderá ser reduzida.</div>
              <div className="modal-actions full vehicle-modal-actions">
                {editingVehicleId ? (
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => void archiveCurrentVehicle()}
                    disabled={busyKey !== null}
                  >
                    {busyKey === "vehicle-archive" ? "Removendo…" : "Excluir veículo"}
                  </button>
                ) : null}
                <div className="modal-actions-spacer">
                  <button className="secondary-button" type="button" onClick={closeVehicleForm}>Cancelar</button>
                  <button className="primary-button" type="submit" disabled={busyKey !== null}>
                    {busyKey === "vehicle-save" ? "Salvando…" : editingVehicleId ? "Salvar alterações" : "Adicionar veículo"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {notice && (
        <div className={`toast ${notice.tone}`} role="status">
          <span aria-hidden="true">{notice.tone === "success" ? "✓" : "!"}</span>
          {notice.text}
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso">×</button>
        </div>
      )}
    </div>
  );
}
