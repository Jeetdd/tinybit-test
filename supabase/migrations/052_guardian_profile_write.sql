-- Allow a connected guardian to update a linked elder's profile fields

create policy "guardian_update_elder_profile" on profiles
  for update
  using (
    exists (
      select 1 from guardian_elder_links
      where guardian_id = auth.uid()
        and elder_id    = profiles.id
        and status      = 'connected'
    )
  )
  with check (
    exists (
      select 1 from guardian_elder_links
      where guardian_id = auth.uid()
        and elder_id    = profiles.id
        and status      = 'connected'
    )
  );
