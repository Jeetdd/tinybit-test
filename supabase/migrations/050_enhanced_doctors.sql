-- Enhanced user_doctors: add country_code, specialization, allow guardian access

-- Drop old single-user policies
drop policy if exists "user_doctors_select" on user_doctors;
drop policy if exists "user_doctors_insert" on user_doctors;
drop policy if exists "user_doctors_delete" on user_doctors;

-- Add new columns
alter table user_doctors
  add column if not exists country_code  text        not null default '+91',
  add column if not exists specialization text,
  add column if not exists updated_at    timestamptz default now();

-- Owner: full access
create policy "owner_doctors_select" on user_doctors
  for select using (auth.uid() = user_id);

create policy "owner_doctors_insert" on user_doctors
  for insert with check (auth.uid() = user_id);

create policy "owner_doctors_update" on user_doctors
  for update using (auth.uid() = user_id);

create policy "owner_doctors_delete" on user_doctors
  for delete using (auth.uid() = user_id);

-- Guardian: access doctors of a connected elder
create policy "guardian_doctors_select" on user_doctors
  for select using (
    exists (
      select 1 from guardian_elder_links
      where guardian_id = auth.uid()
        and elder_id    = user_doctors.user_id
        and status      = 'connected'
    )
  );

create policy "guardian_doctors_insert" on user_doctors
  for insert with check (
    exists (
      select 1 from guardian_elder_links
      where guardian_id = auth.uid()
        and elder_id    = user_doctors.user_id
        and status      = 'connected'
    )
  );

create policy "guardian_doctors_delete" on user_doctors
  for delete using (
    exists (
      select 1 from guardian_elder_links
      where guardian_id = auth.uid()
        and elder_id    = user_doctors.user_id
        and status      = 'connected'
    )
  );
