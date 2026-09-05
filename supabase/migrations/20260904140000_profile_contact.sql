-- Contact + avatar metadata for "Meu perfil"
alter table public.profiles
  add column if not exists phone text,
  add column if not exists company text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text not null default 'BR',
  add column if not exists avatar_ext text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_avatar_ext_check;
alter table public.profiles
  add constraint profiles_avatar_ext_check
  check (avatar_ext is null or avatar_ext in ('png', 'jpg', 'webp'));

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();
