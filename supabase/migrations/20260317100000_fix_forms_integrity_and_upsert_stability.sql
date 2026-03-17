-- Fix Forms integrity and response upsert stability
-- Applied to project: fawhdeawrihomivctrnw

-- 1) Clean duplicate responses, keeping the latest submission per form/respondent
with ranked as (
  select
    id,
    row_number() over (
      partition by form_id, respondent_id
      order by submitted_at desc nulls last, id desc
    ) as rn
  from public.form_responses
  where form_id is not null
    and respondent_id is not null
)
delete from public.form_responses fr
using ranked r
where fr.id = r.id
  and r.rn > 1;

-- 2) Keep core columns present and defaulted for reliable API behavior
alter table public.forms
  alter column fields set default '[]'::jsonb,
  alter column status set default 'draft';

alter table public.form_responses
  alter column answers set default '{}'::jsonb,
  alter column submitted_at set default now();

-- 3) Enforce one response per user per form (aligns with app upsert logic)
create unique index if not exists idx_form_responses_form_respondent_unique
  on public.form_responses (form_id, respondent_id)
  where form_id is not null and respondent_id is not null;

-- 4) Add performance indexes for forms/responses reads
create index if not exists idx_forms_project_created_at
  on public.forms (project_id, created_at desc);

create index if not exists idx_forms_project_status
  on public.forms (project_id, status);

create index if not exists idx_form_responses_form_submitted_at
  on public.form_responses (form_id, submitted_at desc);

create index if not exists idx_form_responses_respondent
  on public.form_responses (respondent_id);

-- 5) Guard basic required relationships at DB level
alter table public.forms
  alter column project_id set not null,
  alter column created_by set not null;

alter table public.form_responses
  alter column form_id set not null,
  alter column respondent_id set not null;
