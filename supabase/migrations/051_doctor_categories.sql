-- Shared doctor specialization categories with crowd-sourced suggestions

create table if not exists doctor_categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  created_by  uuid        references auth.users(id) on delete set null,
  usage_count int         not null default 1,
  created_at  timestamptz default now(),
  constraint  doctor_categories_name_unique unique (lower(name))
);

alter table doctor_categories enable row level security;

create policy "categories_read" on doctor_categories
  for select to authenticated using (true);

create policy "categories_insert" on doctor_categories
  for insert to authenticated with check (auth.uid() = created_by);

create policy "categories_update" on doctor_categories
  for update to authenticated using (true) with check (true);

-- Common pre-seeded categories (created_by null = system)
insert into doctor_categories (name, usage_count) values
  ('General Physician', 100),
  ('Cardiologist', 80),
  ('Orthopedic', 75),
  ('Neurologist', 70),
  ('Diabetologist', 68),
  ('Ophthalmologist', 65),
  ('Dentist', 90),
  ('Physiotherapist', 60),
  ('Pulmonologist', 55),
  ('Gastroenterologist', 50),
  ('Urologist', 45),
  ('Dermatologist', 62),
  ('Psychiatrist', 40),
  ('ENT Specialist', 58),
  ('Oncologist', 35),
  ('Rheumatologist', 30),
  ('Endocrinologist', 42),
  ('Nephrologist', 28),
  ('Geriatrician', 38),
  ('Hematologist', 22)
on conflict do nothing;
