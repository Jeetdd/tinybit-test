-- User-added doctors (for Health Vault quick-share)
create table if not exists user_doctors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  phone      text,
  created_at timestamptz default now()
);

alter table user_doctors enable row level security;

create policy "user_doctors_select" on user_doctors for select using (auth.uid() = user_id);
create policy "user_doctors_insert" on user_doctors for insert with check (auth.uid() = user_id);
create policy "user_doctors_delete" on user_doctors for delete using (auth.uid() = user_id);
