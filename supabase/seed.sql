insert into datasets(id,code,name,owner,purpose,personal,retention_review,fresh_days) values
 ('10000000-0000-0000-0000-000000000001','ORDERS','Weekly order export','Aroha','Weekly branch totals',false,current_date+90,7),
 ('10000000-0000-0000-0000-000000000002','BRANCHES','Branch lookup','Ben','Assign branch region',false,current_date+90,7),
 ('10000000-0000-0000-0000-000000000003','CONTACTS','Old contact extract','','',true,current_date-10,7)
on conflict do nothing;
insert into batches(id,dataset_id,checksum,file_name,columns,row_count,actor,created_at) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','demo-orders','orders.csv','["order_id","branch","amount","status"]',5,'demo',now()),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','demo-branches','branches.csv','["branch","region"]',2,'demo',now()-interval '15 days') on conflict do nothing;
insert into source_rows(batch_id,ordinal,data) values
 ('20000000-0000-0000-0000-000000000001',1,'{"order_id":"ORD-1","branch":"AKL ","amount":"125.50","status":"complete"}'),
 ('20000000-0000-0000-0000-000000000001',2,'{"order_id":"ORD-2","branch":"WLG","amount":"74.25","status":"complete"}'),
 ('20000000-0000-0000-0000-000000000001',3,'{"order_id":"ORD-2","branch":"WLG","amount":"74.25","status":"complete"}'),
 ('20000000-0000-0000-0000-000000000001',4,'{"order_id":"ORD-3","branch":"AKL","amount":"19.00","status":"cancelled"}'),
 ('20000000-0000-0000-0000-000000000001',5,'{"order_id":"ORD-4","branch":"CHC","amount":"50.00","status":"complete"}'),
 ('20000000-0000-0000-0000-000000000002',1,'{"branch":"AKL","region":"North"}'),
 ('20000000-0000-0000-0000-000000000002',2,'{"branch":"WLG","region":"Central"}') on conflict do nothing;
insert into pipelines(id,code,name,owner,spec,version) values
 ('30000000-0000-0000-0000-000000000001','TOTALS','Weekly branch totals','Aroha','{"source":"ORDERS","steps":[{"op":"trim","fields":["branch"]},{"op":"filter","field":"status","equals":"complete"},{"op":"dedupe","fields":["order_id"]},{"op":"sum","group":["branch"],"field":"amount","as":"total"}]}','demo-v1'),
 ('30000000-0000-0000-0000-000000000002','REGIONS','Regional coverage check','Ben','{"source":"ORDERS","steps":[{"op":"trim","fields":["branch"]},{"op":"join","dataset":"BRANCHES","left":"branch","right":"branch","fields":["region"],"prefix":"lookup_"},{"op":"require","fields":["lookup_region"]}]}','demo-v1') on conflict do nothing;
insert into actions(id,title,owner,due) values
 ('40000000-0000-0000-0000-000000000001','Confirm Christchurch branch mapping','Ben',current_date-3),
 ('40000000-0000-0000-0000-000000000002','Review old contact extract retention','Aroha',current_date-10) on conflict do nothing;
