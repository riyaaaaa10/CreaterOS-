import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { listMyProjects } from '../api/projects.js';
import { listMyCollaborations } from '../api/matching.js';
import { getRecommendation } from '../api/profiles.js';
import { label } from '../constants.js';

const STATUS_STYLES = {
  in_progress: 'bg-amber-100 text-amber-700',
  plan_ready: 'bg-indigo-100 text-indigo-700',
  pending: 'bg-slate-100 text-slate-600',
  selected: 'bg-emerald-100 text-emerald-700',
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${style}`}>
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
      className="flex items-start justify-between gap-4 bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-4 hover:shadow-md hover:border-slate-200 transition-all"
    >
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
    </Link>
  );
}

function CollaborationCard({ collab }) {
  return (
    <Link
      to={`/workspace/${collab.project_id}`}
      className="flex items-start justify-between gap-4 bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-4 hover:shadow-md hover:border-slate-200 transition-all"
    >
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
    </Link>
  );
}

function IdeasSection({ ideas }) {
  if (!ideas?.length) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Ideas worth trying</h2>
      <div className="space-y-2.5">
        {ideas.map((idea, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-4">
            <p className="text-sm font-medium text-slate-800 leading-snug">{idea.title}</p>
            <p className="text-xs text-slate-400 mt-1">{idea.reasoning}</p>
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-slate-800">CreatorOS</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.email}</span>
            <button onClick={logOut} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Got a new idea?</h1>
            <p className="text-indigo-100 text-sm mt-1">
              Turn it into a shot list and find a collaborator in minutes.
            </p>
          </div>
          <Link
            to="/idea-input"
            className="bg-white text-indigo-700 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap hover:bg-indigo-50 transition-colors"
          >
            Start a new idea
          </Link>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <IdeasSection ideas={ideas} />

        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Your projects</h2>
          {loading && <p className="text-slate-400 text-sm">Loading...</p>}
          {!loading && !error && projects.length === 0 && (
            <EmptyState text="No projects yet — start one above." />
          )}
          <div className="space-y-2.5">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Collaborating on</h2>
          {!loading && !error && collaborations.length === 0 && (
            <EmptyState text="Not selected for any projects yet." />
          )}
          <div className="space-y-2.5">
            {collaborations.map((c) => (
              <CollaborationCard key={c.id} collab={c} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
