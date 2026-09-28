/** Fraud/IP displays shown to the owner: keep enough to recognise a repeat
 * offender, hide the rest. IPv4 keeps two octets, IPv6 three groups. */
export const maskIp = (ip: unknown): string => {
  const s = String(ip ?? '');
  if (s.includes('.')) return s.split('.').slice(0, 2).join('.') + '.•.•';
  if (s.includes(':')) return s.split(':').slice(0, 3).join(':') + ':•';
  return s ? '•' : '—';
};
