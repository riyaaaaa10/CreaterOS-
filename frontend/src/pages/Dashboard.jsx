import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { listMyProjects } from '../api/projects.js';
import { listMyCollaborations } from '../api/matching.js';
import { getRecommendation } from '../api/profiles.js';
import { label } from '../constants.js';

const STATUS_STYLES = {
  in_progress: { pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  plan_ready:  { pill: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  pending:     { pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  selected:    { pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-xl px-4 py-6 text-center">
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

function ProjectCard({ project }) {
  // plan_ready projects go straight to matching; in_progress stay in the chat
  const to = project.status === 'plan_ready'
    ? `/matches/${project.id}`
    : `/idea-input/${project.id}`;

  return (
    <Link
      to={to}
      className="group flex items-start gap-0 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      <span className="w-1 shrink-0 self-stretch bg-indigo-300 rounded-l-2xl" />
      <div className="flex items-start justify-between gap-4 flex-1 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">
            {project.raw_idea}
          </p>
          {project.status === 'plan_ready' && project.creative_brief?.refined_concept && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              {project.creative_brief.refined_concept}
            </p>
          )}
        </div>
        <div className="shrink-0 pt-0.5">
          <StatusBadge status={project.status} />
        </div>
      </div>
    </Link>
  );
}

function CollaborationCard({ collab }) {
  return (
    <Link
      to={`/workspace/${collab.project_id}`}
      className="group flex items-start gap-0 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      <span className="w-1 shrink-0 self-stretch bg-emerald-300 rounded-l-2xl" />
      <div className="flex items-start justify-between gap-4 flex-1 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">
            {label(collab.role_needed)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            Project {collab.project_id}
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          <StatusBadge status={collab.status} />
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ icon, children }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
      <span className="text-slate-400">{icon}</span>
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{children}</h2>
    </div>
  );
}

function IdeasSection({ ideas }) {
  if (!ideas?.length) return null;
  return (
    <section>
      <SectionHeader icon={
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM6.343 5.657a1 1 0 00-1.414-1.414L3.515 5.657a1 1 0 001.414 1.414l1.414-1.414zM15.071 4.243a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414-1.414l-1.414-1.414zM4 10a1 1 0 100 2H3a1 1 0 100-2h1zM17 10a1 1 0 100 2h1a1 1 0 100-2h-1zM7 14a3 3 0 106 0H7zM10 17a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
      }>Ideas worth trying</SectionHeader>
      <div className="space-y-3">
        {ideas.map((idea, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="flex gap-0 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <span className="w-1 shrink-0 self-stretch bg-violet-300 rounded-l-2xl" />
            <div className="px-5 py-4">
              <p className="text-sm font-medium text-slate-800 leading-snug">{idea.title}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{idea.reasoning}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user, logOut } = useAuth();
  const [projects, setProjects] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listMyProjects(), listMyCollaborations(), getRecommendation()])
      .then(([p, c, rec]) => {
        setProjects(p);
        setCollaborations(c);
        setIdeas(rec?.ideas ?? []); // empty array if no creator profile or call failed
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <span className="font-semibold text-slate-800 tracking-tight">CreatorOS</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold select-none">
                {avatarLetter}
              </div>
              <span className="text-sm text-slate-500 hidden sm:block">{user?.email}</span>
            </div>
            <button onClick={logOut} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 rounded-2xl p-6 flex items-center justify-between gap-4">
          {/* Decorative background circle */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 text-white opacity-10"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="20" />
            <circle cx="80" cy="80" r="40" stroke="currentColor" strokeWidth="10" />
          </svg>
          <div className="relative">
            <h1 className="text-lg font-semibold text-white">Got a new idea?</h1>
            <p className="text-indigo-100 text-sm mt-1">
              Turn it into a shot list and find a collaborator in minutes.
            </p>
          </div>
          <Link
            to="/idea-input"
            className="relative bg-white text-indigo-700 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Start a new idea
          </Link>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <IdeasSection ideas={ideas} />

        <section>
          <SectionHeader icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          }>Your projects</SectionHeader>
          {loading && <p className="text-slate-400 text-sm">Loading...</p>}
          {!loading && !error && projects.length === 0 && (
            <EmptyState text="No projects yet — start one above." />
          )}
          <div className="space-y-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM6 8a2 2 0 11-4 0 2 2 0 014 0zM15.22 14.79A5.978 5.978 0 0013 14H7a5.978 5.978 0 00-2.22.79A4.978 4.978 0 004 16.5V17a1 1 0 001 1h10a1 1 0 001-1v-.5a4.978 4.978 0 00-.78-1.71z" />
            </svg>
          }>Collaborating on</SectionHeader>
          {!loading && !error && collaborations.length === 0 && (
            <EmptyState text="Not selected for any projects yet." />
          )}
          <div className="space-y-3">
            {collaborations.map((c) => (
              <CollaborationCard key={c.id} collab={c} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
