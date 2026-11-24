create schema if not exists ift_private;
revoke all on schema ift_private from public, anon, authenticated;
grant usage on schema ift_private to authenticated;

create table if not exists ift_private.pin_settings(
 user_id uuid primary key references auth.users(id) on delete cascade,
 pin_hash text not null,
 failures integer not null default 0 check(failures between 0 and 5),
 blocked_until timestamptz
);
create table if not exists ift_private.pin_grants(
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 token_hash text not null,
 expires_at timestamptz not null,
 primary key(user_id,session_id)
);
alter table ift_private.pin_settings enable row level security;
alter table ift_private.pin_grants enable row level security;
revoke all on ift_private.pin_settings,ift_private.pin_grants from public,anon,authenticated;

create or replace function ift_private.pin_access()
returns boolean language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); s uuid:=nullif(auth.jwt()->>'session_id','')::uuid; t text;
begin
 if u is null then return false; end if;
 if not exists(select 1 from ift_private.pin_settings where user_id=u) then return true; end if;
 t:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-ift-unlock','');
 if length(t)=64 and exists(
  select 1 from ift_private.pin_grants g join auth.sessions a on a.id=g.session_id
  where g.user_id=u and g.session_id=s and a.user_id=u
   and (a.not_after is null or a.not_after>now())
   and g.token_hash=encode(extensions.digest(t,'sha256'),'hex') and g.expires_at>now()
 ) then return true; end if;
 raise exception 'IFT_PIN_LOCKED' using errcode='42501';
end $$;
revoke all on function ift_private.pin_access() from public,anon;
grant execute on function ift_private.pin_access() to authenticated;

create or replace function ift_private.pin_action(p_action text,p_pin text default null,p_new_pin text default null)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); s uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
 cfg ift_private.pin_settings%rowtype; has_pin boolean;
 token text; grant_until timestamptz; new_token text; n integer;
 recent_password boolean;
begin
 if u is null or s is null or not exists(select 1 from auth.sessions where id=s and user_id=u and (not_after is null or not_after>now())) then
  raise exception 'Sign in again to use app lock.' using errcode='42501';
 end if;
 if p_action not in ('status','unlock','configure','touch','lock') then raise exception 'Invalid PIN action'; end if;
 if p_action in ('unlock','configure') then perform pg_advisory_xact_lock(hashtextextended(u::text,0)); end if;
 select * into cfg from ift_private.pin_settings where user_id=u; has_pin:=found;
 token:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-ift-unlock','');
 select expires_at into grant_until from ift_private.pin_grants
  where user_id=u and session_id=s and length(token)=64
   and token_hash=encode(extensions.digest(token,'sha256'),'hex') and expires_at>now();
 select exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a
  where a->>'method'='password' and (a->>'timestamp')::numeric between extract(epoch from now())-300 and extract(epoch from now())+30) into recent_password;
 if p_action='status' then
  return jsonb_build_object('enabled',has_pin,'locked',has_pin and grant_until is null,'expires_at',grant_until,'reset_allowed',recent_password,'server_time',now());
 end if;
 if p_action='lock' then
  delete from ift_private.pin_grants where user_id=u and session_id=s and (p_pin is null or token_hash=encode(extensions.digest(p_pin,'sha256'),'hex'));
  return jsonb_build_object('enabled',has_pin,'locked',has_pin);
 end if;
 if p_action='configure' then
  if not recent_password then return jsonb_build_object('error','password_required'); end if;
  if p_new_pin is not null and p_new_pin!~'^[0-9]{6}$' then return jsonb_build_object('error','six_digits_required'); end if;
  delete from ift_private.pin_grants where user_id=u;
  if p_new_pin is null then
   delete from ift_private.pin_settings where user_id=u;
   return jsonb_build_object('enabled',false,'locked',false);
  end if;
  insert into ift_private.pin_settings(user_id,pin_hash,failures,blocked_until)
   values(u,extensions.crypt(p_new_pin,extensions.gen_salt('bf',12)),0,null)
   on conflict(user_id) do update set pin_hash=excluded.pin_hash,failures=0,blocked_until=null;
 elsif not has_pin then return jsonb_build_object('enabled',false,'locked',false);
 elsif p_action='touch' then
  if grant_until is null then return jsonb_build_object('error','locked'); end if;
  grant_until:=now()+interval '15 minutes';
  update ift_private.pin_grants set expires_at=grant_until where user_id=u and session_id=s;
  return jsonb_build_object('enabled',true,'locked',false,'expires_at',grant_until);
 elsif p_action='unlock' then
  if cfg.blocked_until>now() then
   return jsonb_build_object('error','rate_limited','retry_after',ceil(extract(epoch from cfg.blocked_until-now()))::integer);
  end if;
  if p_pin is null or p_pin!~'^[0-9]{6}$' or extensions.crypt(p_pin,cfg.pin_hash)<>cfg.pin_hash then
   n:=case when cfg.blocked_until is not null then 1 else cfg.failures+1 end;
   update ift_private.pin_settings set failures=least(n,5),
    blocked_until=case when n>=5 then now()+interval '5 minutes' else null end where user_id=u;
   return jsonb_build_object('error',case when n>=5 then 'rate_limited' else 'invalid_pin' end,
    'attempts_left',greatest(5-n,0),'retry_after',case when n>=5 then 300 else 0 end);
  end if;
  update ift_private.pin_settings set failures=0,blocked_until=null where user_id=u;
 end if;
 new_token:=encode(extensions.gen_random_bytes(32),'hex'); grant_until:=now()+interval '15 minutes';
 delete from ift_private.pin_grants where user_id=u and expires_at<=now();
 insert into ift_private.pin_grants(user_id,session_id,token_hash,expires_at)
  values(u,s,encode(extensions.digest(new_token,'sha256'),'hex'),grant_until)
  on conflict(user_id,session_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
 return jsonb_build_object('enabled',true,'locked',false,'token',new_token,'expires_at',grant_until);
end $$;
revoke all on function ift_private.pin_action(text,text,text) from public,anon;
grant execute on function ift_private.pin_action(text,text,text) to authenticated;

create or replace function public.ift_pin_status() returns jsonb language sql volatile security invoker set search_path='' as $$select ift_private.pin_action('status')$$;
create or replace function public.ift_pin_unlock(p_pin text) returns jsonb language sql volatile security invoker set search_path='' as $$select ift_private.pin_action('unlock',p_pin)$$;
create or replace function public.ift_pin_configure(p_new_pin text) returns jsonb language sql volatile security invoker set search_path='' as $$select ift_private.pin_action('configure',null,p_new_pin)$$;
create or replace function public.ift_pin_touch() returns jsonb language sql volatile security invoker set search_path='' as $$select ift_private.pin_action('touch')$$;
create or replace function public.ift_pin_lock() returns jsonb language sql volatile security invoker set search_path='' as $$select ift_private.pin_action('lock')$$;
revoke all on function public.ift_pin_status(),public.ift_pin_unlock(text),public.ift_pin_configure(text),public.ift_pin_touch(),public.ift_pin_lock() from public,anon;
grant execute on function public.ift_pin_status(),public.ift_pin_unlock(text),public.ift_pin_configure(text),public.ift_pin_touch(),public.ift_pin_lock() to authenticated;

create policy "PIN unlocked accounts" on public.accounts as restrictive for all to authenticated
 using((select ift_private.pin_access())) with check((select ift_private.pin_access()));
create policy "PIN unlocked transactions" on public.transactions as restrictive for all to authenticated
 using((select ift_private.pin_access())) with check((select ift_private.pin_access()));
notify pgrst,'reload schema';

create or replace function public.ift_pin_lock_grant(p_token text) returns jsonb language sql volatile security invoker set search_path='' as $$select ift_private.pin_action('lock',p_token)$$;
revoke all on function public.ift_pin_lock_grant(text) from public,anon;
grant execute on function public.ift_pin_lock_grant(text) to authenticated;
create policy "No direct PIN settings access" on ift_private.pin_settings for all to authenticated using(false) with check(false);
create policy "No direct PIN grant access" on ift_private.pin_grants for all to authenticated using(false) with check(false);
notify pgrst,'reload schema';
