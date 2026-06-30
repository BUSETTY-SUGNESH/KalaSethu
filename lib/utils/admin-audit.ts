import { logAdminAction } from '@/lib/services/admin-service';

export async function safeLogAdminAction(
  adminId: string,
  adminName: string,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: string
): Promise<void> {
  try {
    await logAdminAction(adminId, adminName, action, targetId, targetType, details);
  } catch (error) {
    console.error('Failed to write admin audit log', error);
  }
}
