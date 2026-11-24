begin;
do $test$
declare
 u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); s2 uuid:=gen_random_uuid(); sv uuid:=gen_random_uuid();
 result jsonb; token text; old_token text; pin text:='934728'; n integer; total integer; blocked boolean:=false;
begin
 insert into auth.users(id,aud,role,email) values(u,'authenticated','authenticated',u::text||'@ift-test.invalid'),(v,'authenticated','authenticated',v::text||'@ift-test.invalid');
 insert into auth.sessions(id,user_id,created_at,updated_at) values(s,u,now(),now()),(s2,u,now(),now()),(sv,v,now(),now());
 insert into public.accounts(user_id,name,type,opening_balance) values(u,'Rollback PIN test','cash',0);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',s,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())-1000)))::text,true);
 perform set_config('request.headers','{}',true);
 if (public.ift_pin_status()->>'enabled')::boolean then raise exception 'Default PIN must be off'; end if;
 if public.ift_pin_configure(pin)->>'error'<>'password_required' then raise exception 'Stale password proof accepted'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',s,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
 result:=public.ift_pin_configure(pin);token:=result->>'token';
 if length(token)<>64 then raise exception 'Missing unlock token'; end if;
 if exists(select 1 from ift_private.pin_settings where user_id=u and pin_hash=pin) then raise exception 'PIN stored in plaintext'; end if;
 if exists(select 1 from ift_private.pin_grants where user_id=u and token_hash=token) then raise exception 'Token stored in plaintext'; end if;
 perform set_config('request.headers',jsonb_build_object('x-ift-unlock',token)::text,true);
 if (public.ift_pin_status()->>'locked')::boolean then raise exception 'Valid token rejected'; end if;
 execute 'set local role authenticated';
 select count(*) into total from public.accounts where user_id=u;
 if total<>1 then raise exception 'Unlocked own account inaccessible'; end if;
 execute 'reset role';
 perform set_config('request.headers','{}',true);
 execute 'set local role authenticated';
 begin
  perform count(*) from public.accounts where user_id=u;
 exception when insufficient_privilege then
  if sqlerrm='IFT_PIN_LOCKED' then blocked:=true;else raise;end if;
 end;
 if not blocked then raise exception 'Locked RLS read was allowed'; end if;
 blocked:=false;
 begin
  insert into public.accounts(user_id,name,type,opening_balance) values(u,'Must fail','cash',0);
 exception when insufficient_privilege then blocked:=true;
 end;
 if not blocked then raise exception 'Locked insert was allowed'; end if;
 execute 'reset role';
 for n in 1..5 loop result:=public.ift_pin_unlock('111111');end loop;
 if result->>'error'<>'rate_limited' then raise exception 'Missing attempt limit';end if;
 if public.ift_pin_unlock(pin)->>'error'<>'rate_limited' then raise exception 'Cooldown bypassed';end if;
 update ift_private.pin_settings set blocked_until=now()-interval '1 second' where user_id=u;
 result:=public.ift_pin_unlock(pin);token:=result->>'token';
 if token is null then raise exception 'Correct PIN cannot unlock after cooldown';end if;
 perform set_config('request.headers',jsonb_build_object('x-ift-unlock',token)::text,true);
 if public.ift_pin_touch()->>'error' is not null then raise exception 'Valid activity renewal rejected';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',s2)::text,true);
 if not (public.ift_pin_status()->>'locked')::boolean then raise exception 'Cross-session token accepted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v,'role','authenticated','session_id',sv,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
 result:=public.ift_pin_configure('827364');
 perform set_config('request.headers',jsonb_build_object('x-ift-unlock',token)::text,true);
 if not (public.ift_pin_status()->>'locked')::boolean then raise exception 'Cross-user token accepted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',s,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))))::text,true);
 update ift_private.pin_grants set expires_at=now()-interval '1 second' where user_id=u;
 if public.ift_pin_touch()->>'error'<>'locked' then raise exception 'Expired token renewed';end if;
 result:=public.ift_pin_unlock(pin);token:=result->>'token';
 perform set_config('request.headers',jsonb_build_object('x-ift-unlock',token)::text,true);
 old_token:=token;result:=public.ift_pin_unlock(pin);token:=result->>'token';
 perform public.ift_pin_lock_grant(old_token);
 perform set_config('request.headers',jsonb_build_object('x-ift-unlock',token)::text,true);
 if (public.ift_pin_status()->>'locked')::boolean then raise exception 'Retiring grant revoked a newer unlock';end if;
 perform public.ift_pin_lock();
 if not (public.ift_pin_status()->>'locked')::boolean then raise exception 'Manual lock failed';end if;
 result:=public.ift_pin_configure(null);
 if (result->>'enabled')::boolean then raise exception 'Password recovery cannot disable PIN';end if;
 if not ift_private.pin_access() then raise exception 'Disabled PIN blocks owner';end if;
end $test$;
rollback;