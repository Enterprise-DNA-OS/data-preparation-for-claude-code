create table datasets (
 id uuid primary key default gen_random_uuid(), code text unique not null check(code ~ '^[A-Z][A-Z0-9_-]*$'),
 name text not null check(length(trim(name))>0), owner text not null default '', purpose text not null default '',
 jurisdiction text not null default 'NZ' check(jurisdiction in ('NZ','AU','OTHER')),
 personal boolean not null default false, retention_review date,
 fresh_days integer not null default 7 check(fresh_days>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table batches (
 id uuid primary key default gen_random_uuid(), dataset_id uuid not null references datasets(id),
 checksum text not null, file_name text not null, columns jsonb not null,
 row_count integer not null check(row_count>=0), actor text not null check(length(trim(actor))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(dataset_id,checksum)
);
create table source_rows (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references batches(id),
 ordinal integer not null check(ordinal>0), data jsonb not null check(jsonb_typeof(data)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(batch_id,ordinal)
);
create table pipelines (
 id uuid primary key default gen_random_uuid(), code text unique not null check(code ~ '^[A-Z][A-Z0-9_-]*$'),
 name text not null, owner text not null, spec jsonb not null, version text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table runs (
 id uuid primary key default gen_random_uuid(), pipeline_id uuid not null references pipelines(id),
 version text not null, spec jsonb not null, sources jsonb not null,
 status text not null check(status in ('passed','failed')), input_count integer not null,
 output_count integer not null, steps jsonb not null, error text, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table output_rows (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references runs(id), ordinal integer not null,
 data jsonb not null, lineage jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(run_id,ordinal)
);
create table actions (
 id uuid primary key default gen_random_uuid(), title text not null, owner text not null, due date not null,
 status text not null default 'open' check(status in ('open','closed')), evidence text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit (
 id uuid primary key default gen_random_uuid(), actor text not null, event text not null, detail jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['datasets','batches','source_rows','pipelines','runs','output_rows','actions','audit'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
end loop; end $$;
create index source_batch on source_rows(batch_id,ordinal);
create index outputs_run on output_rows(run_id,ordinal);
create index runs_pipeline on runs(pipeline_id,created_at desc);
create view dataset_health as
 select d.id,d.code,d.name,d.owner,d.purpose,d.personal,d.jurisdiction,d.retention_review,d.fresh_days,
 b.id as batch_id,b.created_at as imported_at,coalesce(b.row_count,0) as row_count,
 case when b.id is null then 'never imported' when b.created_at < now()-d.fresh_days*interval '1 day' then 'stale' else 'current' end as freshness
 from datasets d left join lateral(select * from batches where dataset_id=d.id order by created_at desc,id desc limit 1)b on true;
create view run_health as
 select p.id,p.code,p.name,p.owner,p.version,r.id as run_id,r.status,r.input_count,r.output_count,r.error,r.created_at as ran_at,
 case when r.id is null then 'never run' when r.version<>p.version then 'rules changed' when exists(
 select 1 from jsonb_each_text(r.sources)s left join dataset_health d on d.code=s.key where d.batch_id::text is distinct from s.value
 )then 'inputs changed' else 'current' end as freshness
 from pipelines p left join lateral(select * from runs where pipeline_id=p.id order by created_at desc,id desc limit 1)r on true;
create view attention_queue as select id,title,owner,due,status, current_date-due as days_overdue from actions where status='open';
revoke all on dataset_health,run_health,attention_queue from public;
