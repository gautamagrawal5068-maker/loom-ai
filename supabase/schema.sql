-- ==============================================================================
-- LOOM AI Database Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  preferred_name text,
  user_category text check (user_category in ('Student', 'Professional', 'Founder', 'Freelancer', 'Other')),
  email_purpose text check (email_purpose in ('Work', 'School', 'Business', 'Personal', 'Mixed')),
  preferred_style text check (preferred_style in ('Professional', 'Friendly', 'Direct', 'Warm', 'Adaptable')),
  style_sample text,
  onboarding_completed boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Conversations Table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'New Conversation',
  tone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Messages Table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  is_error boolean default false not null,
  created_at timestamptz default now() not null
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Conversations Policies
create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- Messages Policies (Derived ownership through conversation)
create policy "Users can view messages from their own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where public.conversations.id = public.messages.conversation_id
      and public.conversations.user_id = auth.uid()
    )
  );

create policy "Users can insert messages into their own conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where public.conversations.id = public.messages.conversation_id
      and public.conversations.user_id = auth.uid()
    )
  );

create policy "Users can delete messages from their own conversations"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations
      where public.conversations.id = public.messages.conversation_id
      and public.conversations.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- Triggers: Auto-create Profile on Sign Up
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, preferred_name, onboarding_completed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger for updating timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists on_conversations_updated on public.conversations;
create trigger on_conversations_updated
  before update on public.conversations
  for each row execute function public.handle_updated_at();
