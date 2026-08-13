begin;

-- Replace the unused booked-time category with contact-request notifications.
alter table public.push_notification_preferences
  add column if not exists contact_requests_enabled boolean not null default false;

alter table public.push_notification_preferences
  drop column if exists booked_times_enabled;

-- Subscription endpoints and keys are only readable by their owner.
-- Server-side service-role access bypasses RLS for notification delivery.
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

-- Push preferences are only readable by their owner.
-- Server-side service-role access bypasses RLS for notification delivery.
drop policy if exists push_preferences_select_own on public.push_notification_preferences;
create policy push_preferences_select_own
on public.push_notification_preferences
for select
to authenticated
using (user_id = auth.uid());

-- This SECURITY DEFINER maintenance function must not be callable by clients.
revoke execute on function public.purge_inactive_push_subscriptions(interval) from public;
revoke execute on function public.purge_inactive_push_subscriptions(interval) from anon;
revoke execute on function public.purge_inactive_push_subscriptions(interval) from authenticated;

commit;