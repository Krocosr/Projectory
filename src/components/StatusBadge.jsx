import { STATUS_STYLES } from '@/lib/constants';

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase ${style.bg} text-white`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
