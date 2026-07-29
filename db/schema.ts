import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const vehicles = sqliteTable(
  "vehicles",
  {
    id: text("id").primaryKey(),
    plate: text("plate").notNull(),
    model: text("model").notNull(),
    color: text("color").notNull(),
    category: text("category").notNull().default("Utilitário"),
    odometerKm: integer("odometer_km"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("vehicles_plate_unique").on(table.plate),
    index("vehicles_status_idx").on(table.status),
  ],
);

export const reservations = sqliteTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    driverId: text("driver_id"),
    userName: text("user_name").notNull(),
    userEmail: text("user_email").notNull(),
    destination: text("destination").notNull(),
    purpose: text("purpose").notNull().default("Visita externa"),
    startAt: text("start_at").notNull(),
    endAt: text("end_at").notNull(),
    status: text("status").notNull().default("reserved"),
    notes: text("notes").notNull().default(""),
    checkoutAt: text("checkout_at"),
    returnAt: text("return_at"),
    cancelledAt: text("cancelled_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("reservations_vehicle_period_idx").on(
      table.vehicleId,
      table.startAt,
      table.endAt,
    ),
    index("reservations_status_idx").on(table.status),
    index("reservations_user_idx").on(table.userEmail),
    index("reservations_driver_idx").on(table.driverId),
  ],
);

export const reservationPhotos = sqliteTable(
  "reservation_photos",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    objectKey: text("object_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("reservation_photos_object_key_unique").on(table.objectKey),
    index("reservation_photos_reservation_stage_idx").on(
      table.reservationId,
      table.stage,
    ),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    reservationId: text("reservation_id"),
    vehicleId: text("vehicle_id"),
    actorEmail: text("actor_email").notNull(),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("audit_logs_reservation_idx").on(table.reservationId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const drivers = sqliteTable(
  "drivers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    color: text("color").notNull().default("#0f766e"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("drivers_status_idx").on(table.status),
    uniqueIndex("drivers_name_unique").on(table.name),
  ],
);

export const workSites = sqliteTable(
  "work_sites",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    address: text("address").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("work_sites_status_idx").on(table.status),
    index("work_sites_city_idx").on(table.city),
  ],
);

export const agendaVisits = sqliteTable(
  "agenda_visits",
  {
    id: text("id").primaryKey(),
    driverId: text("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "restrict" }),
    workSiteId: text("work_site_id")
      .notNull()
      .references(() => workSites.id, { onDelete: "restrict" }),
    vehicleId: text("vehicle_id").references(() => vehicles.id, { onDelete: "restrict" }),
    visitDate: text("visit_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    status: text("status").notNull().default("planned"),
    purpose: text("purpose").notNull().default("Visita de obra"),
    notes: text("notes").notNull().default(""),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("agenda_visits_driver_period_idx").on(
      table.driverId,
      table.visitDate,
      table.startTime,
      table.endTime,
    ),
    index("agenda_visits_vehicle_period_idx").on(
      table.vehicleId,
      table.visitDate,
      table.startTime,
      table.endTime,
    ),
    index("agenda_visits_status_idx").on(table.status),
    index("agenda_visits_work_site_idx").on(table.workSiteId),
  ],
);

export const maintenanceSchedules = sqliteTable(
  "maintenance_schedules",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    driverId: text("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "restrict" }),
    startAt: text("start_at").notNull(),
    endAt: text("end_at").notNull(),
    status: text("status").notNull().default("planned"),
    serviceDescription: text("service_description").notNull(),
    provider: text("provider").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("maintenance_schedules_vehicle_period_idx").on(
      table.vehicleId,
      table.startAt,
      table.endAt,
    ),
    index("maintenance_schedules_driver_idx").on(table.driverId),
    index("maintenance_schedules_status_idx").on(table.status),
  ],
);
