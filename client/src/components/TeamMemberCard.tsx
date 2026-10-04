import { Leaf } from 'lucide-react';

interface TeamMemberCardProps {
  name: string;
  studentId: string;
  career: string;
}
export function TeamMemberCard({
  name,
  studentId,
  career,
}: TeamMemberCardProps) {
  const words = name.trim().split(/\s+/);
  const initials =
    `${words[0][0]}${words[Math.max(1, words.length - 2)]?.[0] ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  return (
    <article className="team-member-card">
      <div className="member-card-top">
        <span className="member-avatar" aria-hidden="true">
          {initials}
        </span>
        <Leaf size={20} aria-hidden="true" />
      </div>
      <h3>{name}</h3>
      <dl className="member-details">
        <div>
          <dt>Matrícula</dt>
          <dd>{studentId}</dd>
        </div>
        <div>
          <dt>Carrera</dt>
          <dd>
            <span className="career-badge">{career}</span>
          </dd>
        </div>
      </dl>
    </article>
  );
}
