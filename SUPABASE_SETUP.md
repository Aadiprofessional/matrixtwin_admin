# Supabase Setup Guide

To make the Admin Panel work, you need to set up your Supabase database with the following schema.

## 1. Create the `users` table

Run the following SQL in your Supabase SQL Editor to create the `users` table and set up the trigger to automatically create a user entry when a new user signs up.

```sql
create table public.users (
   id uuid not null,
   email text not null,
   name text null,
   role text null default 'user'::text,
   avatar text null,
   created_at timestamp with time zone null default now(),
   updated_at timestamp with time zone null default now(),
   company_id uuid null,
   constraint users_pkey primary key (id),
   constraint users_email_key unique (email),
   constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
   constraint users_company_id_fkey foreign KEY (company_id) references companies (id)
 ) TABLESPACE pg_default;

-- Set up Row Level Security (RLS)
alter table users enable row level security;

-- Allow users to view their own profile
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

-- Allow owners to view all profiles
create policy "Owners can view all profiles" on users
  for select using (
    exists (
      select 1 from users where id = auth.uid() and role = 'owner'
    )
  );

-- Allow owners to update profiles
create policy "Owners can update profiles" on users
  for update using (
    exists (
      select 1 from users where id = auth.uid() and role = 'owner'
    )
  );

-- Allow owners to delete profiles
create policy "Owners can delete profiles" on users
  for delete using (
    exists (
      select 1 from users where id = auth.uid() and role = 'owner'
    )
  );

-- Create a trigger to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 2. Create the First Owner User

Since only owners can log in, you need to manually create the first owner user.

1.  Go to **Authentication > Users** in Supabase and invite/create a new user (e.g., `admin@matrixtwin.com`).
2.  Go to the **Table Editor > users** table.
3.  Find the user you just created and change their `role` from `user` to `owner`.

Now you can log in with this user on the Admin Panel.
