import {
  getBindings,
  getRuntimeMode,
  tableHasColumn,
  warmBindings,
  type AppBindings,
  type AppDatabase,
} from "./runtime";

export type Actor = {
  email: string;
  name: string;
};

export type ReservationStatus =
  | "reserved"
  | "in_use"
  | "completed"
  | "cancelled";

export type ReservationRecord = {
  id: string;
  vehicleId: string;
  driverId: string | null;
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

export type VehicleRecord = {
  id: string;
  plate: string;
  model: string;
  color: string;
  category: string;
  odometerKm: number | null;
  status: "active" | "maintenance" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type AgendaStatus =
  | "planned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type MaintenanceStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DriverRecord = {
  id: string;
  name: string;
  phone: string;
  color: string;
};

export type WorkSiteRecord = {
  id: string;
  name: string;
  city: string;
  address: string;
  contactName: string;
  contactPhone: string;
  notes: string;
};

export type AgendaVisitRecord = {
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

export type MaintenanceRecord = {
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

type VehicleRow = {
  id: string;
  plate: string;
  model: string;
  color: string;
  category: string;
  odometer_km: number | null;
  vehicle_status: string;
  reservation_id: string | null;
  reservation_status: ReservationStatus | null;
  user_name: string | null;
  destination: string | null;
  start_at: string | null;
  end_at: string | null;
  maintenance_id: string | null;
  maintenance_status: MaintenanceStatus | null;
  maintenance_service: string | null;
  maintenance_provider: string | null;
  maintenance_start_at: string | null;
  maintenance_end_at: string | null;
};

type ReservationRow = {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  plate: string;
  model: string;
  color: string;
  user_name: string;
  user_email: string;
  destination: string;
  purpose: string;
  start_at: string;
  end_at: string;
  status: ReservationStatus;
  notes: string;
  checkout_at: string | null;
  return_at: string | null;
  checkout_photos: number;
  return_photos: number;
};

type AgendaVisitRow = {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_color: string;
  work_site_id: string;
  work_site_name: string;
  city: string;
  address: string;
  vehicle_id: string | null;
  vehicle_label: string | null;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: AgendaStatus;
  purpose: string;
  notes: string;
};

type MaintenanceRow = {
  id: string;
  vehicle_id: string;
  vehicle_label: string;
  driver_id: string;
  driver_name: string;
  driver_color: string;
  start_at: string;
  end_at: string;
  status: MaintenanceStatus;
  service_description: string;
  provider: string;
  notes: string;
};

type AgendaVehicleUseRow = {
  id: string;
  vehicle_id: string;
  vehicle_label: string;
  driver_id: string;
  driver_name: string;
  driver_color: string;
  destination: string;
  purpose: string;
  start_at: string;
  end_at: string;
  status: ReservationStatus;
  notes: string;
};

type ManagementReservationRow = {
  id: string;
  vehicle_id: string;
  plate: string;
  model: string;
  color: string;
  category: string;
  user_name: string;
  user_email: string;
  destination: string;
  purpose: string;
  start_at: string;
  end_at: string;
  status: ReservationStatus;
  checkout_at: string | null;
  return_at: string | null;
  cancelled_at: string | null;
  checkout_photos: number;
  return_photos: number;
};

let databaseReady: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY NOT NULL,
    plate TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    color TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Utilitário',
    odometer_km INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS vehicles_status_idx ON vehicles(status)`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id TEXT,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    destination TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'Visita externa',
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    notes TEXT NOT NULL DEFAULT '',
    checkout_at TEXT,
    return_at TEXT,
    cancelled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reservations_vehicle_period_idx ON reservations(vehicle_id, start_at, end_at)`,
  `CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations(status)`,
  `CREATE INDEX IF NOT EXISTS reservations_user_idx ON reservations(user_email)`,
  `CREATE TABLE IF NOT EXISTS reservation_photos (
    id TEXT PRIMARY KEY NOT NULL,
    reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reservation_photos_reservation_stage_idx ON reservation_photos(reservation_id, stage)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    reservation_id TEXT,
    vehicle_id TEXT,
    actor_email TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS audit_logs_reservation_idx ON audit_logs(reservation_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)`,
  `CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#0f766e',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS drivers_status_idx ON drivers(status)`,
  `CREATE TABLE IF NOT EXISTS work_sites (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    contact_name TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS work_sites_status_idx ON work_sites(status)`,
  `CREATE INDEX IF NOT EXISTS work_sites_city_idx ON work_sites(city)`,
  `CREATE TABLE IF NOT EXISTS agenda_visits (
    id TEXT PRIMARY KEY NOT NULL,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    work_site_id TEXT NOT NULL REFERENCES work_sites(id) ON DELETE RESTRICT,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE RESTRICT,
    visit_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',
    purpose TEXT NOT NULL DEFAULT 'Visita de obra',
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS agenda_visits_driver_period_idx ON agenda_visits(driver_id, visit_date, start_time, end_time)`,
  `CREATE INDEX IF NOT EXISTS agenda_visits_vehicle_period_idx ON agenda_visits(vehicle_id, visit_date, start_time, end_time)`,
  `CREATE INDEX IF NOT EXISTS agenda_visits_status_idx ON agenda_visits(status)`,
  `CREATE INDEX IF NOT EXISTS agenda_visits_work_site_idx ON agenda_visits(work_site_id)`,
  `CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id TEXT PRIMARY KEY NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',
    service_description TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS maintenance_schedules_vehicle_period_idx ON maintenance_schedules(vehicle_id, start_at, end_at)`,
  `CREATE INDEX IF NOT EXISTS maintenance_schedules_driver_idx ON maintenance_schedules(driver_id)`,
  `CREATE INDEX IF NOT EXISTS maintenance_schedules_status_idx ON maintenance_schedules(status)`,
];

function getDatabase(): AppDatabase {
  return getBindings().DB;
}

export { getBindings };

function localDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dayBounds(date: string) {
  return {
    start: `${date}T00:00:00-03:00`,
    end: `${date}T23:59:59-03:00`,
  };
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function toReservation(row: ReservationRow): ReservationRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    plate: row.plate,
    model: row.model,
    color: row.color,
    userName: row.user_name,
    userEmail: row.user_email,
    destination: row.destination,
    purpose: row.purpose,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    notes: row.notes,
    checkoutAt: row.checkout_at,
    returnAt: row.return_at,
    checkoutPhotos: Number(row.checkout_photos),
    returnPhotos: Number(row.return_photos),
  };
}

async function initializeDatabase() {
  await warmBindings();
  const db = getDatabase();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));

  if (!(await tableHasColumn(db, "vehicles", "odometer_km"))) {
    try {
      await db.prepare("ALTER TABLE vehicles ADD COLUMN odometer_km INTEGER").run();
    } catch (error) {
      if (!(await tableHasColumn(db, "vehicles", "odometer_km"))) throw error;
    }
  }

  if (!(await tableHasColumn(db, "reservations", "driver_id"))) {
    try {
      await db.prepare("ALTER TABLE reservations ADD COLUMN driver_id TEXT").run();
    } catch (error) {
      if (!(await tableHasColumn(db, "reservations", "driver_id"))) throw error;
    }
  }
  await db.prepare("CREATE INDEX IF NOT EXISTS reservations_driver_idx ON reservations(driver_id)").run();

  if (getRuntimeMode() === "postgres" && process.env.APP_SEED === "false") {
    return;
  }

  const vehicleCount = await db
    .prepare("SELECT COUNT(*) AS total FROM vehicles")
    .first<{ total: number }>();

  if (Number(vehicleCount?.total ?? 0) === 0) {
    const now = new Date().toISOString();
    const fleet = [
      ["veh-montana", "GEP-7C21", "Chevrolet Montana", "Branca", "Picape"],
      ["veh-strada", "FRO-2T18", "Fiat Strada", "Preta", "Picape"],
      ["veh-saveiro", "DPT-9A04", "Volkswagen Saveiro", "Prata", "Picape"],
      ["veh-oroch", "GAB-4N62", "Renault Oroch", "Branca", "Picape"],
      ["veh-fiorino", "EVC-1P33", "Fiat Fiorino", "Branca", "Furgão"],
    ];

    await db.batch(
      fleet.map((vehicle) =>
        db
          .prepare(
            "INSERT INTO vehicles (id, plate, model, color, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
          )
          .bind(...vehicle, now, now),
      ),
    );
  }

  const reservationCount = await db
    .prepare("SELECT COUNT(*) AS total FROM reservations")
    .first<{ total: number }>();

  if (Number(reservationCount?.total ?? 0) === 0) {
    const date = localDate();
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          `INSERT INTO reservations (
            id, vehicle_id, user_name, user_email, destination, purpose,
            start_at, end_at, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reserved', '', ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          "veh-montana",
          "Paulo",
          "paulo@empresa.local",
          "Stand de Sumaré e stand de Hortolândia",
          "Visita aos stands",
          `${date}T08:00:00-03:00`,
          `${date}T17:00:00-03:00`,
          now,
          now,
        ),
      db
        .prepare(
          `INSERT INTO reservations (
            id, vehicle_id, user_name, user_email, destination, purpose,
            start_at, end_at, status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_use', '', ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          "veh-strada",
          "Marina",
          "marina@empresa.local",
          "Obra Jardim Amanda",
          "Vistoria de obra",
          `${date}T07:30:00-03:00`,
          `${date}T12:30:00-03:00`,
          now,
          now,
      ),
    ]);
  }

  const driverCount = await db
    .prepare("SELECT COUNT(*) AS total FROM drivers")
    .first<{ total: number }>();

  if (Number(driverCount?.total ?? 0) === 0) {
    const now = new Date().toISOString();
    const demoDrivers = [
      ["drv-paulo", "Paulo", "(19) 99912-3001", "#0f766e"],
      ["drv-andre", "André", "(19) 99820-1470", "#2563eb"],
      ["drv-flavio", "Flávio", "(19) 99715-6284", "#7c3aed"],
      ["drv-ronilson", "Ronilson", "(19) 99644-9310", "#d97706"],
    ];
    await db.batch(
      demoDrivers.map((driver) =>
        db
          .prepare(
            "INSERT INTO drivers (id, name, phone, color, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
          )
          .bind(...driver, now, now),
      ),
    );
  }

  const workSiteCount = await db
    .prepare("SELECT COUNT(*) AS total FROM work_sites")
    .first<{ total: number }>();

  if (Number(workSiteCount?.total ?? 0) === 0) {
    const now = new Date().toISOString();
    const demoSites = [
      ["site-sumare", "Stand de Sumaré", "Sumaré", "Av. Rebouças, 1250", "Marcos", "(19) 3883-1200"],
      ["site-hortolandia", "Stand de Hortolândia", "Hortolândia", "Av. Santana, 780", "Luciana", "(19) 3865-4020"],
      ["site-jardim-amanda", "Obra Jardim Amanda", "Hortolândia", "Rua Graciliano Ramos, 310", "Eduardo", "(19) 99222-1180"],
      ["site-reserva-serena", "Reserva Serena Campinas", "Campinas", "Rod. Dom Pedro I, km 137", "Natália", "(19) 99114-5570"],
      ["site-engenharia-euro", "Engenharia Euro Asfaltos", "Sumaré", "Estrada Municipal, 455", "Harold", "(19) 3903-8891"],
    ];
    await db.batch(
      demoSites.map((site) =>
        db
          .prepare(
            `INSERT INTO work_sites (
              id, name, city, address, contact_name, contact_phone, notes,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, '', 'active', ?, ?)` ,
          )
          .bind(...site, now, now),
      ),
    );
  }

  const visitCount = await db
    .prepare("SELECT COUNT(*) AS total FROM agenda_visits")
    .first<{ total: number }>();

  if (Number(visitCount?.total ?? 0) === 0) {
    const today = localDate();
    const now = new Date().toISOString();
    const demoVisits = [
      ["drv-paulo", "site-sumare", "veh-montana", today, "08:00", "10:00", "confirmed", "Visita comercial"],
      ["drv-paulo", "site-hortolandia", "veh-montana", today, "13:30", "16:30", "planned", "Acompanhamento do stand"],
      ["drv-andre", "site-jardim-amanda", null, today, "07:30", "12:00", "in_progress", "Vistoria de obra"],
      ["drv-flavio", "site-reserva-serena", "veh-saveiro", addDays(today, 1), "09:00", "12:00", "planned", "Reunião técnica"],
      ["drv-ronilson", "site-engenharia-euro", "veh-oroch", addDays(today, 2), "08:30", "15:30", "confirmed", "Inspeção de campo"],
      ["drv-andre", "site-sumare", null, addDays(today, 3), "10:00", "11:30", "planned", "Alinhamento com cliente"],
    ];
    await db.batch(
      demoVisits.map((visit) =>
        db
          .prepare(
            `INSERT INTO agenda_visits (
              id, driver_id, work_site_id, vehicle_id, visit_date, start_time,
              end_time, status, purpose, notes, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'dados-demonstracao', ?, ?)` ,
          )
          .bind(crypto.randomUUID(), ...visit, now, now),
      ),
    );
  }
}

export async function ensureDatabase() {
  databaseReady ??= initializeDatabase().catch((error) => {
    databaseReady = null;
    throw error;
  });
  return databaseReady;
}

export async function getDashboard(date: string) {
  await ensureDatabase();
  const db = getDatabase();
  const { start, end } = dayBounds(date);

  const vehicleResult = await db
    .prepare(
      `SELECT
        v.id, v.plate, v.model, v.color, v.category, v.odometer_km, v.status AS vehicle_status,
        r.id AS reservation_id, r.status AS reservation_status,
        r.user_name, r.destination, r.start_at, r.end_at,
        m.id AS maintenance_id, m.status AS maintenance_status,
        m.service_description AS maintenance_service, m.provider AS maintenance_provider,
        m.start_at AS maintenance_start_at, m.end_at AS maintenance_end_at
      FROM vehicles v
      LEFT JOIN reservations r ON r.id = (
        SELECT r2.id
        FROM reservations r2
        WHERE r2.vehicle_id = v.id
          AND r2.status IN ('reserved', 'in_use')
          AND r2.start_at <= ?
          AND r2.end_at >= ?
        ORDER BY r2.start_at ASC
        LIMIT 1
      )
      LEFT JOIN maintenance_schedules m ON m.id = (
        SELECT m2.id
        FROM maintenance_schedules m2
        WHERE m2.vehicle_id = v.id
          AND m2.status IN ('planned', 'in_progress')
          AND m2.start_at <= ?
          AND m2.end_at >= ?
        ORDER BY CASE WHEN m2.status = 'in_progress' THEN 0 ELSE 1 END, m2.start_at ASC
        LIMIT 1
      )
      WHERE v.status != 'archived'
      ORDER BY
        CASE
          WHEN r.status = 'in_use' THEN 0
          WHEN m.status = 'in_progress' THEN 1
          WHEN r.status = 'reserved' THEN 2
          WHEN m.status = 'planned' THEN 3
          ELSE 4
        END,
        v.model ASC`,
    )
    .bind(end, start, end, start)
    .all<VehicleRow>();

  const reservationResult = await db
    .prepare(
      `SELECT
        r.id, r.vehicle_id, r.driver_id, v.plate, v.model, v.color,
        r.user_name, r.user_email, r.destination, r.purpose,
        r.start_at, r.end_at, r.status, r.notes, r.checkout_at, r.return_at,
        SUM(CASE WHEN p.stage = 'checkout' THEN 1 ELSE 0 END) AS checkout_photos,
        SUM(CASE WHEN p.stage = 'return' THEN 1 ELSE 0 END) AS return_photos
      FROM reservations r
      JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN reservation_photos p ON p.reservation_id = r.id
      WHERE r.start_at <= ? AND r.end_at >= ? AND r.status != 'cancelled'
      GROUP BY r.id
      ORDER BY r.start_at ASC`,
    )
    .bind(end, start)
    .all<ReservationRow>();

  const vehicles = vehicleResult.results.map((row) => ({
    id: row.id,
    plate: row.plate,
    model: row.model,
    color: row.color,
    category: row.category,
    odometerKm: row.odometer_km == null ? null : Number(row.odometer_km),
    maintenance: row.vehicle_status === "maintenance" || Boolean(row.maintenance_id),
    availability:
      row.vehicle_status === "maintenance" || row.maintenance_id
        ? "maintenance"
        : row.reservation_status ?? "available",
    activeReservation: row.reservation_id
      ? {
          id: row.reservation_id,
          status: row.reservation_status,
          userName: row.user_name,
          destination: row.destination,
          startAt: row.start_at,
          endAt: row.end_at,
        }
      : null,
    activeMaintenance: row.maintenance_id
      ? {
          id: row.maintenance_id,
          status: row.maintenance_status,
          serviceDescription: row.maintenance_service,
          provider: row.maintenance_provider,
          startAt: row.maintenance_start_at,
          endAt: row.maintenance_end_at,
        }
      : null,
  }));

  const reservations = reservationResult.results.map(toReservation);
  const available = vehicles.filter((vehicle) => vehicle.availability === "available").length;
  const reserved = vehicles.filter((vehicle) => vehicle.availability === "reserved").length;
  const inUse = vehicles.filter((vehicle) => vehicle.availability === "in_use").length;
  const maintenance = vehicles.filter((vehicle) => vehicle.availability === "maintenance").length;

  return {
    date,
    summary: {
      total: vehicles.length,
      available,
      reserved,
      inUse,
      maintenance,
      utilization: vehicles.length
        ? Math.round(((reserved + inUse) / vehicles.length) * 100)
        : 0,
    },
    vehicles,
    reservations,
  };
}

export async function getReservation(id: string): Promise<ReservationRecord | null> {
  await ensureDatabase();
  const db = getDatabase();
  const row = await db
    .prepare(
      `SELECT
        r.id, r.vehicle_id, r.driver_id, v.plate, v.model, v.color,
        r.user_name, r.user_email, r.destination, r.purpose,
        r.start_at, r.end_at, r.status, r.notes, r.checkout_at, r.return_at,
        SUM(CASE WHEN p.stage = 'checkout' THEN 1 ELSE 0 END) AS checkout_photos,
        SUM(CASE WHEN p.stage = 'return' THEN 1 ELSE 0 END) AS return_photos
      FROM reservations r
      JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN reservation_photos p ON p.reservation_id = r.id
      WHERE r.id = ?
      GROUP BY r.id`,
    )
    .bind(id)
    .first<ReservationRow>();
  return row ? toReservation(row) : null;
}

async function addAuditLog(
  action: string,
  actor: Actor,
  reservationId: string | null,
  vehicleId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const db = getDatabase();
  await db
    .prepare(
      `INSERT INTO audit_logs (
        id, reservation_id, vehicle_id, actor_email, actor_name,
        action, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      reservationId,
      vehicleId,
      actor.email,
      actor.name,
      action,
      JSON.stringify(metadata),
      new Date().toISOString(),
    )
    .run();
}

export async function createReservation(
  input: {
    vehicleId: string;
    driverId: string | null;
    userName: string;
    destination: string;
    purpose: string;
    startAt: string;
    endAt: string;
    notes: string;
  },
  actor: Actor,
) {
  await ensureDatabase();
  const db = getDatabase();
  const [vehicle, driver] = await Promise.all([
    db
      .prepare("SELECT id FROM vehicles WHERE id = ? AND status = 'active'")
      .bind(input.vehicleId)
      .first<{ id: string }>(),
    input.driverId
      ? db
          .prepare("SELECT id, name FROM drivers WHERE id = ? AND status = 'active'")
          .bind(input.driverId)
          .first<{ id: string; name: string }>()
      : Promise.resolve(null),
  ]);
  if (!vehicle) throw new RepositoryError("Veículo não encontrado ou indisponível.", 404);
  if (input.driverId && !driver) {
    throw new RepositoryError("Motorista não encontrado ou inativo.", 404);
  }
  const userName = driver?.name ?? input.userName;

  const maintenanceConflict = await db
    .prepare(
      `SELECT id FROM maintenance_schedules
       WHERE vehicle_id = ? AND status IN ('planned', 'in_progress')
         AND start_at < ? AND end_at > ?
       LIMIT 1`,
    )
    .bind(input.vehicleId, input.endAt, input.startAt)
    .first<{ id: string }>();
  if (maintenanceConflict) {
    throw new RepositoryError("Este veículo possui manutenção programada nesse período.", 409);
  }

  const vehicleVisitConflict = await db
    .prepare(
      `SELECT id FROM agenda_visits
       WHERE vehicle_id = ? AND status != 'cancelled'
         AND (visit_date || 'T' || start_time || ':00-03:00') < ?
         AND (visit_date || 'T' || end_time || ':00-03:00') > ?
       LIMIT 1`,
    )
    .bind(input.vehicleId, input.endAt, input.startAt)
    .first<{ id: string }>();
  if (vehicleVisitConflict) {
    throw new RepositoryError("Este veículo está vinculado a uma visita nesse horário.", 409);
  }

  if (input.driverId) {
    const [driverReservationConflict, driverVisitConflict] = await Promise.all([
      db
        .prepare(
          `SELECT id FROM reservations
           WHERE driver_id = ? AND status IN ('reserved', 'in_use')
             AND start_at < ? AND end_at > ?
           LIMIT 1`,
        )
        .bind(input.driverId, input.endAt, input.startAt)
        .first<{ id: string }>(),
      db
        .prepare(
          `SELECT id FROM agenda_visits
           WHERE driver_id = ? AND status != 'cancelled'
             AND (visit_date || 'T' || start_time || ':00-03:00') < ?
             AND (visit_date || 'T' || end_time || ':00-03:00') > ?
           LIMIT 1`,
        )
        .bind(input.driverId, input.endAt, input.startAt)
        .first<{ id: string }>(),
    ]);
    if (driverReservationConflict || driverVisitConflict) {
      throw new RepositoryError("Este motorista já possui um compromisso nesse horário.", 409);
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO reservations (
        id, vehicle_id, driver_id, user_name, user_email, destination, purpose,
        start_at, end_at, status, notes, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved', ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM reservations
        WHERE vehicle_id = ?
          AND status IN ('reserved', 'in_use')
          AND start_at < ?
          AND end_at > ?
      )`,
    )
    .bind(
      id,
      input.vehicleId,
      input.driverId,
      userName,
      actor.email,
      input.destination,
      input.purpose,
      input.startAt,
      input.endAt,
      input.notes,
      now,
      now,
      input.vehicleId,
      input.endAt,
      input.startAt,
    )
    .run();

  if (Number(result.meta.changes ?? 0) !== 1) {
    throw new RepositoryError("Este veículo já possui uma reserva nesse período.", 409);
  }

  await addAuditLog("reservation.created", actor, id, input.vehicleId, {
    driverId: input.driverId,
    startAt: input.startAt,
    endAt: input.endAt,
  });
  return getReservation(id);
}

export async function updateReservationStatus(
  id: string,
  action: "cancel" | "start" | "complete",
  actor: Actor,
) {
  const reservation = await getReservation(id);
  if (!reservation) throw new RepositoryError("Reserva não encontrada.", 404);
  const db = getDatabase();
  const now = new Date().toISOString();

  if (action === "cancel") {
    if (reservation.status !== "reserved") {
      throw new RepositoryError("Apenas reservas ainda não iniciadas podem ser canceladas.", 409);
    }
    await db
      .prepare(
        "UPDATE reservations SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND status = 'reserved'",
      )
      .bind(now, now, id)
      .run();
  }

  if (action === "start") {
    if (reservation.status !== "reserved") {
      throw new RepositoryError("Esta reserva não está pronta para iniciar.", 409);
    }
    if (reservation.checkoutPhotos < 1) {
      throw new RepositoryError("Adicione ao menos uma foto de saída antes de iniciar.", 409);
    }
    await db
      .prepare(
        "UPDATE reservations SET status = 'in_use', checkout_at = ?, updated_at = ? WHERE id = ? AND status = 'reserved'",
      )
      .bind(now, now, id)
      .run();
  }

  if (action === "complete") {
    if (reservation.status !== "in_use") {
      throw new RepositoryError("Somente uma utilização em andamento pode ser finalizada.", 409);
    }
    if (reservation.returnPhotos < 1) {
      throw new RepositoryError("Adicione ao menos uma foto de chegada antes de finalizar.", 409);
    }
    await db
      .prepare(
        `UPDATE reservations
         SET status = 'completed', return_at = ?, end_at = CASE WHEN end_at > ? THEN ? ELSE end_at END, updated_at = ?
         WHERE id = ? AND status = 'in_use'`,
      )
      .bind(now, now, now, now, id)
      .run();
  }

  await addAuditLog(`reservation.${action}`, actor, id, reservation.vehicleId);
  return getReservation(id);
}

export async function saveReservationPhoto(
  reservationId: string,
  stage: "checkout" | "return",
  file: File,
  actor: Actor,
) {
  const reservation = await getReservation(reservationId);
  if (!reservation) throw new RepositoryError("Reserva não encontrada.", 404);
  if (stage === "checkout" && reservation.status !== "reserved") {
    throw new RepositoryError("A foto de saída deve ser registrada antes do início.", 409);
  }
  if (stage === "return" && reservation.status !== "in_use") {
    throw new RepositoryError("A foto de chegada exige uma utilização em andamento.", 409);
  }

  const { PHOTOS } = getBindings();
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const id = crypto.randomUUID();
  const objectKey = `reservations/${reservationId}/${stage}/${id}.${extension}`;
  await PHOTOS.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      reservationId,
      stage,
      uploadedBy: actor.email,
    },
  });

  try {
    await getDatabase()
      .prepare(
        `INSERT INTO reservation_photos (
          id, reservation_id, stage, object_key, filename,
          content_type, size_bytes, uploaded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        reservationId,
        stage,
        objectKey,
        file.name,
        file.type,
        file.size,
        actor.email,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    await PHOTOS.delete(objectKey);
    throw error;
  }

  await addAuditLog("reservation.photo_uploaded", actor, reservationId, reservation.vehicleId, {
    stage,
    photoId: id,
  });
  return { id, stage, url: `/api/photos/${id}` };
}

export async function getPhoto(id: string) {
  await ensureDatabase();
  const db = getDatabase();
  const photo = await db
    .prepare(
      "SELECT object_key, filename, content_type FROM reservation_photos WHERE id = ?",
    )
    .bind(id)
    .first<{ object_key: string; filename: string; content_type: string }>();
  if (!photo) return null;
  const bindings = getBindings();
  const object = await bindings.PHOTOS.get(photo.object_key);
  if (!object) return null;
  return { ...photo, object };
}

function toAgendaVisit(row: AgendaVisitRow): AgendaVisitRecord {
  return {
    id: row.id,
    driverId: row.driver_id,
    driverName: row.driver_name,
    driverColor: row.driver_color,
    workSiteId: row.work_site_id,
    workSiteName: row.work_site_name,
    city: row.city,
    address: row.address,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicle_label,
    visitDate: row.visit_date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    purpose: row.purpose,
    notes: row.notes,
  };
}

const agendaVisitSelect = `SELECT
  av.id, av.driver_id, d.name AS driver_name, d.color AS driver_color,
  av.work_site_id, ws.name AS work_site_name, ws.city, ws.address,
  av.vehicle_id,
  CASE WHEN v.id IS NULL THEN NULL ELSE v.model || ' · ' || v.plate END AS vehicle_label,
  av.visit_date, av.start_time, av.end_time, av.status, av.purpose, av.notes
FROM agenda_visits av
JOIN drivers d ON d.id = av.driver_id
JOIN work_sites ws ON ws.id = av.work_site_id
LEFT JOIN vehicles v ON v.id = av.vehicle_id`;

function toMaintenance(row: MaintenanceRow): MaintenanceRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicle_label,
    driverId: row.driver_id,
    driverName: row.driver_name,
    driverColor: row.driver_color,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    serviceDescription: row.service_description,
    provider: row.provider,
    notes: row.notes,
  };
}

const maintenanceSelect = `SELECT
  m.id, m.vehicle_id, v.model || ' · ' || v.plate AS vehicle_label,
  m.driver_id, d.name AS driver_name, d.color AS driver_color,
  m.start_at, m.end_at, m.status, m.service_description, m.provider, m.notes
FROM maintenance_schedules m
JOIN vehicles v ON v.id = m.vehicle_id
JOIN drivers d ON d.id = m.driver_id`;

function toAgendaVehicleUse(row: AgendaVehicleUseRow) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleLabel: row.vehicle_label,
    driverId: row.driver_id,
    driverName: row.driver_name,
    driverColor: row.driver_color,
    destination: row.destination,
    purpose: row.purpose,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    notes: row.notes,
  };
}

const agendaVehicleUseSelect = `SELECT
  r.id, r.vehicle_id, v.model || ' · ' || v.plate AS vehicle_label,
  r.driver_id, d.name AS driver_name, d.color AS driver_color,
  r.destination, r.purpose, r.start_at, r.end_at, r.status, r.notes
FROM reservations r
JOIN vehicles v ON v.id = r.vehicle_id
JOIN drivers d ON d.id = r.driver_id`;

export async function getAgenda(
  startDate: string,
  days: number,
  filters: { driverId?: string; status?: string; query?: string } = {},
) {
  await ensureDatabase();
  const db = getDatabase();
  const safeDays = Math.min(Math.max(days, 7), 21);
  const endDate = addDays(startDate, safeDays - 1);
  const rangeStart = `${startDate}T00:00:00-03:00`;
  const rangeEnd = `${addDays(endDate, 1)}T00:00:00-03:00`;
  const driverId = filters.driverId ?? "";
  const status = filters.status ?? "";
  const vehicleUseStatus = status === "planned"
    ? "reserved"
    : status === "in_progress"
      ? "in_use"
      : status === "confirmed"
        ? "__none__"
        : status;
  const query = `%${(filters.query ?? "").trim()}%`;

  const [driverResult, workSiteResult, vehicleResult, visitResult, maintenanceResult, vehicleUseResult] = await Promise.all([
    db
      .prepare(
        "SELECT id, name, phone, color FROM drivers WHERE status = 'active' ORDER BY name",
      )
      .all<DriverRecord>(),
    db
      .prepare(
        `SELECT id, name, city, address, contact_name AS contactName,
          contact_phone AS contactPhone, notes
         FROM work_sites WHERE status = 'active' ORDER BY city, name`,
      )
      .all<WorkSiteRecord>(),
    db
      .prepare(
        "SELECT id, model, plate, color FROM vehicles WHERE status = 'active' ORDER BY model",
      )
      .all<{ id: string; model: string; plate: string; color: string }>(),
    db
      .prepare(
        `${agendaVisitSelect}
         WHERE av.visit_date BETWEEN ? AND ?
           AND (? = '' OR av.driver_id = ?)
           AND (? = '' OR av.status = ?)
           AND (? = '%%' OR ws.name LIKE ? OR ws.city LIKE ? OR d.name LIKE ? OR av.purpose LIKE ?)
         ORDER BY av.visit_date, av.start_time, d.name`,
      )
      .bind(
        startDate,
        endDate,
        driverId,
        driverId,
        status,
        status,
        query,
        query,
        query,
        query,
        query,
      )
      .all<AgendaVisitRow>(),
    db
      .prepare(
        `${maintenanceSelect}
         WHERE m.start_at < ? AND m.end_at > ?
           AND (? = '' OR m.driver_id = ?)
           AND (? = '' OR m.status = ?)
           AND (? = '%%' OR v.model LIKE ? OR v.plate LIKE ? OR d.name LIKE ?
             OR m.service_description LIKE ? OR m.provider LIKE ?)
         ORDER BY m.start_at, d.name`,
      )
      .bind(
        rangeEnd,
        rangeStart,
        driverId,
        driverId,
        status,
        status,
        query,
        query,
        query,
        query,
        query,
        query,
      )
      .all<MaintenanceRow>(),
    db
      .prepare(
        `${agendaVehicleUseSelect}
         WHERE r.start_at < ? AND r.end_at > ?
           AND (? = '' OR r.driver_id = ?)
           AND (? = '' OR r.status = ?)
           AND (? = '%%' OR v.model LIKE ? OR v.plate LIKE ? OR d.name LIKE ?
             OR r.destination LIKE ? OR r.purpose LIKE ?)
         ORDER BY r.start_at, d.name`,
      )
      .bind(
        rangeEnd,
        rangeStart,
        driverId,
        driverId,
        vehicleUseStatus,
        vehicleUseStatus,
        query,
        query,
        query,
        query,
        query,
        query,
      )
      .all<AgendaVehicleUseRow>(),
  ]);

  const visits = visitResult.results.map(toAgendaVisit);
  const maintenances = maintenanceResult.results.map(toMaintenance);
  const vehicleUses = vehicleUseResult.results.map(toAgendaVehicleUse);
  const activeVisits = visits.filter((visit) => visit.status !== "cancelled");
  const activeMaintenances = maintenances.filter((item) => item.status !== "cancelled");
  const activeVehicleUses = vehicleUses.filter((item) => item.status !== "cancelled");
  const occupiedDrivers = new Set([
    ...activeVisits.map((visit) => visit.driverId),
    ...activeMaintenances.map((item) => item.driverId),
    ...activeVehicleUses.map((item) => item.driverId),
  ]);

  return {
    startDate,
    endDate,
    days: safeDays,
    summary: {
      drivers: driverResult.results.length,
      visits: activeVisits.length,
      maintenances: activeMaintenances.length,
      vehicleUses: activeVehicleUses.length,
      confirmed: activeVisits.filter((visit) => visit.status === "confirmed").length,
      completed: activeVisits.filter((visit) => visit.status === "completed").length,
      driversScheduled: occupiedDrivers.size,
    },
    drivers: driverResult.results,
    workSites: workSiteResult.results,
    vehicles: vehicleResult.results.map((vehicle) => ({
      ...vehicle,
      label: `${vehicle.model} · ${vehicle.plate}`,
    })),
    visits,
    maintenances,
    vehicleUses,
  };
}

async function getDriverRecord(id: string): Promise<DriverRecord | null> {
  const row = await getDatabase()
    .prepare("SELECT id, name, phone, color FROM drivers WHERE id = ?")
    .bind(id)
    .first<DriverRecord>();
  return row ?? null;
}

export async function createDriver(
  input: { name: string; phone: string; color: string },
  actor: Actor,
) {
  await ensureDatabase();
  const db = getDatabase();
  const existing = await db
    .prepare(
      "SELECT id, status FROM drivers WHERE name = ? COLLATE NOCASE LIMIT 1",
    )
    .bind(input.name)
    .first<{ id: string; status: string }>();
  const now = new Date().toISOString();

  if (existing?.status === "active") {
    throw new RepositoryError("Já existe um motorista ativo com este nome.", 409);
  }

  if (existing) {
    await db
      .prepare(
        `UPDATE drivers
         SET name = ?, phone = ?, color = ?, status = 'active', updated_at = ?
         WHERE id = ?`,
      )
      .bind(input.name, input.phone, input.color, now, existing.id)
      .run();
    await addAuditLog("driver.reactivated", actor, null, null, {
      driverId: existing.id,
      name: input.name,
    });
    return getDriverRecord(existing.id);
  }

  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        `INSERT INTO drivers (
          id, name, phone, color, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      )
      .bind(id, input.name, input.phone, input.color, now, now)
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.toLocaleLowerCase().includes("unique")) {
      throw new RepositoryError("Já existe um motorista com este nome.", 409);
    }
    throw error;
  }

  await addAuditLog("driver.created", actor, null, null, {
    driverId: id,
    name: input.name,
  });
  return getDriverRecord(id);
}

export async function archiveDriver(id: string, actor: Actor) {
  await ensureDatabase();
  const db = getDatabase();
  const driver = await db
    .prepare("SELECT id, name, status FROM drivers WHERE id = ?")
    .bind(id)
    .first<{ id: string; name: string; status: string }>();

  if (!driver || driver.status !== "active") {
    throw new RepositoryError("Motorista não encontrado ou já removido.", 404);
  }

  const [reservationInUse, visitInProgress, maintenanceInProgress] = await Promise.all([
    db
      .prepare("SELECT id FROM reservations WHERE driver_id = ? AND status = 'in_use' LIMIT 1")
      .bind(id)
      .first<{ id: string }>(),
    db
      .prepare("SELECT id FROM agenda_visits WHERE driver_id = ? AND status = 'in_progress' LIMIT 1")
      .bind(id)
      .first<{ id: string }>(),
    db
      .prepare("SELECT id FROM maintenance_schedules WHERE driver_id = ? AND status = 'in_progress' LIMIT 1")
      .bind(id)
      .first<{ id: string }>(),
  ]);

  if (reservationInUse || visitInProgress || maintenanceInProgress) {
    throw new RepositoryError(
      "Este motorista possui uma atividade em andamento. Conclua a utilização, visita ou manutenção antes de removê-lo.",
      409,
    );
  }

  const [reservationCount, visitCount, maintenanceCount] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) AS total FROM reservations WHERE driver_id = ? AND status = 'reserved'")
      .bind(id)
      .first<{ total: number }>(),
    db
      .prepare("SELECT COUNT(*) AS total FROM agenda_visits WHERE driver_id = ? AND status IN ('planned', 'confirmed')")
      .bind(id)
      .first<{ total: number }>(),
    db
      .prepare("SELECT COUNT(*) AS total FROM maintenance_schedules WHERE driver_id = ? AND status = 'planned'")
      .bind(id)
      .first<{ total: number }>(),
  ]);
  const now = new Date().toISOString();
  const cancelled = {
    reservations: Number(reservationCount?.total ?? 0),
    visits: Number(visitCount?.total ?? 0),
    maintenances: Number(maintenanceCount?.total ?? 0),
  };

  await db.batch([
    db
      .prepare("UPDATE drivers SET status = 'archived', updated_at = ? WHERE id = ? AND status = 'active'")
      .bind(now, id),
    db
      .prepare(
        `UPDATE reservations
         SET status = 'cancelled', cancelled_at = ?, updated_at = ?
         WHERE driver_id = ? AND status = 'reserved'`,
      )
      .bind(now, now, id),
    db
      .prepare(
        `UPDATE agenda_visits SET status = 'cancelled', updated_at = ?
         WHERE driver_id = ? AND status IN ('planned', 'confirmed')`,
      )
      .bind(now, id),
    db
      .prepare(
        `UPDATE maintenance_schedules SET status = 'cancelled', updated_at = ?
         WHERE driver_id = ? AND status = 'planned'`,
      )
      .bind(now, id),
  ]);

  await addAuditLog("driver.archived", actor, null, null, {
    driverId: id,
    name: driver.name,
    cancelled,
  });
  return { id, name: driver.name, archived: true, cancelled };
}

async function getAgendaVisit(id: string) {
  const row = await getDatabase()
    .prepare(`${agendaVisitSelect} WHERE av.id = ?`)
    .bind(id)
    .first<AgendaVisitRow>();
  return row ? toAgendaVisit(row) : null;
}

export async function createAgendaVisit(
  input: {
    driverId: string;
    workSiteId: string;
    vehicleId: string | null;
    visitDate: string;
    startTime: string;
    endTime: string;
    purpose: string;
    notes: string;
  },
  actor: Actor,
) {
  await ensureDatabase();
  const db = getDatabase();

  const [driver, workSite] = await Promise.all([
    db
      .prepare("SELECT id, name FROM drivers WHERE id = ? AND status = 'active'")
      .bind(input.driverId)
      .first<{ id: string; name: string }>(),
    db
      .prepare("SELECT id FROM work_sites WHERE id = ? AND status = 'active'")
      .bind(input.workSiteId)
      .first<{ id: string }>(),
  ]);
  if (!driver) throw new RepositoryError("Motorista não encontrado ou inativo.", 404);
  if (!workSite) throw new RepositoryError("Obra não encontrada ou inativa.", 404);

  if (input.vehicleId) {
    const vehicle = await db
      .prepare("SELECT id FROM vehicles WHERE id = ? AND status = 'active'")
      .bind(input.vehicleId)
      .first<{ id: string }>();
    if (!vehicle) throw new RepositoryError("Veículo não encontrado ou indisponível.", 404);
  }

  const driverConflict = await db
    .prepare(
      `SELECT id FROM agenda_visits
       WHERE driver_id = ? AND visit_date = ?
         AND status != 'cancelled' AND start_time < ? AND end_time > ?
       LIMIT 1`,
    )
    .bind(input.driverId, input.visitDate, input.endTime, input.startTime)
    .first<{ id: string }>();
  if (driverConflict) {
    throw new RepositoryError("Este motorista já possui uma visita nesse horário.", 409);
  }

  if (input.vehicleId) {
    const vehicleConflict = await db
      .prepare(
        `SELECT id FROM agenda_visits
         WHERE vehicle_id = ? AND visit_date = ?
           AND status != 'cancelled' AND start_time < ? AND end_time > ?
         LIMIT 1`,
      )
      .bind(input.vehicleId, input.visitDate, input.endTime, input.startTime)
      .first<{ id: string }>();
    if (vehicleConflict) {
      throw new RepositoryError("Este veículo já está vinculado a outra visita nesse horário.", 409);
    }

    const periodStart = `${input.visitDate}T${input.startTime}:00-03:00`;
    const periodEnd = `${input.visitDate}T${input.endTime}:00-03:00`;
    const reservationConflict = await db
      .prepare(
        `SELECT id FROM reservations
         WHERE vehicle_id = ? AND status IN ('reserved', 'in_use')
           AND lower(user_name) != lower(?)
           AND start_at < ? AND end_at > ?
         LIMIT 1`,
      )
      .bind(input.vehicleId, driver.name, periodEnd, periodStart)
      .first<{ id: string }>();
    if (reservationConflict) {
      throw new RepositoryError("Este veículo já possui uma reserva nesse horário.", 409);
    }

    const maintenanceConflict = await db
      .prepare(
        `SELECT id FROM maintenance_schedules
         WHERE vehicle_id = ? AND status IN ('planned', 'in_progress')
           AND start_at < ? AND end_at > ?
         LIMIT 1`,
      )
      .bind(input.vehicleId, periodEnd, periodStart)
      .first<{ id: string }>();
    if (maintenanceConflict) {
      throw new RepositoryError("Este veículo possui manutenção programada nesse horário.", 409);
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO agenda_visits (
        id, driver_id, work_site_id, vehicle_id, visit_date, start_time,
        end_time, status, purpose, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.driverId,
      input.workSiteId,
      input.vehicleId,
      input.visitDate,
      input.startTime,
      input.endTime,
      input.purpose,
      input.notes,
      actor.email,
      now,
      now,
    )
    .run();

  await addAuditLog("agenda.visit_created", actor, null, input.vehicleId, {
    agendaVisitId: id,
    driverId: input.driverId,
    workSiteId: input.workSiteId,
    visitDate: input.visitDate,
  });
  return getAgendaVisit(id);
}

export async function updateAgendaVisitStatus(
  id: string,
  action: "confirm" | "start" | "complete" | "cancel",
  actor: Actor,
) {
  await ensureDatabase();
  const visit = await getAgendaVisit(id);
  if (!visit) throw new RepositoryError("Visita não encontrada.", 404);

  const transitions: Record<
    typeof action,
    { from: AgendaStatus[]; to: AgendaStatus; error: string }
  > = {
    confirm: {
      from: ["planned"],
      to: "confirmed",
      error: "Apenas visitas planejadas podem ser confirmadas.",
    },
    start: {
      from: ["planned", "confirmed"],
      to: "in_progress",
      error: "Esta visita não está pronta para iniciar.",
    },
    complete: {
      from: ["in_progress"],
      to: "completed",
      error: "Somente uma visita em andamento pode ser concluída.",
    },
    cancel: {
      from: ["planned", "confirmed"],
      to: "cancelled",
      error: "Esta visita não pode mais ser cancelada.",
    },
  };
  const transition = transitions[action];
  if (!transition.from.includes(visit.status)) {
    throw new RepositoryError(transition.error, 409);
  }

  await getDatabase()
    .prepare("UPDATE agenda_visits SET status = ?, updated_at = ? WHERE id = ?")
    .bind(transition.to, new Date().toISOString(), id)
    .run();
  await addAuditLog(`agenda.visit_${action}`, actor, null, visit.vehicleId, {
    agendaVisitId: id,
  });
  return getAgendaVisit(id);
}

async function getMaintenance(id: string) {
  const row = await getDatabase()
    .prepare(`${maintenanceSelect} WHERE m.id = ?`)
    .bind(id)
    .first<MaintenanceRow>();
  return row ? toMaintenance(row) : null;
}

export async function createMaintenance(
  input: {
    vehicleId: string;
    driverId: string;
    startAt: string;
    endAt: string;
    serviceDescription: string;
    provider: string;
    notes: string;
  },
  actor: Actor,
) {
  await ensureDatabase();
  const db = getDatabase();
  const [vehicle, driver] = await Promise.all([
    db
      .prepare("SELECT id FROM vehicles WHERE id = ? AND status = 'active'")
      .bind(input.vehicleId)
      .first<{ id: string }>(),
    db
      .prepare("SELECT id FROM drivers WHERE id = ? AND status = 'active'")
      .bind(input.driverId)
      .first<{ id: string }>(),
  ]);
  if (!vehicle) throw new RepositoryError("Veículo não encontrado ou indisponível.", 404);
  if (!driver) throw new RepositoryError("Motorista responsável não encontrado ou inativo.", 404);

  const [maintenanceConflict, reservationConflict, visitConflict] = await Promise.all([
    db
      .prepare(
        `SELECT id FROM maintenance_schedules
         WHERE vehicle_id = ? AND status IN ('planned', 'in_progress')
           AND start_at < ? AND end_at > ?
         LIMIT 1`,
      )
      .bind(input.vehicleId, input.endAt, input.startAt)
      .first<{ id: string }>(),
    db
      .prepare(
        `SELECT id FROM reservations
         WHERE vehicle_id = ? AND status IN ('reserved', 'in_use')
           AND start_at < ? AND end_at > ?
         LIMIT 1`,
      )
      .bind(input.vehicleId, input.endAt, input.startAt)
      .first<{ id: string }>(),
    db
      .prepare(
        `SELECT id FROM agenda_visits
         WHERE vehicle_id = ? AND status != 'cancelled'
           AND (visit_date || 'T' || start_time || ':00-03:00') < ?
           AND (visit_date || 'T' || end_time || ':00-03:00') > ?
         LIMIT 1`,
      )
      .bind(input.vehicleId, input.endAt, input.startAt)
      .first<{ id: string }>(),
  ]);
  if (maintenanceConflict) {
    throw new RepositoryError("Este veículo já possui manutenção nesse período.", 409);
  }
  if (reservationConflict) {
    throw new RepositoryError("Cancele ou altere a reserva do veículo antes de programar a manutenção.", 409);
  }
  if (visitConflict) {
    throw new RepositoryError("Este veículo está vinculado a uma visita no período informado.", 409);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO maintenance_schedules (
        id, vehicle_id, driver_id, start_at, end_at, status,
        service_description, provider, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.vehicleId,
      input.driverId,
      input.startAt,
      input.endAt,
      input.serviceDescription,
      input.provider,
      input.notes,
      actor.email,
      now,
      now,
    )
    .run();

  await addAuditLog("maintenance.created", actor, null, input.vehicleId, {
    maintenanceId: id,
    driverId: input.driverId,
    startAt: input.startAt,
    endAt: input.endAt,
  });
  return getMaintenance(id);
}

export async function updateMaintenanceStatus(
  id: string,
  action: "start" | "complete" | "cancel",
  actor: Actor,
) {
  await ensureDatabase();
  const db = getDatabase();
  const maintenance = await getMaintenance(id);
  if (!maintenance) throw new RepositoryError("Manutenção não encontrada.", 404);

  const transitions: Record<
    typeof action,
    { from: MaintenanceStatus[]; to: MaintenanceStatus; error: string }
  > = {
    start: {
      from: ["planned"],
      to: "in_progress",
      error: "Apenas manutenções planejadas podem ser iniciadas.",
    },
    complete: {
      from: ["in_progress"],
      to: "completed",
      error: "Somente uma manutenção em andamento pode ser concluída.",
    },
    cancel: {
      from: ["planned"],
      to: "cancelled",
      error: "Esta manutenção não pode mais ser cancelada.",
    },
  };
  const transition = transitions[action];
  if (!transition.from.includes(maintenance.status)) {
    throw new RepositoryError(transition.error, 409);
  }

  await db
    .prepare("UPDATE maintenance_schedules SET status = ?, updated_at = ? WHERE id = ?")
    .bind(transition.to, new Date().toISOString(), id)
    .run();
  await addAuditLog(`maintenance.${action}`, actor, null, maintenance.vehicleId, {
    maintenanceId: id,
  });
  return getMaintenance(id);
}

function roundedHours(milliseconds: number) {
  return Math.round((milliseconds / 3_600_000) * 10) / 10;
}

function overlapMilliseconds(
  startValue: string,
  endValue: string,
  windowStart: number,
  windowEnd: number,
) {
  const start = Math.max(Date.parse(startValue), windowStart);
  const end = Math.min(Date.parse(endValue), windowEnd);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? end - start : 0;
}

function dateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

function businessDaysBetween(startDate: string, endDate: string) {
  return dateRange(startDate, endDate).filter((date) => {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    return day !== 0 && day !== 6;
  }).length;
}

export async function getManagementDashboard(startDate: string, endDate: string) {
  await ensureDatabase();
  const db = getDatabase();
  const periodStartIso = `${startDate}T00:00:00-03:00`;
  const periodEndIso = `${addDays(endDate, 1)}T00:00:00-03:00`;
  const periodStart = Date.parse(periodStartIso);
  const periodEnd = Date.parse(periodEndIso);
  const nowIso = new Date().toISOString();
  const now = Date.parse(nowIso);

  const [vehicleResult, reservationResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, plate, model, color, category, odometer_km AS odometerKm
         FROM vehicles WHERE status = 'active' ORDER BY model`,
      )
      .all<{
        id: string;
        plate: string;
        model: string;
        color: string;
        category: string;
        odometerKm: number | null;
      }>(),
    db
      .prepare(
        `SELECT
          r.id, r.vehicle_id, v.plate, v.model, v.color, v.category,
          r.user_name, r.user_email, r.destination, r.purpose,
          r.start_at, r.end_at, r.status, r.checkout_at, r.return_at, r.cancelled_at,
          SUM(CASE WHEN p.stage = 'checkout' THEN 1 ELSE 0 END) AS checkout_photos,
          SUM(CASE WHEN p.stage = 'return' THEN 1 ELSE 0 END) AS return_photos
        FROM reservations r
        JOIN vehicles v ON v.id = r.vehicle_id
        LEFT JOIN reservation_photos p ON p.reservation_id = r.id
        WHERE r.start_at < ? AND r.end_at >= ?
        GROUP BY r.id
        ORDER BY r.start_at`,
      )
      .bind(periodEndIso, periodStartIso)
      .all<ManagementReservationRow>(),
  ]);

  const reservations = reservationResult.results;
  const actualInterval = (row: ManagementReservationRow) => {
    if (row.status !== "in_use" && row.status !== "completed") return null;
    const start = row.checkout_at ?? row.start_at;
    const end = row.return_at ?? (row.status === "in_use" ? nowIso : row.end_at);
    return Date.parse(end) > Date.parse(start) ? { start, end } : null;
  };

  const vehicleMetrics = new Map(
    vehicleResult.results.map((vehicle) => [
      vehicle.id,
      {
        ...vehicle,
        usageMs: 0,
        plannedMs: 0,
        trips: 0,
        reservations: 0,
        completed: 0,
        cancelled: 0,
        photoEligible: 0,
        photoCompliant: 0,
        drivers: new Set<string>(),
        lastUse: null as string | null,
      },
    ]),
  );
  const driverMetrics = new Map<
    string,
    {
      name: string;
      email: string;
      usageMs: number;
      plannedMs: number;
      trips: number;
      completed: number;
      vehicles: Set<string>;
      destinations: Set<string>;
    }
  >();
  const destinationMetrics = new Map<string, { name: string; visits: number; usageMs: number }>();
  const daily = new Map(
    dateRange(startDate, endDate).map((date) => [date, { date, usageMs: 0, reservations: 0 }]),
  );

  let totalUsageMs = 0;
  let totalPlannedMs = 0;
  let actualTrips = 0;
  let activeReservations = 0;
  let cancelled = 0;
  let photoEligible = 0;
  let photoCompliant = 0;
  let departureMeasured = 0;
  let departureOnTime = 0;
  let returnMeasured = 0;
  let returnOnTime = 0;
  let overdueTrips = 0;
  let longestTrip: {
    driver: string;
    vehicle: string;
    destination: string;
    hours: number;
  } | null = null;

  for (const row of reservations) {
    const vehicle = vehicleMetrics.get(row.vehicle_id);
    if (!vehicle) continue;
    const plannedMs =
      row.status === "cancelled"
        ? 0
        : overlapMilliseconds(row.start_at, row.end_at, periodStart, periodEnd);
    const interval = actualInterval(row);
    const usageMs = interval
      ? overlapMilliseconds(interval.start, interval.end, periodStart, periodEnd)
      : 0;

    if (row.status === "cancelled") {
      cancelled += 1;
      vehicle.cancelled += 1;
    } else {
      activeReservations += 1;
      totalPlannedMs += plannedMs;
      vehicle.plannedMs += plannedMs;
      vehicle.reservations += 1;
      const reservationDate = row.start_at.slice(0, 10);
      const day = daily.get(reservationDate);
      if (day) day.reservations += 1;
    }

    if (interval && usageMs > 0) {
      actualTrips += 1;
      totalUsageMs += usageMs;
      vehicle.usageMs += usageMs;
      vehicle.trips += 1;
      vehicle.drivers.add(row.user_name);
      if (!vehicle.lastUse || interval.start > vehicle.lastUse) vehicle.lastUse = interval.start;
      if (row.status === "completed") vehicle.completed += 1;

      const driverKey = row.user_email.toLocaleLowerCase();
      const driver = driverMetrics.get(driverKey) ?? {
        name: row.user_name,
        email: row.user_email,
        usageMs: 0,
        plannedMs: 0,
        trips: 0,
        completed: 0,
        vehicles: new Set<string>(),
        destinations: new Set<string>(),
      };
      driver.usageMs += usageMs;
      driver.plannedMs += plannedMs;
      driver.trips += 1;
      if (row.status === "completed") driver.completed += 1;
      driver.vehicles.add(row.model);
      driver.destinations.add(row.destination);
      driverMetrics.set(driverKey, driver);

      const destination = destinationMetrics.get(row.destination) ?? {
        name: row.destination,
        visits: 0,
        usageMs: 0,
      };
      destination.visits += 1;
      destination.usageMs += usageMs;
      destinationMetrics.set(row.destination, destination);

      for (const [date, day] of daily) {
        const dayStart = Date.parse(`${date}T00:00:00-03:00`);
        const dayEnd = Date.parse(`${addDays(date, 1)}T00:00:00-03:00`);
        day.usageMs += overlapMilliseconds(interval.start, interval.end, dayStart, dayEnd);
      }

      const tripHours = roundedHours(usageMs);
      if (!longestTrip || tripHours > longestTrip.hours) {
        longestTrip = {
          driver: row.user_name,
          vehicle: `${row.model} · ${row.plate}`,
          destination: row.destination,
          hours: tripHours,
        };
      }
    }

    if (row.status === "in_use" || row.status === "completed") {
      photoEligible += 1;
      vehicle.photoEligible += 1;
      const compliant =
        Number(row.checkout_photos) > 0 &&
        (row.status !== "completed" || Number(row.return_photos) > 0);
      if (compliant) {
        photoCompliant += 1;
        vehicle.photoCompliant += 1;
      }
    }

    if (row.checkout_at) {
      departureMeasured += 1;
      if (Date.parse(row.checkout_at) <= Date.parse(row.start_at) + 15 * 60_000) {
        departureOnTime += 1;
      }
    }
    if (row.status === "completed" && row.return_at) {
      returnMeasured += 1;
      if (Date.parse(row.return_at) <= Date.parse(row.end_at) + 15 * 60_000) returnOnTime += 1;
    }
    if (row.status === "in_use" && Date.parse(row.end_at) < now) overdueTrips += 1;
  }

  const vehicles = [...vehicleMetrics.values()]
    .map((vehicle) => ({
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      color: vehicle.color,
      category: vehicle.category,
      odometerKm: vehicle.odometerKm == null ? null : Number(vehicle.odometerKm),
      usageHours: roundedHours(vehicle.usageMs),
      plannedHours: roundedHours(vehicle.plannedMs),
      executionRate: vehicle.plannedMs
        ? Math.min(100, Math.round((vehicle.usageMs / vehicle.plannedMs) * 100))
        : 0,
      trips: vehicle.trips,
      reservations: vehicle.reservations,
      completed: vehicle.completed,
      cancelled: vehicle.cancelled,
      drivers: [...vehicle.drivers],
      photoCompliance: vehicle.photoEligible
        ? Math.round((vehicle.photoCompliant / vehicle.photoEligible) * 100)
        : null,
      lastUse: vehicle.lastUse,
    }))
    .sort((a, b) => b.usageHours - a.usageHours || a.model.localeCompare(b.model));

  const drivers = [...driverMetrics.values()]
    .map((driver) => ({
      name: driver.name,
      email: driver.email,
      usageHours: roundedHours(driver.usageMs),
      plannedHours: roundedHours(driver.plannedMs),
      averageHours: driver.trips ? roundedHours(driver.usageMs / driver.trips) : 0,
      trips: driver.trips,
      completed: driver.completed,
      vehicles: [...driver.vehicles],
      destinations: driver.destinations.size,
    }))
    .sort((a, b) => b.usageHours - a.usageHours || b.trips - a.trips);

  const destinations = [...destinationMetrics.values()]
    .map((destination) => ({
      name: destination.name,
      visits: destination.visits,
      usageHours: roundedHours(destination.usageMs),
    }))
    .sort((a, b) => b.visits - a.visits || b.usageHours - a.usageHours)
    .slice(0, 5);

  const businessDays = Math.max(1, businessDaysBetween(startDate, endDate));
  const capacityHours = vehicleResult.results.length * businessDays * 9;
  const totalUsageHours = roundedHours(totalUsageMs);
  const topDriverShare = totalUsageHours > 0 && drivers[0]
    ? Math.round((drivers[0].usageHours / totalUsageHours) * 100)
    : 0;
  const unusedVehicles = vehicles.filter((vehicle) => vehicle.usageHours === 0).length;
  const pendingPhotos = Math.max(0, photoEligible - photoCompliant);

  return {
    period: { startDate, endDate, businessDays, capacityHours },
    summary: {
      totalVehicles: vehicleResult.results.length,
      activeDrivers: drivers.length,
      reservations: activeReservations,
      actualTrips,
      usageHours: totalUsageHours,
      plannedHours: roundedHours(totalPlannedMs),
      averageTripHours: actualTrips ? roundedHours(totalUsageMs / actualTrips) : 0,
      capacityUtilization: capacityHours
        ? Math.min(100, Math.round((totalUsageHours / capacityHours) * 100))
        : 0,
      cancellationRate: reservations.length
        ? Math.round((cancelled / reservations.length) * 100)
        : 0,
      photoCompliance: photoEligible ? Math.round((photoCompliant / photoEligible) * 100) : 100,
      departurePunctuality: departureMeasured
        ? Math.round((departureOnTime / departureMeasured) * 100)
        : null,
      returnPunctuality: returnMeasured ? Math.round((returnOnTime / returnMeasured) * 100) : null,
    },
    highlights: {
      topDriver: drivers[0] ?? null,
      topVehicle: vehicles[0]?.usageHours ? vehicles[0] : null,
      longestTrip,
      topDriverShare,
    },
    alerts: {
      overdueTrips,
      pendingPhotos,
      unusedVehicles,
      highConcentration: topDriverShare >= 60 ? topDriverShare : 0,
    },
    vehicles,
    drivers,
    destinations,
    daily: [...daily.values()].map((day) => ({
      date: day.date,
      usageHours: roundedHours(day.usageMs),
      reservations: day.reservations,
    })),
    statusDistribution: {
      reserved: reservations.filter((row) => row.status === "reserved").length,
      inUse: reservations.filter((row) => row.status === "in_use").length,
      completed: reservations.filter((row) => row.status === "completed").length,
      cancelled,
    },
  };
}

async function getVehicleRecord(id: string): Promise<VehicleRecord | null> {
  const row = await getDatabase()
    .prepare(
      `SELECT id, plate, model, color, category, odometer_km AS odometerKm, status,
        created_at AS createdAt, updated_at AS updatedAt
       FROM vehicles WHERE id = ?`,
    )
    .bind(id)
    .first<VehicleRecord>();
  return row ?? null;
}

export async function createVehicle(
  input: {
    plate: string;
    model: string;
    color: string;
    category: string;
    odometerKm: number;
    status: "active" | "maintenance";
  },
  actor: Actor,
) {
  await ensureDatabase();
  const db = getDatabase();
  const duplicate = await db
    .prepare("SELECT id FROM vehicles WHERE plate = ?")
    .bind(input.plate)
    .first<{ id: string }>();
  if (duplicate) throw new RepositoryError("Já existe um veículo cadastrado com esta placa.", 409);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await db
      .prepare(
        `INSERT INTO vehicles (
          id, plate, model, color, category, odometer_km, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.plate,
        input.model,
        input.color,
        input.category,
        input.odometerKm,
        input.status,
        now,
        now,
      )
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.toLocaleLowerCase().includes("unique")) {
      throw new RepositoryError("Já existe um veículo cadastrado com esta placa.", 409);
    }
    throw error;
  }

  await addAuditLog("vehicle.created", actor, null, id, {
    plate: input.plate,
    odometerKm: input.odometerKm,
    status: input.status,
  });
  return getVehicleRecord(id);
}

export async function updateVehicle(
  id: string,
  input: {
    plate: string;
    model: string;
    color: string;
    category: string;
    odometerKm: number;
    status: "active" | "maintenance";
  },
  actor: Actor,
) {
  await ensureDatabase();
  const db = getDatabase();
  const current = await getVehicleRecord(id);
  if (!current || current.status === "archived") {
    throw new RepositoryError("Veículo não encontrado.", 404);
  }

  const duplicate = await db
    .prepare("SELECT id FROM vehicles WHERE plate = ? AND id != ?")
    .bind(input.plate, id)
    .first<{ id: string }>();
  if (duplicate) throw new RepositoryError("Já existe um veículo cadastrado com esta placa.", 409);

  if (current.odometerKm != null && input.odometerKm < current.odometerKm) {
    throw new RepositoryError(
      `O odômetro não pode ser menor que ${current.odometerKm.toLocaleString("pt-BR")} km.`,
      409,
    );
  }

  if (current.status !== "maintenance" && input.status === "maintenance") {
    const [reservation, visit] = await Promise.all([
      db
        .prepare(
          `SELECT id FROM reservations
           WHERE vehicle_id = ? AND status IN ('reserved', 'in_use') LIMIT 1`,
        )
        .bind(id)
        .first<{ id: string }>(),
      db
        .prepare(
          `SELECT id FROM agenda_visits
           WHERE vehicle_id = ? AND status IN ('planned', 'confirmed', 'in_progress') LIMIT 1`,
        )
        .bind(id)
        .first<{ id: string }>(),
    ]);
    if (reservation || visit) {
      throw new RepositoryError(
        "Cancele ou conclua as reservas e visitas abertas antes de colocar o veículo em manutenção.",
        409,
      );
    }
  }

  try {
    await db
      .prepare(
        `UPDATE vehicles SET
          plate = ?, model = ?, color = ?, category = ?, odometer_km = ?, status = ?, updated_at = ?
         WHERE id = ? AND status != 'archived'`,
      )
      .bind(
        input.plate,
        input.model,
        input.color,
        input.category,
        input.odometerKm,
        input.status,
        new Date().toISOString(),
        id,
      )
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.toLocaleLowerCase().includes("unique")) {
      throw new RepositoryError("Já existe um veículo cadastrado com esta placa.", 409);
    }
    throw error;
  }

  await addAuditLog("vehicle.updated", actor, null, id, {
    before: {
      plate: current.plate,
      model: current.model,
      color: current.color,
      category: current.category,
      odometerKm: current.odometerKm,
      status: current.status,
    },
    after: input,
  });
  return getVehicleRecord(id);
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
