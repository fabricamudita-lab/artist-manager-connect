import { ApprovalDetail } from '@/components/ApprovalDetail';
import { usePageTitle } from '@/hooks/useCommon';

export default function ApprovalDetailPage() {
  usePageTitle('Detalle de Aprobación');
  
  return <ApprovalDetail />;
}