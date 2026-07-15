-- Bootstrap admin support: profile role for X09 Studio owners

alter table public.profiles
  add column if not exists role text not null default 'member';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'member'));

create index if not exists profiles_role_idx
  on public.profiles (role);
