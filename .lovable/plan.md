

## Problema

O download abre a URL assinada em uma nova aba em vez de baixar o arquivo. Isso acontece por dois motivos:

1. **`downloadFromUrl` usa `a.target = '_blank'`** -- isso abre em nova aba, ignorando o atributo `download`
2. **A URL assinada não tem header `Content-Disposition: attachment`** -- o Supabase serve o arquivo inline por padrão

## Solução

### 1. Usar `download` option do `createSignedUrl`

O método `createSignedUrl` do Supabase aceita um terceiro parâmetro com `{ download: true }` ou `{ download: 'filename.png' }`, que adiciona o header `Content-Disposition: attachment` na URL assinada.

Alterar em dois lugares no `export-service.ts`:
- `getCachedExport` (linha 30-32)
- `saveExportRecord` (linha 102-104)

### 2. Remover `a.target = '_blank'` do `downloadFromUrl`

No `ExportButtons.tsx`, remover a linha `a.target = '_blank'` da função `downloadFromUrl` para que o browser use o atributo `download` corretamente em vez de abrir nova aba.

### Arquivos alterados
- `src/lib/export-service.ts` -- adicionar `{ download: true }` nas chamadas `createSignedUrl`
- `src/components/ExportButtons.tsx` -- remover `a.target = '_blank'`

