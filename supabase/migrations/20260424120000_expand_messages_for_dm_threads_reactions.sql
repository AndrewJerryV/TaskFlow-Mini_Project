alter table public.messages
    add column if not exists conversation_type text not null default 'project',
    add column if not exists recipient_id uuid null references public.users(id) on delete cascade,
    add column if not exists thread_root_id uuid null references public.messages(id) on delete cascade,
    add column if not exists reactions jsonb not null default '[]'::jsonb;

update public.messages
set conversation_type = 'project'
where conversation_type is null;

create index if not exists idx_messages_conversation_type on public.messages(conversation_type);
create index if not exists idx_messages_recipient_id on public.messages(recipient_id);
create index if not exists idx_messages_thread_root_id on public.messages(thread_root_id);
