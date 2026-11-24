// Project definitions for the seed. Compact DSL, one table per line:
//   table_name: col TYPE [pk] [ai] [nn] [uq] [un] [fk>other_table] [=default] [#comment...] | next col ...
// share: 0 private, 2 public. ageDays: when created; editedDays: last edit (days ago).
module.exports = [
  {
    title: "Pasar Kita marketplace v3", share: 2, ageDays: 41, editedDays: 0,
    description: "Multi-vendor marketplace: sellers, catalog, carts, orders, payments via Midtrans, shipping (JNE/SiCepat), reviews and vouchers. v3 splits order items per seller shipment.",
    tables: `
users: id BIGINT pk ai | email VARCHAR(160) nn uq | password_hash VARCHAR(255) nn | full_name VARCHAR(120) nn | phone VARCHAR(20) | role VARCHAR(16) nn ='buyer' | created_at TIMESTAMP nn =CURRENT_TIMESTAMP
addresses: id BIGINT pk ai | user_id BIGINT nn fk>users | label VARCHAR(40) | recipient VARCHAR(120) nn | street TEXT nn | city VARCHAR(80) nn | postal_code CHAR(5) nn | is_default TINYINT(1) nn =0
sellers: id BIGINT pk ai | user_id BIGINT nn uq fk>users | shop_name VARCHAR(80) nn uq | slug VARCHAR(90) nn uq | city VARCHAR(80) | rating DECIMAL(3,2) =0.00 | verified_at DATETIME
categories: id INT pk ai | parent_id INT fk>categories | name VARCHAR(80) nn | slug VARCHAR(90) nn uq | sort_order INT nn =0
products: id BIGINT pk ai | seller_id BIGINT nn fk>sellers | category_id INT nn fk>categories | name VARCHAR(160) nn | description TEXT | price DECIMAL(12,2) nn un | weight_gram INT nn un | status VARCHAR(16) nn ='draft' | created_at TIMESTAMP nn
product_images: id BIGINT pk ai | product_id BIGINT nn fk>products | url VARCHAR(255) nn | position TINYINT nn =0
product_variants: id BIGINT pk ai | product_id BIGINT nn fk>products | sku VARCHAR(40) nn uq | option_1 VARCHAR(40) | option_2 VARCHAR(40) | stock INT nn un =0 | price_delta DECIMAL(12,2) =0
carts: id BIGINT pk ai | user_id BIGINT nn uq fk>users | updated_at TIMESTAMP nn
cart_items: id BIGINT pk ai | cart_id BIGINT nn fk>carts | variant_id BIGINT nn fk>product_variants | qty SMALLINT nn un =1
vouchers: id INT pk ai | code VARCHAR(24) nn uq | type VARCHAR(10) nn #percent or fixed | value DECIMAL(12,2) nn | min_spend DECIMAL(12,2) =0 | quota INT | starts_at DATETIME nn | ends_at DATETIME nn
orders: id BIGINT pk ai | user_id BIGINT nn fk>users | address_id BIGINT nn fk>addresses | voucher_id INT fk>vouchers | invoice_no VARCHAR(30) nn uq | status VARCHAR(20) nn ='awaiting_payment' | subtotal DECIMAL(14,2) nn | discount DECIMAL(14,2) nn =0 | grand_total DECIMAL(14,2) nn | placed_at DATETIME nn
shipments: id BIGINT pk ai | order_id BIGINT nn fk>orders | seller_id BIGINT nn fk>sellers | courier VARCHAR(20) nn | service VARCHAR(20) | awb_number VARCHAR(40) uq | shipping_fee DECIMAL(12,2) nn | shipped_at DATETIME | delivered_at DATETIME
order_items: id BIGINT pk ai | shipment_id BIGINT nn fk>shipments | variant_id BIGINT nn fk>product_variants | product_name VARCHAR(160) nn #snapshot at checkout | qty SMALLINT nn un | unit_price DECIMAL(12,2) nn
payments: id BIGINT pk ai | order_id BIGINT nn fk>orders | gateway VARCHAR(20) nn ='midtrans' | method VARCHAR(30) | external_id VARCHAR(64) uq | amount DECIMAL(14,2) nn | status VARCHAR(20) nn | paid_at DATETIME | raw_callback JSON
reviews: id BIGINT pk ai | order_item_id BIGINT nn uq fk>order_items | user_id BIGINT nn fk>users | rating TINYINT nn un | body TEXT | created_at TIMESTAMP nn
`},
  {
    title: "Klinik Sehat Bersama - rekam medis", share: 0, ageDays: 96, editedDays: 3,
    description: "Patient records for a 3-doctor clinic: registration queue, visits, diagnoses (ICD-10), prescriptions and BPJS claims.",
    tables: `
patients: id INT pk ai | medical_record_no VARCHAR(12) nn uq | nik CHAR(16) uq #national ID number | full_name VARCHAR(120) nn | birth_date DATE nn | gender CHAR(1) nn | phone VARCHAR(20) | bpjs_number VARCHAR(13) | address TEXT
doctors: id INT pk ai | name VARCHAR(120) nn | sip_number VARCHAR(40) nn uq | specialty VARCHAR(60) | active TINYINT(1) nn =1
schedules: id INT pk ai | doctor_id INT nn fk>doctors | weekday TINYINT nn | start_time TIME nn | end_time TIME nn | quota SMALLINT nn =20
queue_tickets: id BIGINT pk ai | patient_id INT nn fk>patients | schedule_id INT nn fk>schedules | ticket_no VARCHAR(6) nn | visit_date DATE nn | status VARCHAR(12) nn ='waiting'
visits: id BIGINT pk ai | ticket_id BIGINT nn uq fk>queue_tickets | doctor_id INT nn fk>doctors | complaint TEXT | blood_pressure VARCHAR(10) | weight_kg DECIMAL(5,2) | notes TEXT | visited_at DATETIME nn
icd10_codes: code VARCHAR(8) pk | description VARCHAR(255) nn
diagnoses: id BIGINT pk ai | visit_id BIGINT nn fk>visits | icd10_code VARCHAR(8) nn fk>icd10_codes | is_primary TINYINT(1) nn =0
medicines: id INT pk ai | name VARCHAR(120) nn | unit VARCHAR(16) nn | stock INT nn =0 | price DECIMAL(10,2) nn
prescriptions: id BIGINT pk ai | visit_id BIGINT nn fk>visits | medicine_id INT nn fk>medicines | dosage VARCHAR(60) nn #e.g. 3x1 after meals | qty SMALLINT nn
bpjs_claims: id BIGINT pk ai | visit_id BIGINT nn uq fk>visits | sep_number VARCHAR(19) uq | claim_status VARCHAR(16) nn ='draft' | submitted_at DATETIME | amount DECIMAL(12,2)
`},
  {
    title: "LMS kampus - kelas online", share: 2, ageDays: 210, editedDays: 12,
    description: "Learning management system for the informatics faculty. Courses, sections, enrollment, assignments with file submissions, grading rubric.",
    tables: `
users: id INT pk ai | nim_nip VARCHAR(20) nn uq | name VARCHAR(120) nn | email VARCHAR(160) nn uq | role VARCHAR(10) nn #student / lecturer / admin
semesters: id INT pk ai | name VARCHAR(20) nn #e.g. 2024/2025 Ganjil | starts_on DATE nn | ends_on DATE nn
courses: id INT pk ai | code VARCHAR(10) nn uq | title VARCHAR(120) nn | credits TINYINT nn | description TEXT
classes: id INT pk ai | course_id INT nn fk>courses | semester_id INT nn fk>semesters | lecturer_id INT nn fk>users | section CHAR(2) nn | room VARCHAR(20)
enrollments: id INT pk ai | class_id INT nn fk>classes | student_id INT nn fk>users | enrolled_at TIMESTAMP nn | final_grade CHAR(2)
modules: id INT pk ai | class_id INT nn fk>classes | week TINYINT nn | title VARCHAR(160) nn | content TEXT
assignments: id INT pk ai | class_id INT nn fk>classes | title VARCHAR(160) nn | instructions TEXT | due_at DATETIME nn | max_score SMALLINT nn =100
submissions: id INT pk ai | assignment_id INT nn fk>assignments | student_id INT nn fk>users | file_url VARCHAR(255) | submitted_at DATETIME nn | score DECIMAL(5,2) | feedback TEXT
attendance: id BIGINT pk ai | enrollment_id INT nn fk>enrollments | module_id INT nn fk>modules | status CHAR(1) nn ='H' #H hadir, I izin, S sakit, A alpa
`},
  {
    title: "Kos-kosan management", share: 0, ageDays: 150, editedDays: 22,
    description: "Boarding house rentals for my uncle's 3 buildings in Yogyakarta. Rooms, tenants, monthly invoices, electricity token top-ups.",
    tables: `
buildings: id INT pk ai | name VARCHAR(60) nn | address TEXT nn | caretaker_phone VARCHAR(20)
rooms: id INT pk ai | building_id INT nn fk>buildings | room_no VARCHAR(6) nn | floor TINYINT nn | monthly_rate DECIMAL(10,2) nn | has_ac TINYINT(1) nn =0 | status VARCHAR(12) nn ='vacant'
tenants: id INT pk ai | name VARCHAR(120) nn | ktp_number CHAR(16) | phone VARCHAR(20) nn | campus VARCHAR(80) | emergency_contact VARCHAR(120)
leases: id INT pk ai | room_id INT nn fk>rooms | tenant_id INT nn fk>tenants | start_date DATE nn | end_date DATE | deposit DECIMAL(10,2) =0
invoices: id INT pk ai | lease_id INT nn fk>leases | period CHAR(7) nn #YYYY-MM | amount DECIMAL(10,2) nn | due_date DATE nn | paid_at DATETIME | method VARCHAR(16)
electricity_topups: id INT pk ai | room_id INT nn fk>rooms | token_number VARCHAR(24) | kwh DECIMAL(6,2) | amount DECIMAL(10,2) nn | bought_at DATETIME nn
`},
  {
    title: "Inventory gudang - PT Sinar Logam", share: 0, ageDays: 300, editedDays: 64,
    description: "Warehouse stock for a metal parts distributor. Multi-warehouse, bin locations, stock movements (in/out/transfer/adjustment), purchase orders.",
    tables: `
warehouses: id INT pk ai | code VARCHAR(8) nn uq | name VARCHAR(80) nn | city VARCHAR(60)
bins: id INT pk ai | warehouse_id INT nn fk>warehouses | code VARCHAR(12) nn #rack-level-slot e.g. A-03-2
suppliers: id INT pk ai | name VARCHAR(120) nn | npwp VARCHAR(20) | contact_person VARCHAR(80) | phone VARCHAR(20) | payment_terms_days SMALLINT =30
items: id INT pk ai | sku VARCHAR(30) nn uq | name VARCHAR(160) nn | uom VARCHAR(8) nn ='pcs' | min_stock INT =0 | spec TEXT
stock_levels: id BIGINT pk ai | item_id INT nn fk>items | bin_id INT nn fk>bins | qty DECIMAL(12,3) nn =0
purchase_orders: id INT pk ai | supplier_id INT nn fk>suppliers | po_number VARCHAR(20) nn uq | status VARCHAR(12) nn ='draft' | ordered_on DATE | expected_on DATE
po_lines: id INT pk ai | purchase_order_id INT nn fk>purchase_orders | item_id INT nn fk>items | qty DECIMAL(12,3) nn | unit_cost DECIMAL(14,2) nn
stock_movements: id BIGINT pk ai | item_id INT nn fk>items | from_bin_id INT fk>bins | to_bin_id INT fk>bins | qty DECIMAL(12,3) nn | type VARCHAR(12) nn | reference VARCHAR(40) | moved_at DATETIME nn | moved_by VARCHAR(60)
`},
  {
    title: "Laundry kiloan POS", share: 2, ageDays: 75, editedDays: 30,
    description: "Point of sale for a laundry shop: orders by weight, service packages (regular / express 6 jam), pickup & delivery.",
    tables: `
customers: id INT pk ai | name VARCHAR(100) nn | phone VARCHAR(20) nn uq | address TEXT | member_since DATE
services: id INT pk ai | name VARCHAR(60) nn | price_per_kg DECIMAL(8,2) | price_per_item DECIMAL(8,2) | duration_hours SMALLINT nn
laundry_orders: id INT pk ai | customer_id INT nn fk>customers | order_code VARCHAR(12) nn uq | received_at DATETIME nn | ready_at DATETIME | status VARCHAR(12) nn ='received' | total DECIMAL(10,2) | paid TINYINT(1) nn =0
order_lines: id INT pk ai | order_id INT nn fk>laundry_orders | service_id INT nn fk>services | weight_kg DECIMAL(5,2) | items SMALLINT | note VARCHAR(255)
deliveries: id INT pk ai | order_id INT nn fk>laundry_orders | courier_name VARCHAR(60) | scheduled_at DATETIME | delivered_at DATETIME | fee DECIMAL(8,2) =0
`},
  {
    title: "HRIS payroll (draft)", share: 0, ageDays: 128, editedDays: 101,
    description: "Employees, attendance from fingerprint machine, leave requests, monthly payroll with BPJS & PPh21 deductions. Still unsure about the allowance model.",
    tables: `
departments: id INT pk ai | name VARCHAR(80) nn | head_employee_id INT
employees: id INT pk ai | department_id INT nn fk>departments | nik VARCHAR(12) nn uq | full_name VARCHAR(120) nn | job_title VARCHAR(80) | join_date DATE nn | base_salary DECIMAL(14,2) nn | npwp VARCHAR(20) | ptkp_status VARCHAR(4) #TK/0, K/1 ...
attendance_logs: id BIGINT pk ai | employee_id INT nn fk>employees | scanned_at DATETIME nn | device_id VARCHAR(20) | direction CHAR(3) #IN / OUT
leave_requests: id INT pk ai | employee_id INT nn fk>employees | type VARCHAR(16) nn | start_date DATE nn | end_date DATE nn | reason TEXT | status VARCHAR(10) nn ='pending' | approved_by INT
payroll_runs: id INT pk ai | period CHAR(7) nn uq | status VARCHAR(10) nn ='open' | processed_at DATETIME
payslips: id INT pk ai | payroll_run_id INT nn fk>payroll_runs | employee_id INT nn fk>employees | gross DECIMAL(14,2) nn | bpjs_kes DECIMAL(12,2) | bpjs_tk DECIMAL(12,2) | pph21 DECIMAL(12,2) | net DECIMAL(14,2) nn
`},
  {
    title: "Blog + newsletter", share: 2, ageDays: 260, editedDays: 180,
    description: "Personal blog engine. Posts, tags, comments with moderation, newsletter subscribers.",
    tables: `
authors: id INT pk ai | name VARCHAR(80) nn | email VARCHAR(160) nn uq | bio TEXT | avatar_url VARCHAR(255)
posts: id INT pk ai | author_id INT nn fk>authors | title VARCHAR(200) nn | slug VARCHAR(220) nn uq | body_md TEXT nn | status VARCHAR(10) nn ='draft' | published_at DATETIME
tags: id INT pk ai | name VARCHAR(40) nn uq
post_tags: id INT pk ai | post_id INT nn fk>posts | tag_id INT nn fk>tags
comments: id INT pk ai | post_id INT nn fk>posts | parent_id INT fk>comments | name VARCHAR(80) nn | email VARCHAR(160) | body TEXT nn | approved TINYINT(1) nn =0 | created_at TIMESTAMP nn
subscribers: id INT pk ai | email VARCHAR(160) nn uq | confirmed_at DATETIME | unsubscribed_at DATETIME
`},
  {
    title: "Futsal court booking", share: 0, ageDays: 60, editedDays: 58,
    description: "Booking app for 4 futsal courts, hourly slots, DP payment, member discounts.",
    tables: `
courts: id INT pk ai | name VARCHAR(40) nn | surface VARCHAR(20) | price_day DECIMAL(10,2) nn | price_night DECIMAL(10,2) nn
members: id INT pk ai | name VARCHAR(100) nn | phone VARCHAR(20) nn uq | team_name VARCHAR(60) | discount_pct TINYINT =0
bookings: id INT pk ai | court_id INT nn fk>courts | member_id INT fk>members | guest_name VARCHAR(100) | play_date DATE nn | start_hour TINYINT nn | hours TINYINT nn =1 | total DECIMAL(10,2) nn | status VARCHAR(12) nn ='booked'
booking_payments: id INT pk ai | booking_id INT nn fk>bookings | kind VARCHAR(8) nn #dp / lunas | amount DECIMAL(10,2) nn | paid_at DATETIME nn | proof_url VARCHAR(255)
`},
  {
    title: "Koperasi simpan pinjam", share: 0, ageDays: 340, editedDays: 200,
    description: "Savings and loan cooperative: members, mandatory/voluntary savings, loans with installment schedule.",
    tables: `
anggota: id INT pk ai | no_anggota VARCHAR(10) nn uq | nama VARCHAR(120) nn | alamat TEXT | tgl_masuk DATE nn | status VARCHAR(10) nn ='aktif'
simpanan: id BIGINT pk ai | anggota_id INT nn fk>anggota | jenis VARCHAR(10) nn #pokok / wajib / sukarela | jumlah DECIMAL(14,2) nn | tanggal DATE nn
pinjaman: id INT pk ai | anggota_id INT nn fk>anggota | pokok DECIMAL(14,2) nn | bunga_pct DECIMAL(4,2) nn | tenor_bulan SMALLINT nn | tgl_cair DATE | status VARCHAR(10) nn ='pengajuan'
angsuran: id BIGINT pk ai | pinjaman_id INT nn fk>pinjaman | ke SMALLINT nn | jatuh_tempo DATE nn | jumlah DECIMAL(14,2) nn | dibayar_pada DATE | denda DECIMAL(12,2) =0
`},
  {
    title: "Event ticketing", share: 2, ageDays: 180, editedDays: 90,
    description: "Concert & seminar ticketing with seat tiers, QR check-in at the gate.",
    tables: `
organizers: id INT pk ai | name VARCHAR(120) nn | email VARCHAR(160) nn | verified TINYINT(1) nn =0
venues: id INT pk ai | name VARCHAR(120) nn | city VARCHAR(60) nn | capacity INT
events: id INT pk ai | organizer_id INT nn fk>organizers | venue_id INT nn fk>venues | title VARCHAR(200) nn | starts_at DATETIME nn | ends_at DATETIME | poster_url VARCHAR(255) | status VARCHAR(12) nn ='draft'
ticket_tiers: id INT pk ai | event_id INT nn fk>events | name VARCHAR(40) nn #Festival, VIP, Early bird | price DECIMAL(12,2) nn | quota INT nn | sales_end_at DATETIME
ticket_orders: id INT pk ai | buyer_email VARCHAR(160) nn | buyer_name VARCHAR(120) nn | total DECIMAL(12,2) nn | status VARCHAR(12) nn | created_at TIMESTAMP nn
tickets: id BIGINT pk ai | order_id INT nn fk>ticket_orders | tier_id INT nn fk>ticket_tiers | qr_code CHAR(32) nn uq | holder_name VARCHAR(120) | checked_in_at DATETIME
`},
  {
    title: "Perpustakaan sekolah", share: 2, ageDays: 400, editedDays: 380,
    description: "School library: books, copies, borrowing and late fines. Tugas akhir RPL kelas XII.",
    tables: `
books: id INT pk ai | isbn VARCHAR(17) uq | title VARCHAR(200) nn | author VARCHAR(120) | publisher VARCHAR(120) | year SMALLINT
book_copies: id INT pk ai | book_id INT nn fk>books | barcode VARCHAR(20) nn uq | shelf VARCHAR(10) | condition VARCHAR(10) ='good'
students: id INT pk ai | nis VARCHAR(10) nn uq | name VARCHAR(120) nn | class VARCHAR(10)
loans: id INT pk ai | copy_id INT nn fk>book_copies | student_id INT nn fk>students | borrowed_on DATE nn | due_on DATE nn | returned_on DATE | fine DECIMAL(8,2) =0
`},
  {
    title: "Food delivery - restaurant side", share: 0, ageDays: 45, editedDays: 44,
    description: "Restaurant partner dashboard: menus, modifiers, opening hours, incoming orders.",
    tables: `
restaurants: id INT pk ai | name VARCHAR(120) nn | phone VARCHAR(20) | lat DECIMAL(9,6) | lng DECIMAL(9,6) | is_open TINYINT(1) nn =0
opening_hours: id INT pk ai | restaurant_id INT nn fk>restaurants | weekday TINYINT nn | opens TIME nn | closes TIME nn
menu_categories: id INT pk ai | restaurant_id INT nn fk>restaurants | name VARCHAR(60) nn | position SMALLINT =0
menu_items: id INT pk ai | category_id INT nn fk>menu_categories | name VARCHAR(120) nn | price DECIMAL(10,2) nn | photo_url VARCHAR(255) | available TINYINT(1) nn =1
modifier_groups: id INT pk ai | menu_item_id INT nn fk>menu_items | name VARCHAR(60) nn #Level pedas, Topping | min_select TINYINT =0 | max_select TINYINT =1
modifiers: id INT pk ai | group_id INT nn fk>modifier_groups | name VARCHAR(60) nn | extra_price DECIMAL(8,2) =0
`},
  {
    title: "SaaS billing & subscriptions", share: 0, ageDays: 20, editedDays: 6,
    description: "Workspace-based SaaS: plans, subscriptions, seat-based invoices, usage metering, coupons. Modeled after how Stripe Billing objects relate.",
    tables: `
workspaces: id CHAR(26) pk #ULID | name VARCHAR(80) nn | slug VARCHAR(80) nn uq | owner_user_id CHAR(26) nn | created_at TIMESTAMP nn
plans: id VARCHAR(32) pk #e.g. team_monthly | name VARCHAR(60) nn | interval VARCHAR(8) nn | unit_amount INT nn #cents | currency CHAR(3) nn ='USD' | active TINYINT(1) nn =1
subscriptions: id CHAR(26) pk | workspace_id CHAR(26) nn fk>workspaces | plan_id VARCHAR(32) nn fk>plans | seats SMALLINT nn =1 | status VARCHAR(16) nn #trialing active past_due canceled | current_period_end DATETIME nn | cancel_at DATETIME
invoices: id CHAR(26) pk | subscription_id CHAR(26) nn fk>subscriptions | number VARCHAR(20) nn uq | amount_due INT nn | amount_paid INT nn =0 | status VARCHAR(12) nn | issued_at DATETIME nn | paid_at DATETIME
usage_records: id BIGINT pk ai | subscription_id CHAR(26) nn fk>subscriptions | metric VARCHAR(40) nn | quantity INT nn | recorded_at DATETIME nn
`},
  {
    title: "Bengkel motor - servis", share: 0, ageDays: 230, editedDays: 160,
    description: "",
    tables: `
pelanggan: id INT pk ai | nama VARCHAR(100) nn | no_hp VARCHAR(20)
kendaraan: id INT pk ai | pelanggan_id INT nn fk>pelanggan | plat_nomor VARCHAR(12) nn uq | merk VARCHAR(30) | tipe VARCHAR(40) | tahun SMALLINT
servis: id INT pk ai | kendaraan_id INT nn fk>kendaraan | tanggal DATE nn | keluhan TEXT | km INT | mekanik VARCHAR(60) | total DECIMAL(10,2)
servis_detail: id INT pk ai | servis_id INT nn fk>servis | item VARCHAR(120) nn | qty SMALLINT =1 | harga DECIMAL(10,2) nn
`},
  {
    title: "Masjid donation tracker", share: 2, ageDays: 110, editedDays: 108,
    description: "Infaq & zakat records, monthly report for the takmir board.",
    tables: `
donors: id INT pk ai | name VARCHAR(120) | phone VARCHAR(20) | anonymous TINYINT(1) nn =0
programs: id INT pk ai | name VARCHAR(80) nn #Renovasi, Santunan yatim, Operasional | target_amount DECIMAL(14,2)
donations: id INT pk ai | donor_id INT fk>donors | program_id INT nn fk>programs | amount DECIMAL(14,2) nn | channel VARCHAR(12) nn #kotak / transfer / qris | received_on DATE nn | note VARCHAR(255)
expenses: id INT pk ai | program_id INT nn fk>programs | description VARCHAR(255) nn | amount DECIMAL(14,2) nn | spent_on DATE nn | receipt_url VARCHAR(255)
`},
  {
    title: "chat app schema", share: 0, ageDays: 15, editedDays: 15,
    description: "quick sketch before the hackathon",
    tables: `
users: id BIGINT pk ai | username VARCHAR(32) nn uq | display_name VARCHAR(64) | last_seen_at DATETIME
conversations: id BIGINT pk ai | is_group TINYINT(1) nn =0 | title VARCHAR(80) | created_at TIMESTAMP nn
participants: id BIGINT pk ai | conversation_id BIGINT nn fk>conversations | user_id BIGINT nn fk>users | joined_at DATETIME nn | last_read_message_id BIGINT
messages: id BIGINT pk ai | conversation_id BIGINT nn fk>conversations | sender_id BIGINT nn fk>users | body TEXT | attachment_url VARCHAR(255) | sent_at DATETIME nn
`},
  {
    title: "Pasar Kita marketplace v2", share: 0, ageDays: 140, editedDays: 42,
    description: "Old version, single shipment per order. Kept for reference — use v3.",
    tables: `
users: id BIGINT pk ai | email VARCHAR(160) nn uq | password VARCHAR(255) nn | name VARCHAR(120) nn | phone VARCHAR(20)
sellers: id BIGINT pk ai | userId BIGINT nn fk>users | shopName VARCHAR(80) nn | city VARCHAR(80)
products: id BIGINT pk ai | sellerId BIGINT nn fk>sellers | name VARCHAR(160) nn | price DECIMAL(12,2) nn | stock INT nn =0 | category VARCHAR(60)
orders: id BIGINT pk ai | userId BIGINT nn fk>users | status VARCHAR(20) nn | total DECIMAL(14,2) nn | courier VARCHAR(20) | resi VARCHAR(40) | createdAt DATETIME
orderItems: id BIGINT pk ai | orderId BIGINT nn fk>orders | productId BIGINT nn fk>products | qty INT nn | price DECIMAL(12,2) nn
`},
  {
    title: "Fleet GPS tracking", share: 0, ageDays: 33, editedDays: 9,
    description: "Truck fleet: vehicles, drivers, trips, GPS pings every 30s (partitioned by day), fuel logs.",
    tables: `
vehicles: id INT pk ai | plate_number VARCHAR(12) nn uq | model VARCHAR(60) | capacity_kg INT | gps_imei VARCHAR(20) uq
drivers: id INT pk ai | name VARCHAR(120) nn | sim_number VARCHAR(20) nn | phone VARCHAR(20)
trips: id BIGINT pk ai | vehicle_id INT nn fk>vehicles | driver_id INT nn fk>drivers | origin VARCHAR(120) nn | destination VARCHAR(120) nn | departed_at DATETIME | arrived_at DATETIME | status VARCHAR(12) nn ='planned'
gps_pings: id BIGINT pk ai | vehicle_id INT nn fk>vehicles | lat DECIMAL(9,6) nn | lng DECIMAL(9,6) nn | speed_kmh SMALLINT | recorded_at DATETIME nn
fuel_logs: id INT pk ai | vehicle_id INT nn fk>vehicles | trip_id BIGINT fk>trips | liters DECIMAL(6,2) nn | cost DECIMAL(12,2) nn | odometer INT | filled_at DATETIME nn
`},
  {
    title: "Untitled project", share: 0, ageDays: 5, editedDays: 5,
    description: "",
    tables: `
table_1: id INT pk ai | name VARCHAR(255)
`},
  {
    title: "Tugas basis data - normalisasi", share: 2, ageDays: 380, editedDays: 377,
    description: "Normalisasi 3NF studi kasus penjualan toko buku. Praktikum minggu 6.",
    tables: `
pelanggan: kd_pelanggan CHAR(6) pk | nama VARCHAR(60) nn | kota VARCHAR(40)
buku: kd_buku CHAR(6) pk | judul VARCHAR(120) nn | pengarang VARCHAR(80) | harga DECIMAL(10,2) nn
faktur: no_faktur CHAR(8) pk | kd_pelanggan CHAR(6) nn fk>pelanggan | tanggal DATE nn
detail_faktur: id INT pk ai | no_faktur CHAR(8) nn fk>faktur | kd_buku CHAR(6) nn fk>buku | qty SMALLINT nn
`},
  {
    title: "IoT greenhouse sensors", share: 0, ageDays: 88, editedDays: 70,
    description: "ESP32 nodes posting soil moisture / temp / humidity via MQTT, pump actuator rules.",
    tables: `
greenhouses: id INT pk ai | name VARCHAR(60) nn | location VARCHAR(120)
nodes: id INT pk ai | greenhouse_id INT nn fk>greenhouses | device_uid VARCHAR(32) nn uq | firmware VARCHAR(16) | last_seen_at DATETIME
readings: id BIGINT pk ai | node_id INT nn fk>nodes | soil_moisture DECIMAL(5,2) | temperature_c DECIMAL(4,1) | humidity DECIMAL(5,2) | recorded_at DATETIME nn
pump_rules: id INT pk ai | greenhouse_id INT nn fk>greenhouses | min_moisture DECIMAL(5,2) nn | duration_sec SMALLINT nn =30 | enabled TINYINT(1) nn =1
pump_runs: id BIGINT pk ai | rule_id INT fk>pump_rules | node_id INT nn fk>nodes | started_at DATETIME nn | stopped_at DATETIME | triggered_by VARCHAR(10) #rule / manual
`},
  {
    title: "Wedding organizer CRM", share: 0, ageDays: 190, editedDays: 150,
    description: "Clients, packages, vendor bookings (catering, dekor, MUA), payment terms.",
    tables: `
clients: id INT pk ai | bride_name VARCHAR(80) | groom_name VARCHAR(80) | phone VARCHAR(20) nn | wedding_date DATE | venue VARCHAR(120) | guest_estimate SMALLINT
packages: id INT pk ai | name VARCHAR(60) nn | price DECIMAL(14,2) nn | includes TEXT
contracts: id INT pk ai | client_id INT nn fk>clients | package_id INT nn fk>packages | signed_on DATE | total DECIMAL(14,2) nn | status VARCHAR(12) nn ='proposal'
vendors: id INT pk ai | name VARCHAR(120) nn | category VARCHAR(20) nn | phone VARCHAR(20)
vendor_bookings: id INT pk ai | contract_id INT nn fk>contracts | vendor_id INT nn fk>vendors | cost DECIMAL(12,2) | confirmed TINYINT(1) nn =0
installments: id INT pk ai | contract_id INT nn fk>contracts | due_on DATE nn | amount DECIMAL(14,2) nn | paid_on DATE
`},
  {
    title: "URL shortener", share: 2, ageDays: 270, editedDays: 270,
    description: "Side project, Go + Postgres.",
    tables: `
links: id BIGINT pk ai | code VARCHAR(10) nn uq | target_url TEXT nn | owner_email VARCHAR(160) | expires_at DATETIME | created_at TIMESTAMP nn
clicks: id BIGINT pk ai | link_id BIGINT nn fk>links | clicked_at DATETIME nn | referrer VARCHAR(255) | country CHAR(2) | user_agent VARCHAR(255)
`},
  {
    title: "Absensi karyawan QR", share: 0, ageDays: 55, editedDays: 50,
    description: "Attendance via rotating QR shown on the office tablet; geo-fence check.",
    tables: `
offices: id INT pk ai | name VARCHAR(80) nn | lat DECIMAL(9,6) nn | lng DECIMAL(9,6) nn | radius_m SMALLINT nn =100
staff: id INT pk ai | office_id INT nn fk>offices | name VARCHAR(120) nn | email VARCHAR(160) nn uq | shift VARCHAR(10) ='pagi'
qr_sessions: id BIGINT pk ai | office_id INT nn fk>offices | token CHAR(40) nn uq | valid_from DATETIME nn | valid_until DATETIME nn
check_ins: id BIGINT pk ai | staff_id INT nn fk>staff | qr_session_id BIGINT nn fk>qr_sessions | lat DECIMAL(9,6) | lng DECIMAL(9,6) | checked_at DATETIME nn | type CHAR(3) nn
`},
];
