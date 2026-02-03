-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create sessions table
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null, -- Assuming Auth is enabled
  category text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.sessions enable row level security;

-- Policies
create policy "Users can view their own sessions" 
on public.sessions for select 
using (auth.uid() = user_id);

create policy "Users can insert their own sessions" 
on public.sessions for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own sessions" 
on public.sessions for update 
using (auth.uid() = user_id);

-- Indexes for performance
create index sessions_user_id_idx on public.sessions(user_id);
create index sessions_start_time_idx on public.sessions(start_time);