import { apiSuccess } from '@/lib/api-helpers';
import { getAllCommands, COMMAND_CATEGORIES } from '@/lib/telegram/commands';

export const dynamic = 'force-dynamic';

export async function GET() {
  const commands = getAllCommands();
  return apiSuccess({
    commands,
    categories: COMMAND_CATEGORIES,
    total: commands.length,
    enabledCount: commands.filter((c) => c.enabled).length,
  });
}