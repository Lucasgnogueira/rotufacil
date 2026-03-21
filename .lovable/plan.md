

## Diagnóstico: Download PNG dos valores nutricionais

### O que já está funcionando
- Premium override retornando `subscribed: true` para seu email
- Bibliotecas `html-to-image` e `jspdf` instaladas
- Bucket de storage `exports` criado com políticas de SELECT e INSERT
- Tabela `recipe_exports` com RLS configurado
- Componentes com `forceMount` para manter DOM disponível durante captura
- Refs (`tableRef`, `sealsRef`) conectados corretamente

### O que está faltando

**1. Política de UPDATE no Storage** (bloqueador principal)
O `export-service.ts` usa `upsert: true` ao fazer upload, o que requer uma política de UPDATE no storage. Atualmente só existem políticas de SELECT e INSERT. Sem isso, o upload falha ao tentar sobrescrever um arquivo existente (e mesmo no primeiro upload, o Supabase pode rejeitar por falta da policy de UPDATE).

**Solução**: Criar migração SQL adicionando policy de UPDATE:
```sql
CREATE POLICY "Users can update own exports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### Resumo
Apenas **uma migração** é necessária para adicionar a política de UPDATE no bucket de storage. O resto do fluxo (captura PNG, upload, geração de URL assinada, registro na tabela) já está implementado.

