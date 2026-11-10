// Concede o Medicron Plus manualmente (testadores, fundadores).
// Uso (em apps/api): npm run grant-plus -- --email pessoa@exemplo.com --until 2027-12-31
// Usa DATABASE_URL (lida de .env.local). Concede à conta ATIVA da pessoa até o fim do dia informado (Brasília).
import { getDb } from "@/lib/db";
import { grantPlusByEmail, parseGrantArgs } from "@/lib/services/grant-plus";

try {
  const { email, until } = parseGrantArgs(process.argv.slice(2));
  const { orgId } = await grantPlusByEmail(getDb(), email, until);
  console.log(`Plus manual concedido: ${email} (conta ${orgId}) até ${until.toISOString()}`);
  process.exit(0);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
