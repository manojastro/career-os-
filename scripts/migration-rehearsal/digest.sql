WITH objs AS (
 SELECT 'table' k, c.relname n, md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''), ',' ORDER BY a.attnum)) h
  FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace AND ns.nspname='public'
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
  WHERE c.relkind IN ('r','p','v') GROUP BY c.relname
 UNION ALL SELECT 'function', p.proname||'('||pg_get_function_identity_arguments(p.oid)||')', md5(pg_get_functiondef(p.oid))
  FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prokind IN ('f','p')
 UNION ALL SELECT 'function_acl', p.proname||'('||pg_get_function_identity_arguments(p.oid)||')', md5(coalesce((SELECT string_agg(grantee::regrole::text||':'||privilege_type, ',' ORDER BY 1) FROM aclexplode(p.proacl) WHERE grantee<>0 AND grantee::regrole::text IN ('anon','authenticated','service_role')),'default'))
  FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prokind IN ('f','p')
 UNION ALL SELECT 'policy', schemaname||'.'||tablename||'.'||policyname, md5(cmd||array_to_string(roles,',')||coalesce(qual,'')||coalesce(with_check,'')||permissive)
  FROM pg_policies WHERE schemaname IN ('public','storage')
 UNION ALL SELECT 'trigger', c.relname||'.'||t.tgname, md5(pg_get_triggerdef(t.oid))
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal
 UNION ALL SELECT 'index', indexname, md5(indexdef) FROM pg_indexes WHERE schemaname='public'
 UNION ALL SELECT 'constraint', conrelid::regclass::text||'.'||conname, md5(pg_get_constraintdef(oid)) FROM pg_constraint WHERE connamespace='public'::regnamespace
 UNION ALL SELECT 'table_grant', table_name||':'||grantee, md5(string_agg(privilege_type, ',' ORDER BY privilege_type))
  FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role') GROUP BY table_name, grantee
 UNION ALL SELECT 'rls', relname, md5(relrowsecurity::text||relforcerowsecurity::text) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'
)
SELECT k, count(*)::int n, md5(string_agg(n||'='||h, '|' ORDER BY n)) digest FROM objs GROUP BY k ORDER BY k;
