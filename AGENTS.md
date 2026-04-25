# Diretrizes do Projeto OralCloud

## Segurança e Conformidade
- **Revisão de Permissões:** Sempre que uma nova funcionalidade ou coleção no Firestore for adicionada, os arquivos `firestore.rules` e `firebase-blueprint.json` DEVEM ser revisados e restritos.
- **Auditoria:** Ações que modificam dados sensíveis (pacientes, financeiro, configurações) devem ser registradas via `auditService`.
- **Tratamento de Erros:** Use sempre o `handleFirestoreError` em operações do Firebase para manter consistência nos logs de erro de permissão.
