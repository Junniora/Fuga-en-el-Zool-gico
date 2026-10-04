import { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Leaf,
  PawPrint,
} from 'lucide-react';
import { TeamMemberCard } from '../components/TeamMemberCard';

const members = [
  { name: 'Estefany Garza Mora', studentId: '2047821', career: 'ITS' },
  { name: 'Samuel Álvarez Rodríguez', studentId: '2040316', career: 'IMC' },
  { name: 'Ángel Ricardo Álvarez García', studentId: '2041139', career: 'ITS' },
  {
    name: 'Emiliano Arturo Esquivel Álvarez',
    studentId: '2049063',
    career: 'ITS',
  },
];

export function Credits({ onBack }: { onBack: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, []);
  return (
    <main className="credits-page">
      <button
        type="button"
        className="text-button credits-back"
        onClick={onBack}
      >
        <ArrowLeft size={17} /> Volver al Home
      </button>
      <section className="credits-intro" aria-labelledby="credits-title">
        <div className="credits-heading">
          <span className="eyebrow">
            <Leaf size={15} aria-hidden="true" /> CRÉDITOS · DETRÁS DE LA FUGA
          </span>
          <h1 id="credits-title" ref={title} tabIndex={-1}>
            Fuga en el
            <br />
            <em>Zoológico</em>
          </h1>
          <p>Proyecto desarrollado por</p>
          <span className="team-badge">
            <PawPrint size={18} aria-hidden="true" /> Equipo #3
          </span>
        </div>
        <div className="academic-card">
          <span className="academic-icon">
            <GraduationCap size={25} aria-hidden="true" />
          </span>
          <h2>Universidad Autónoma de Nuevo León</h2>
          <p>Facultad de Ingeniería Mecánica y Eléctrica</p>
          <div className="academic-course">
            <BookOpen size={18} aria-hidden="true" />
            <dl>
              <div>
                <dt>Materia</dt>
                <dd>Pensamiento Creativo</dd>
              </div>
              <div>
                <dt>Grupo</dt>
                <dd>008</dd>
              </div>
            </dl>
          </div>
          <div className="teacher">
            <span>Profesora</span>
            <strong>María Cristina Cantú Rodríguez</strong>
          </div>
        </div>
      </section>
      <section className="credits-team" aria-labelledby="team-title">
        <div className="team-heading">
          <div>
            <span className="eyebrow">CADA IDEA CUENTA</span>
            <h2 id="team-title">La manada detrás del plan.</h2>
          </div>
          <span className="team-count">
            04 <span>integrantes</span>
          </span>
        </div>
        <div className="team-grid">
          {members.map((member) => (
            <TeamMemberCard key={member.studentId} {...member} />
          ))}
        </div>
      </section>
      <p className="credits-signoff">
        <PawPrint size={15} aria-hidden="true" /> Una idea compartida. Una
        aventura en equipo.
      </p>
    </main>
  );
}
