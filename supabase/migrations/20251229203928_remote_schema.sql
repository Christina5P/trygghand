create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create schema if not exists "valuations";

create type "public"."app_role" as enum ('admin', 'moderator', 'user');

create type "public"."contact_status" as enum ('new', 'in_progress', 'completed', 'cancelled');

create type "valuations"."analysis_result" as enum ('text');

create type "valuations"."created_at" as enum ('timestamptz, default now()');

create type "valuations"."id" as enum ('int8, primary key, auto-incrementing');

create type "valuations"."image_urls" as enum ('jsonb');

drop policy "cases_own" on "public"."cases";

drop policy "contact_requests_insert_anon" on "public"."contact_requests";

drop policy "customers_own_profile" on "public"."customers";

drop policy "customers_update_own" on "public"."customers";

drop policy "subscriptions_admin_all" on "public"."subscriptions";

drop policy "valuations_admin_all" on "public"."valuations";

drop policy "valuations_own" on "public"."valuations";

drop policy "archived_customers_admin_all" on "public"."archived_customers";

drop policy "cancellation_comments_admin_all" on "public"."cancellation_comments";

drop policy "cases_admin_all" on "public"."cases";

drop policy "customers_admin_all" on "public"."customers";

drop policy "deleted_users_log_admin_all" on "public"."deleted_users_log";

drop policy "subscription_cancellations_admin_all" on "public"."subscription_cancellations";

drop policy "user_roles_admin_all" on "public"."user_roles";

revoke delete on table "public"."valuations" from "anon";

revoke insert on table "public"."valuations" from "anon";

revoke references on table "public"."valuations" from "anon";

revoke select on table "public"."valuations" from "anon";

revoke trigger on table "public"."valuations" from "anon";

revoke truncate on table "public"."valuations" from "anon";

revoke update on table "public"."valuations" from "anon";

revoke delete on table "public"."valuations" from "authenticated";

revoke insert on table "public"."valuations" from "authenticated";

revoke references on table "public"."valuations" from "authenticated";

revoke select on table "public"."valuations" from "authenticated";

revoke trigger on table "public"."valuations" from "authenticated";

revoke truncate on table "public"."valuations" from "authenticated";

revoke update on table "public"."valuations" from "authenticated";

revoke delete on table "public"."valuations" from "service_role";

revoke insert on table "public"."valuations" from "service_role";

revoke references on table "public"."valuations" from "service_role";

revoke select on table "public"."valuations" from "service_role";

revoke trigger on table "public"."valuations" from "service_role";

revoke truncate on table "public"."valuations" from "service_role";

revoke update on table "public"."valuations" from "service_role";

alter table "public"."contact_requests" drop constraint "contact_requests_customer_id_fkey";

alter table "public"."subscription_cancellations" drop constraint "subscription_cancellations_status_check";

alter table "public"."subscription_cancellations" drop constraint "subscription_cancellations_subscription_id_fkey";

alter table "public"."valuations" drop constraint "valuations_customer_id_fkey";

alter table "public"."cancellation_comments" drop constraint "cancellation_comments_user_id_fkey";

alter table "public"."cases" drop constraint "cases_customer_id_fkey";

drop function if exists "public"."convert_contact_to_customer"(p_contact_id uuid, p_admin_id uuid);

alter table "public"."valuations" drop constraint "valuations_pkey";

alter table "public"."user_roles" drop constraint "user_roles_pkey";

drop index if exists "public"."idx_valuations_customer_id";

drop index if exists "public"."valuations_pkey";

drop index if exists "public"."user_roles_pkey";

drop table "public"."valuations";


  create table "public"."audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "table_name" text not null,
    "record_id" uuid,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_log" enable row level security;


  create table "public"."case_comments" (
    "id" uuid not null default gen_random_uuid(),
    "case_id" uuid,
    "author_id" uuid,
    "author_type" text not null,
    "content" text not null,
    "created_at" timestamp with time zone default now(),
    "customer_id" uuid
      );


alter table "public"."case_comments" enable row level security;


  create table "public"."contacts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text not null,
    "phone" text,
    "message" text not null,
    "status" public.contact_status default 'new'::public.contact_status,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."contacts" enable row level security;


  create table "public"."customer_comments" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid,
    "comment" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."customer_comments" enable row level security;


  create table "public"."fullmakter" (
    "id" uuid not null default gen_random_uuid(),
    "fullmaktstyp" text,
    "befogenheter" text,
    "fullmaktsgivare" uuid not null,
    "fullmakthavare" uuid not null,
    "giltig_from" date,
    "giltig_tom" date,
    "begransningar" text,
    "status" text default 'aktiv'::text,
    "signeringsmetod" text,
    "dokument_url" text,
    "kommentar" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "file_name" text
      );


alter table "public"."fullmakter" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."service_types" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "base_price" numeric(10,2),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."service_types" enable row level security;


  create table "public"."storage_items" (
    "id" uuid not null default gen_random_uuid(),
    "case_id" uuid,
    "item_name" text not null,
    "description" text,
    "quantity" integer default 1,
    "storage_location" text,
    "status" text default 'stored'::text,
    "stored_date" timestamp with time zone default now(),
    "retrieved_date" timestamp with time zone,
    "monthly_cost" numeric(10,2),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."storage_items" enable row level security;


  create table "public"."todos" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "title" text not null,
    "completed" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."todos" enable row level security;


  create table "public"."valuations_backup" (
    "id" uuid,
    "customer_id" uuid,
    "analysis" text,
    "image_urls" text[],
    "created_at" timestamp with time zone,
    "analysis_result" text
      );


alter table "public"."valuations_backup" enable row level security;


  create table "valuations"."valuations" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "image_urls" jsonb,
    "analysis" text,
    "customer_id" uuid
      );


alter table "valuations"."valuations" enable row level security;

alter table "public"."archived_customers" add column "created_at" timestamp with time zone default now();

alter table "public"."archived_customers" alter column "email" set not null;

alter table "public"."archived_customers" alter column "name" set not null;

alter table "public"."cancellation_comments" alter column "user_id" set not null;

alter table "public"."cases" add column "address" text;

alter table "public"."cases" add column "completion_date" timestamp with time zone;

alter table "public"."cases" add column "notes" text;

alter table "public"."cases" add column "owner_id" uuid;

alter table "public"."cases" add column "priority" text default 'medium'::text;

alter table "public"."cases" add column "scheduled_date" timestamp with time zone;

alter table "public"."cases" add column "service_type_id" uuid;

alter table "public"."cases" add column "total_price" numeric(10,2);

alter table "public"."cases" alter column "customer_id" set not null;

alter table "public"."cases" alter column "status" set default 'pending'::text;

alter table "public"."cases" alter column "title" set not null;

alter table "public"."contact_requests" drop column "converted_to_customer";

alter table "public"."contact_requests" drop column "customer_id";

alter table "public"."contact_requests" add column "admin_notes" text;

alter table "public"."contact_requests" add column "ip_address" text;

alter table "public"."contact_requests" add column "name" text;

alter table "public"."contact_requests" add column "request_id" text;

alter table "public"."contact_requests" add column "service_interest" text;

alter table "public"."contact_requests" add column "user_agent" text;

alter table "public"."contact_requests" alter column "email" drop not null;

alter table "public"."contact_requests" alter column "firstname" drop not null;

alter table "public"."contact_requests" alter column "message" set not null;

alter table "public"."contact_requests" alter column "phone" drop not null;

alter table "public"."customers" add column "customer_number" bigint generated by default as identity not null;

alter table "public"."customers" add column "personal_number" text;

alter table "public"."customers" add column "user_id" uuid;

alter table "public"."customers" alter column "id" set default gen_random_uuid();

alter table "public"."customers" alter column "is_customer" set default false;

alter table "public"."deleted_users_log" drop column "deletion_reason";

alter table "public"."deleted_users_log" drop column "user_email";

alter table "public"."deleted_users_log" add column "email" text;

alter table "public"."deleted_users_log" add column "reason" text;

alter table "public"."subscription_cancellations" add column "attachment_url" text;

alter table "public"."subscription_cancellations" add column "binding_end_date" date;

alter table "public"."subscription_cancellations" add column "cancellation_requested_date" date;

alter table "public"."subscription_cancellations" add column "cancellation_sent_date" date;

alter table "public"."subscription_cancellations" add column "custom_description" text;

alter table "public"."subscription_cancellations" add column "external_subscription_id" text;

alter table "public"."subscription_cancellations" add column "last_billed_date" date;

alter table "public"."subscription_cancellations" add column "power_of_attorney_url" text;

alter table "public"."subscription_cancellations" add column "provider_response" text;

alter table "public"."subscription_cancellations" add column "start_date" date;

alter table "public"."subscription_cancellations" alter column "documents" set default '[]'::jsonb;

alter table "public"."subscription_cancellations" alter column "documents" set data type jsonb using "documents"::jsonb;

alter table "public"."subscription_cancellations" alter column "provider" set not null;

alter table "public"."subscription_cancellations" alter column "service_type" set not null;

alter table "public"."subscription_cancellations" alter column "status" set not null;

alter table "public"."subscriptions" drop column "description";

alter table "public"."user_roles" add column "created_at" timestamp with time zone default now();

alter table "public"."user_roles" add column "id" uuid not null default gen_random_uuid();

alter table "public"."user_roles" alter column "role" set data type public.app_role using "role"::public.app_role;

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);

CREATE UNIQUE INDEX case_comments_pkey ON public.case_comments USING btree (id);

CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id);

CREATE UNIQUE INDEX customer_comments_pkey ON public.customer_comments USING btree (id);

CREATE UNIQUE INDEX fullmakter_pkey ON public.fullmakter USING btree (id);

CREATE INDEX idx_archived_customers_archived_at ON public.archived_customers USING btree (archived_at);

CREATE INDEX idx_archived_customers_archived_by ON public.archived_customers USING btree (archived_by);

CREATE INDEX idx_cancel_customer ON public.subscription_cancellations USING btree (customer_id);

CREATE INDEX idx_cancel_provider ON public.subscription_cancellations USING btree (provider);

CREATE INDEX idx_cancel_status ON public.subscription_cancellations USING btree (status);

CREATE INDEX idx_case_comments_case_id ON public.case_comments USING btree (case_id);

CREATE INDEX idx_case_comments_created_at ON public.case_comments USING btree (created_at DESC);

CREATE INDEX idx_cases_created_at ON public.cases USING btree (created_at DESC);

CREATE INDEX idx_cases_status ON public.cases USING btree (status);

CREATE INDEX idx_comments_cancellation ON public.cancellation_comments USING btree (cancellation_id);

CREATE INDEX idx_contact_requests_created_at ON public.contact_requests USING btree (created_at);

CREATE INDEX idx_contact_requests_request_id ON public.contact_requests USING btree (request_id);

CREATE INDEX idx_customers_is_customer ON public.customers USING btree (is_customer);

CREATE INDEX idx_customers_user_id ON public.customers USING btree (user_id);

CREATE INDEX idx_deleted_users_log_user_id ON public.deleted_users_log USING btree (user_id);

CREATE INDEX idx_fullmakter_fullmakthavare ON public.fullmakter USING btree (fullmakthavare);

CREATE INDEX idx_fullmakter_fullmaktsgivare ON public.fullmakter USING btree (fullmaktsgivare);

CREATE INDEX idx_subscription_cancellations_status ON public.subscription_cancellations USING btree (status);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX service_types_pkey ON public.service_types USING btree (id);

CREATE UNIQUE INDEX storage_items_pkey ON public.storage_items USING btree (id);

CREATE UNIQUE INDEX todos_pkey ON public.todos USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);

CREATE UNIQUE INDEX valuations_pkey ON valuations.valuations USING btree (id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

alter table "public"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY using index "audit_log_pkey";

alter table "public"."case_comments" add constraint "case_comments_pkey" PRIMARY KEY using index "case_comments_pkey";

alter table "public"."contacts" add constraint "contacts_pkey" PRIMARY KEY using index "contacts_pkey";

alter table "public"."customer_comments" add constraint "customer_comments_pkey" PRIMARY KEY using index "customer_comments_pkey";

alter table "public"."fullmakter" add constraint "fullmakter_pkey" PRIMARY KEY using index "fullmakter_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."service_types" add constraint "service_types_pkey" PRIMARY KEY using index "service_types_pkey";

alter table "public"."storage_items" add constraint "storage_items_pkey" PRIMARY KEY using index "storage_items_pkey";

alter table "public"."todos" add constraint "todos_pkey" PRIMARY KEY using index "todos_pkey";

alter table "valuations"."valuations" add constraint "valuations_pkey" PRIMARY KEY using index "valuations_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."archived_customers" add constraint "archived_customers_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES auth.users(id) not valid;

alter table "public"."archived_customers" validate constraint "archived_customers_archived_by_fkey";

alter table "public"."case_comments" add constraint "case_comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."case_comments" validate constraint "case_comments_author_id_fkey";

alter table "public"."case_comments" add constraint "case_comments_author_type_check" CHECK ((author_type = ANY (ARRAY['customer'::text, 'admin'::text]))) not valid;

alter table "public"."case_comments" validate constraint "case_comments_author_type_check";

alter table "public"."case_comments" add constraint "case_comments_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE not valid;

alter table "public"."case_comments" validate constraint "case_comments_case_id_fkey";

alter table "public"."case_comments" add constraint "case_comments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."case_comments" validate constraint "case_comments_customer_id_fkey";

alter table "public"."cases" add constraint "cases_service_type_id_fkey" FOREIGN KEY (service_type_id) REFERENCES public.service_types(id) not valid;

alter table "public"."cases" validate constraint "cases_service_type_id_fkey";

alter table "public"."cases" add constraint "cases_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."cases" validate constraint "cases_status_check";

alter table "public"."contact_requests" add constraint "contact_requests_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'closed'::text]))) not valid;

alter table "public"."contact_requests" validate constraint "contact_requests_status_check";

alter table "public"."customer_comments" add constraint "customer_comments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."customer_comments" validate constraint "customer_comments_customer_id_fkey";

alter table "public"."customers" add constraint "customers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."customers" validate constraint "customers_user_id_fkey";

alter table "public"."fullmakter" add constraint "fullmakter_fullmakthavare_fkey" FOREIGN KEY (fullmakthavare) REFERENCES auth.users(id) not valid;

alter table "public"."fullmakter" validate constraint "fullmakter_fullmakthavare_fkey";

alter table "public"."fullmakter" add constraint "fullmakter_fullmaktsgivare_fkey" FOREIGN KEY (fullmaktsgivare) REFERENCES auth.users(id) not valid;

alter table "public"."fullmakter" validate constraint "fullmakter_fullmaktsgivare_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."storage_items" add constraint "storage_items_case_id_fkey" FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE not valid;

alter table "public"."storage_items" validate constraint "storage_items_case_id_fkey";

alter table "public"."storage_items" add constraint "storage_items_status_check" CHECK ((status = ANY (ARRAY['stored'::text, 'retrieved'::text, 'disposed'::text]))) not valid;

alter table "public"."storage_items" validate constraint "storage_items_status_check";

alter table "public"."todos" add constraint "todos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."todos" validate constraint "todos_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE using index "user_roles_user_id_role_key";

alter table "public"."cancellation_comments" add constraint "cancellation_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."cancellation_comments" validate constraint "cancellation_comments_user_id_fkey";

alter table "public"."cases" add constraint "cases_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."cases" validate constraint "cases_customer_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_is_admin(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT false;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.customers WHERE id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.insert_contact_request(p_firstname text, p_lastname text, p_email text, p_phone text, p_message text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  INSERT INTO contact_requests (firstname, lastname, email, phone, message, created_at, updated_at)
  VALUES (
    trim(p_firstname),
    trim(p_lastname),
    lower(trim(p_email)),
    trim(p_phone),
    trim(p_message),
    NOW(),
    NOW()
  )
  RETURNING json_build_object('id', id, 'created_at', created_at) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_contact_request(p_firstname text, p_lastname text, p_email text, p_phone text, p_message text, p_consent boolean, p_consent_at timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  IF p_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'Consent is required';
  END IF;

  IF length(trim(p_firstname)) = 0 OR length(trim(p_phone)) = 0 THEN
    RAISE EXCEPTION 'Required fields missing';
  END IF;

  INSERT INTO contact_requests (
    firstname,
    lastname,
    email,
    phone,
    message,
    consent,
    consent_at,
    created_at,
    updated_at
  )
  VALUES (
    left(trim(p_firstname), 200),
    left(trim(p_lastname), 200),
    left(lower(trim(p_email)), 320),
    left(trim(p_phone), 50),
    left(trim(p_message), 2000),
    TRUE,
    p_consent_at,
    NOW(),
    NOW()
  )
  RETURNING json_build_object(
    'id', id,
    'created_at', created_at
  ) INTO result;

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_contact_request(p_firstname text, p_lastname text, p_email text, p_phone text, p_message text, p_service_interest text, p_request_id text, p_ip text, p_user_agent text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  contact_id UUID;
BEGIN
  -- Validera endast obligatoriska fält
  IF p_firstname IS NULL OR trim(p_firstname) = '' THEN
    RAISE EXCEPTION 'Förnamn är obligatoriskt';
  END IF;
  
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'Telefon är obligatoriskt';
  END IF;
  
  -- Insert med alla fält (optionella kan vara NULL)
  INSERT INTO contact_requests (
    firstname, 
    lastname, 
    email, 
    phone, 
    message,
    service_interest,
    created_at, 
    updated_at,
    request_id,
    ip_address,
    user_agent
  ) VALUES (
    trim(substring(p_firstname, 1, 200)),
    CASE WHEN p_lastname IS NOT NULL THEN trim(substring(p_lastname, 1, 200)) ELSE NULL END,
    p_email, -- Kan vara NULL
    trim(substring(p_phone, 1, 50)),
    p_message, -- Kan vara NULL
    CASE WHEN p_service_interest IS NOT NULL THEN trim(substring(p_service_interest, 1, 200)) ELSE NULL END,
    NOW(),
    NOW(),
    p_request_id,
    p_ip,
    substring(p_user_agent, 1, 500)
  )
  RETURNING id INTO contact_id;
  
  RETURN json_build_object(
    'id', contact_id, 
    'created_at', NOW(),
    'request_id', p_request_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin'::app_role);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_customer(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT false;
$function$
;

CREATE OR REPLACE FUNCTION public.is_authenticated()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event(_action text, _entity text, _entity_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (action, entity, entity_id, performed_by)
  VALUES (_action, _entity, _entity_id, auth.uid());
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_action text, p_table text, p_record_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    metadata
  )
  VALUES (
    auth.uid(),
    p_action,
    p_table,
    p_record_id,
    p_metadata
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.purge_old_contact_requests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM contact_requests
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;$function$
;

create or replace view "public"."valuations" as  SELECT id,
    customer_id,
    analysis,
    image_urls,
    created_at
   FROM valuations.valuations
  WHERE ((customer_id = auth.uid()) OR (( SELECT COALESCE(customers.is_admin, false) AS "coalesce"
           FROM public.customers
          WHERE (customers.id = auth.uid())) = true) OR (customer_id IS NULL));


CREATE OR REPLACE FUNCTION public.is_admin(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'admin'
  );
$function$
;

grant delete on table "public"."audit_log" to "anon";

grant insert on table "public"."audit_log" to "anon";

grant references on table "public"."audit_log" to "anon";

grant select on table "public"."audit_log" to "anon";

grant trigger on table "public"."audit_log" to "anon";

grant truncate on table "public"."audit_log" to "anon";

grant update on table "public"."audit_log" to "anon";

grant delete on table "public"."audit_log" to "authenticated";

grant insert on table "public"."audit_log" to "authenticated";

grant references on table "public"."audit_log" to "authenticated";

grant select on table "public"."audit_log" to "authenticated";

grant trigger on table "public"."audit_log" to "authenticated";

grant truncate on table "public"."audit_log" to "authenticated";

grant update on table "public"."audit_log" to "authenticated";

grant delete on table "public"."audit_log" to "service_role";

grant insert on table "public"."audit_log" to "service_role";

grant references on table "public"."audit_log" to "service_role";

grant select on table "public"."audit_log" to "service_role";

grant trigger on table "public"."audit_log" to "service_role";

grant truncate on table "public"."audit_log" to "service_role";

grant update on table "public"."audit_log" to "service_role";

grant delete on table "public"."case_comments" to "anon";

grant insert on table "public"."case_comments" to "anon";

grant references on table "public"."case_comments" to "anon";

grant select on table "public"."case_comments" to "anon";

grant trigger on table "public"."case_comments" to "anon";

grant truncate on table "public"."case_comments" to "anon";

grant update on table "public"."case_comments" to "anon";

grant delete on table "public"."case_comments" to "authenticated";

grant insert on table "public"."case_comments" to "authenticated";

grant references on table "public"."case_comments" to "authenticated";

grant select on table "public"."case_comments" to "authenticated";

grant trigger on table "public"."case_comments" to "authenticated";

grant truncate on table "public"."case_comments" to "authenticated";

grant update on table "public"."case_comments" to "authenticated";

grant delete on table "public"."case_comments" to "service_role";

grant insert on table "public"."case_comments" to "service_role";

grant references on table "public"."case_comments" to "service_role";

grant select on table "public"."case_comments" to "service_role";

grant trigger on table "public"."case_comments" to "service_role";

grant truncate on table "public"."case_comments" to "service_role";

grant update on table "public"."case_comments" to "service_role";

grant delete on table "public"."contacts" to "anon";

grant insert on table "public"."contacts" to "anon";

grant references on table "public"."contacts" to "anon";

grant select on table "public"."contacts" to "anon";

grant trigger on table "public"."contacts" to "anon";

grant truncate on table "public"."contacts" to "anon";

grant update on table "public"."contacts" to "anon";

grant delete on table "public"."contacts" to "authenticated";

grant insert on table "public"."contacts" to "authenticated";

grant references on table "public"."contacts" to "authenticated";

grant select on table "public"."contacts" to "authenticated";

grant trigger on table "public"."contacts" to "authenticated";

grant truncate on table "public"."contacts" to "authenticated";

grant update on table "public"."contacts" to "authenticated";

grant delete on table "public"."contacts" to "service_role";

grant insert on table "public"."contacts" to "service_role";

grant references on table "public"."contacts" to "service_role";

grant select on table "public"."contacts" to "service_role";

grant trigger on table "public"."contacts" to "service_role";

grant truncate on table "public"."contacts" to "service_role";

grant update on table "public"."contacts" to "service_role";

grant delete on table "public"."customer_comments" to "anon";

grant insert on table "public"."customer_comments" to "anon";

grant references on table "public"."customer_comments" to "anon";

grant select on table "public"."customer_comments" to "anon";

grant trigger on table "public"."customer_comments" to "anon";

grant truncate on table "public"."customer_comments" to "anon";

grant update on table "public"."customer_comments" to "anon";

grant delete on table "public"."customer_comments" to "authenticated";

grant insert on table "public"."customer_comments" to "authenticated";

grant references on table "public"."customer_comments" to "authenticated";

grant select on table "public"."customer_comments" to "authenticated";

grant trigger on table "public"."customer_comments" to "authenticated";

grant truncate on table "public"."customer_comments" to "authenticated";

grant update on table "public"."customer_comments" to "authenticated";

grant delete on table "public"."customer_comments" to "service_role";

grant insert on table "public"."customer_comments" to "service_role";

grant references on table "public"."customer_comments" to "service_role";

grant select on table "public"."customer_comments" to "service_role";

grant trigger on table "public"."customer_comments" to "service_role";

grant truncate on table "public"."customer_comments" to "service_role";

grant update on table "public"."customer_comments" to "service_role";

grant delete on table "public"."fullmakter" to "anon";

grant insert on table "public"."fullmakter" to "anon";

grant references on table "public"."fullmakter" to "anon";

grant select on table "public"."fullmakter" to "anon";

grant trigger on table "public"."fullmakter" to "anon";

grant truncate on table "public"."fullmakter" to "anon";

grant update on table "public"."fullmakter" to "anon";

grant delete on table "public"."fullmakter" to "authenticated";

grant insert on table "public"."fullmakter" to "authenticated";

grant references on table "public"."fullmakter" to "authenticated";

grant select on table "public"."fullmakter" to "authenticated";

grant trigger on table "public"."fullmakter" to "authenticated";

grant truncate on table "public"."fullmakter" to "authenticated";

grant update on table "public"."fullmakter" to "authenticated";

grant delete on table "public"."fullmakter" to "service_role";

grant insert on table "public"."fullmakter" to "service_role";

grant references on table "public"."fullmakter" to "service_role";

grant select on table "public"."fullmakter" to "service_role";

grant trigger on table "public"."fullmakter" to "service_role";

grant truncate on table "public"."fullmakter" to "service_role";

grant update on table "public"."fullmakter" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."service_types" to "anon";

grant insert on table "public"."service_types" to "anon";

grant references on table "public"."service_types" to "anon";

grant select on table "public"."service_types" to "anon";

grant trigger on table "public"."service_types" to "anon";

grant truncate on table "public"."service_types" to "anon";

grant update on table "public"."service_types" to "anon";

grant delete on table "public"."service_types" to "authenticated";

grant insert on table "public"."service_types" to "authenticated";

grant references on table "public"."service_types" to "authenticated";

grant select on table "public"."service_types" to "authenticated";

grant trigger on table "public"."service_types" to "authenticated";

grant truncate on table "public"."service_types" to "authenticated";

grant update on table "public"."service_types" to "authenticated";

grant delete on table "public"."service_types" to "service_role";

grant insert on table "public"."service_types" to "service_role";

grant references on table "public"."service_types" to "service_role";

grant select on table "public"."service_types" to "service_role";

grant trigger on table "public"."service_types" to "service_role";

grant truncate on table "public"."service_types" to "service_role";

grant update on table "public"."service_types" to "service_role";

grant delete on table "public"."storage_items" to "anon";

grant insert on table "public"."storage_items" to "anon";

grant references on table "public"."storage_items" to "anon";

grant select on table "public"."storage_items" to "anon";

grant trigger on table "public"."storage_items" to "anon";

grant truncate on table "public"."storage_items" to "anon";

grant update on table "public"."storage_items" to "anon";

grant delete on table "public"."storage_items" to "authenticated";

grant insert on table "public"."storage_items" to "authenticated";

grant references on table "public"."storage_items" to "authenticated";

grant select on table "public"."storage_items" to "authenticated";

grant trigger on table "public"."storage_items" to "authenticated";

grant truncate on table "public"."storage_items" to "authenticated";

grant update on table "public"."storage_items" to "authenticated";

grant delete on table "public"."storage_items" to "service_role";

grant insert on table "public"."storage_items" to "service_role";

grant references on table "public"."storage_items" to "service_role";

grant select on table "public"."storage_items" to "service_role";

grant trigger on table "public"."storage_items" to "service_role";

grant truncate on table "public"."storage_items" to "service_role";

grant update on table "public"."storage_items" to "service_role";

grant delete on table "public"."todos" to "anon";

grant insert on table "public"."todos" to "anon";

grant references on table "public"."todos" to "anon";

grant select on table "public"."todos" to "anon";

grant trigger on table "public"."todos" to "anon";

grant truncate on table "public"."todos" to "anon";

grant update on table "public"."todos" to "anon";

grant delete on table "public"."todos" to "authenticated";

grant insert on table "public"."todos" to "authenticated";

grant references on table "public"."todos" to "authenticated";

grant select on table "public"."todos" to "authenticated";

grant trigger on table "public"."todos" to "authenticated";

grant truncate on table "public"."todos" to "authenticated";

grant update on table "public"."todos" to "authenticated";

grant delete on table "public"."todos" to "service_role";

grant insert on table "public"."todos" to "service_role";

grant references on table "public"."todos" to "service_role";

grant select on table "public"."todos" to "service_role";

grant trigger on table "public"."todos" to "service_role";

grant truncate on table "public"."todos" to "service_role";

grant update on table "public"."todos" to "service_role";

grant delete on table "public"."valuations_backup" to "anon";

grant insert on table "public"."valuations_backup" to "anon";

grant references on table "public"."valuations_backup" to "anon";

grant select on table "public"."valuations_backup" to "anon";

grant trigger on table "public"."valuations_backup" to "anon";

grant truncate on table "public"."valuations_backup" to "anon";

grant update on table "public"."valuations_backup" to "anon";

grant delete on table "public"."valuations_backup" to "authenticated";

grant insert on table "public"."valuations_backup" to "authenticated";

grant references on table "public"."valuations_backup" to "authenticated";

grant select on table "public"."valuations_backup" to "authenticated";

grant trigger on table "public"."valuations_backup" to "authenticated";

grant truncate on table "public"."valuations_backup" to "authenticated";

grant update on table "public"."valuations_backup" to "authenticated";

grant delete on table "public"."valuations_backup" to "service_role";

grant insert on table "public"."valuations_backup" to "service_role";

grant references on table "public"."valuations_backup" to "service_role";

grant select on table "public"."valuations_backup" to "service_role";

grant trigger on table "public"."valuations_backup" to "service_role";

grant truncate on table "public"."valuations_backup" to "service_role";

grant update on table "public"."valuations_backup" to "service_role";

grant select on table "valuations"."valuations" to "authenticated";


  create policy "Archived Customers: Admins only"
  on "public"."archived_customers"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "temp_archived_all"
  on "public"."archived_customers"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Audit log: admin read"
  on "public"."audit_log"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "Audit log: insert"
  on "public"."audit_log"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Cancellation Comments: Admins manage"
  on "public"."cancellation_comments"
  as permissive
  for update
  to public
using (public.is_admin());



  create policy "Cancellation Comments: Users insert own"
  on "public"."cancellation_comments"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Cancellation Comments: Users view own"
  on "public"."cancellation_comments"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.is_admin()));



  create policy "Case Comments: Admins manage"
  on "public"."case_comments"
  as permissive
  for update
  to public
using (public.is_admin());



  create policy "Case Comments: Admins view all"
  on "public"."case_comments"
  as permissive
  for select
  to public
using (public.is_admin());



  create policy "Case Comments: Customers view own case"
  on "public"."case_comments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.cases c
  WHERE ((c.id = case_comments.case_id) AND (c.customer_id = auth.uid())))));



  create policy "Case Comments: Users insert own"
  on "public"."case_comments"
  as permissive
  for insert
  to public
with check ((author_id = auth.uid()));



  create policy "case_comments_admin_all"
  on "public"."case_comments"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "case_comments_customer_insert_own_case"
  on "public"."case_comments"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.cases c
  WHERE ((c.id = case_comments.case_id) AND (c.customer_id = auth.uid())))));



  create policy "case_comments_customer_read_own_case"
  on "public"."case_comments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.cases c
  WHERE ((c.id = case_comments.case_id) AND (c.customer_id = auth.uid())))));



  create policy "Cases: admin full access"
  on "public"."cases"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Cases: customer read own"
  on "public"."cases"
  as permissive
  for select
  to authenticated
using ((customer_id = auth.uid()));



  create policy "Cases: customer update own"
  on "public"."cases"
  as permissive
  for update
  to authenticated
using ((customer_id = auth.uid()))
with check ((customer_id = auth.uid()));



  create policy "No direct inserts by clients"
  on "public"."cases"
  as permissive
  for insert
  to authenticated
with check (false);



  create policy "cases_allow_admin"
  on "public"."cases"
  as permissive
  for all
  to public
using (((COALESCE(current_setting('jwt.claims.is_admin'::text, true), 'false'::text))::boolean = true))
with check (((COALESCE(current_setting('jwt.claims.is_admin'::text, true), 'false'::text))::boolean = true));



  create policy "cases_customer_read_own"
  on "public"."cases"
  as permissive
  for select
  to public
using ((customer_id = auth.uid()));



  create policy "cases_customer_update_own"
  on "public"."cases"
  as permissive
  for update
  to public
using ((customer_id = auth.uid()))
with check ((customer_id = auth.uid()));



  create policy "cases_insert"
  on "public"."cases"
  as permissive
  for insert
  to public
with check ((((COALESCE(current_setting('jwt.claims.is_admin'::text, true), 'false'::text))::boolean = true) OR (owner_id = (current_setting('jwt.claims.user_id'::text, true))::uuid)));



  create policy "cases_owner_access"
  on "public"."cases"
  as permissive
  for all
  to public
using (((owner_id IS NOT NULL) AND (owner_id = (current_setting('jwt.claims.user_id'::text, true))::uuid)))
with check ((owner_id = (current_setting('jwt.claims.user_id'::text, true))::uuid));



  create policy "temp_cases_all"
  on "public"."cases"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Contact Requests: Admins delete"
  on "public"."contact_requests"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "Contact Requests: admin read"
  on "public"."contact_requests"
  as permissive
  for select
  to authenticated
using (public.is_admin());



  create policy "Contact Requests: public insert only"
  on "public"."contact_requests"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "contact_requests_admin_access"
  on "public"."contact_requests"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.customers
  WHERE ((customers.id = auth.uid()) AND (customers.is_admin = true)))));



  create policy "contact_requests_admin_all"
  on "public"."contact_requests"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "contact_requests_anon_insert"
  on "public"."contact_requests"
  as permissive
  for insert
  to anon
with check (true);



  create policy "contact_requests_auth_insert"
  on "public"."contact_requests"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "contact_requests_insert_any"
  on "public"."contact_requests"
  as permissive
  for insert
  to public
with check (true);



  create policy "contact_requests_public_insert"
  on "public"."contact_requests"
  as permissive
  for insert
  to public
with check (true);



  create policy "temp_contacts_all"
  on "public"."contact_requests"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Admins can delete contacts"
  on "public"."contacts"
  as permissive
  for delete
  to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "Admins can update contacts"
  on "public"."contacts"
  as permissive
  for update
  to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "Admins can view all contacts"
  on "public"."contacts"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "Anyone can insert contacts"
  on "public"."contacts"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "No client access"
  on "public"."customer_comments"
  as permissive
  for all
  to public
using (false);



  create policy "Customers: Update own profile"
  on "public"."customers"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check (((auth.uid() = id) AND (is_admin = ( SELECT customers_1.is_admin
   FROM public.customers customers_1
  WHERE (customers_1.id = auth.uid())))));



  create policy "Customers: View own profile"
  on "public"."customers"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Customers: View own"
  on "public"."customers"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Customers: admin full access"
  on "public"."customers"
  as permissive
  for all
  to authenticated
using ((current_setting('request.jwt.claims.role'::text, true) = 'admin'::text))
with check ((current_setting('request.jwt.claims.role'::text, true) = 'admin'::text));



  create policy "Customers: user read own"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using ((id = auth.uid()));



  create policy "Customers: user update own"
  on "public"."customers"
  as permissive
  for update
  to authenticated
using ((id = auth.uid()))
with check ((id = auth.uid()));



  create policy "customers_delete_policy"
  on "public"."customers"
  as permissive
  for delete
  to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "customers_insert_policy"
  on "public"."customers"
  as permissive
  for insert
  to authenticated
with check ((id = auth.uid()));



  create policy "customers_insert_self"
  on "public"."customers"
  as permissive
  for insert
  to public
with check ((id = auth.uid()));



  create policy "customers_select_own"
  on "public"."customers"
  as permissive
  for select
  to public
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "customers_select_policy"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using (((id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));



  create policy "customers_update_policy"
  on "public"."customers"
  as permissive
  for update
  to authenticated
using (((id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)))
with check (((id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));



  create policy "customers_update_self"
  on "public"."customers"
  as permissive
  for update
  to public
using ((id = auth.uid()))
with check ((id = auth.uid()));



  create policy "temp_customers_all"
  on "public"."customers"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "No client access"
  on "public"."deleted_users_log"
  as permissive
  for all
  to public
using (false);



  create policy "deleted_users_log_admin_select"
  on "public"."deleted_users_log"
  as permissive
  for select
  to authenticated
using (public.check_is_admin(auth.uid()));



  create policy "temp_deleted_log_all"
  on "public"."deleted_users_log"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Användare kan ta bort egna fullmakter"
  on "public"."fullmakter"
  as permissive
  for delete
  to public
using ((auth.uid() = fullmaktsgivare));



  create policy "Fullmakter: involved user or admin"
  on "public"."fullmakter"
  as permissive
  for select
  to authenticated
using (((auth.uid() = fullmaktsgivare) OR (auth.uid() = fullmakthavare) OR public.is_admin()));



  create policy "Tillåt alla inloggade att skapa fullmakter"
  on "public"."fullmakter"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "All users can read service types"
  on "public"."service_types"
  as permissive
  for select
  to public
using (true);



  create policy "Cancellations: Admins manage all"
  on "public"."subscription_cancellations"
  as permissive
  for all
  to public
using (public.is_admin())
with check (public.is_admin());



  create policy "Cancellations: Customers insert own"
  on "public"."subscription_cancellations"
  as permissive
  for insert
  to public
with check ((customer_id = auth.uid()));



  create policy "Cancellations: Customers update own"
  on "public"."subscription_cancellations"
  as permissive
  for update
  to public
using ((customer_id = auth.uid()));



  create policy "Cancellations: Customers view own"
  on "public"."subscription_cancellations"
  as permissive
  for select
  to public
using (((customer_id = auth.uid()) OR public.is_admin()));



  create policy "Admins can manage subscriptions"
  on "public"."subscriptions"
  as permissive
  for all
  to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "todos_owner_delete"
  on "public"."todos"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "todos_owner_insert"
  on "public"."todos"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "todos_owner_select"
  on "public"."todos"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "todos_owner_update"
  on "public"."todos"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Admins can delete roles"
  on "public"."user_roles"
  as permissive
  for delete
  to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "Admins can insert roles"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "Admins can view all roles"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));



  create policy "temp_user_roles_all"
  on "public"."user_roles"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "user_roles_insert_own"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "user_roles_select_own"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "No client access"
  on "public"."valuations_backup"
  as permissive
  for all
  to public
using (false);



  create policy "Allow insert for authenticated"
  on "valuations"."valuations"
  as permissive
  for insert
  to authenticated
with check (((customer_id = auth.uid()) OR (customer_id IS NULL)));



  create policy "Valuations: users view own or admin"
  on "valuations"."valuations"
  as permissive
  for select
  to authenticated
using (((customer_id = auth.uid()) OR public.is_admin()));



  create policy "valuations_delete_policy"
  on "valuations"."valuations"
  as permissive
  for delete
  to authenticated
using (((customer_id = auth.uid()) OR (public.is_admin() = true)));



  create policy "valuations_insert_policy"
  on "valuations"."valuations"
  as permissive
  for insert
  to authenticated
with check (((customer_id = auth.uid()) OR (public.is_admin() = true) OR (customer_id IS NULL)));



  create policy "valuations_select_policy"
  on "valuations"."valuations"
  as permissive
  for select
  to authenticated
using (((customer_id = auth.uid()) OR (public.is_admin() = true)));



  create policy "valuations_update_policy"
  on "valuations"."valuations"
  as permissive
  for update
  to authenticated
using (((customer_id = auth.uid()) OR (public.is_admin() = true)))
with check (((customer_id = auth.uid()) OR (public.is_admin() = true)));



  create policy "archived_customers_admin_all"
  on "public"."archived_customers"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));



  create policy "cancellation_comments_admin_all"
  on "public"."cancellation_comments"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))))
with check ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))));



  create policy "cases_admin_all"
  on "public"."cases"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "customers_admin_all"
  on "public"."customers"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))))
with check ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))));



  create policy "deleted_users_log_admin_all"
  on "public"."deleted_users_log"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));



  create policy "subscription_cancellations_admin_all"
  on "public"."subscription_cancellations"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))))
with check ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))));



  create policy "user_roles_admin_all"
  on "public"."user_roles"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));


CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_requests_updated_at BEFORE UPDATE ON public.contact_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER cancel_update_timestamp BEFORE UPDATE ON public.subscription_cancellations FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

drop policy "Admins can manage all files" on "storage"."objects";

drop policy "Allow anonymous access to templates" on "storage"."objects";

drop policy "Users can read their own fullmakt files" on "storage"."objects";

drop policy "Users can upload their own fullmakt files" on "storage"."objects";


  create policy "Allow service role uploads"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Anyone authenticated can view abonnemang"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'abonnemang'::text));



  create policy "Fullmakter: owner or admin can read"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'fullmakts-filer'::text) AND ((owner = auth.uid()) OR public.is_admin())));



  create policy "storage_admin_full_access"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "storage_service_role_full_access"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "storage_user_delete_own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((owner = auth.uid()));



  create policy "storage_user_read_own"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((owner = auth.uid()));



  create policy "storage_user_upload_own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((owner = auth.uid()));



