import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { runMatching, getMatches, selectCollaborator } from '../api/matching.js';
import { label } from '../constants.js';

export default function MatchResults() {
  const { projectId } = useParams();
  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const existing = await getMatches(projectId);
        const fresh = existing.length > 0 ? existing : await runMatching(projectId);
        if (!cancelled) setRequests(fresh);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleSelect(requestId, collaboratorId) {
    setSelecting(requestId);
    try {
      const updated = await selectCollaborator(requestId, collaboratorId);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSelecting(null);
    }
  }

  if (loading) return <div className="p-8 text-slate-500">Finding collaborators...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Matched Collaborators</h1>
          <Link to={`/idea-input/${projectId}`} className="text-sm text-slate-500 underline">
            Back to plan
          </Link>
        </div>

        {requests && requests.some((r) => r.status === 'selected') && (
          <Link
            to={`/workspace/${projectId}`}
            className="inline-block bg-slate-800 text-white rounded px-4 py-2 font-medium"
          >
            Go to shared workspace
          </Link>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {requests && requests.map((request) => (
          <div key={request.id} className="bg-white shadow rounded-lg p-6">
            <h2 className="font-semibold text-slate-700 mb-3">
              {label(request.role_needed)}
            </h2>

            {request.matched_candidates.length === 0 && (
              <p className="text-sm text-slate-500">No registered collaborators match this role yet.</p>
            )}

            <div className="space-y-3">
              {request.matched_candidates.map((c) => (
                <div
                  key={c.collaboratorId}
                  className={`border rounded px-4 py-3 ${
                    request.selected_collaborator === c.collaboratorId
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-800 font-medium">{c.email || c.collaboratorId}</p>
                      <p className="text-sm text-slate-600 mt-1">{c.explanation}</p>
                      <p className="text-xs text-slate-400 mt-1">Score: {c.score}/100</p>
                    </div>
                    {request.selected_collaborator === c.collaboratorId ? (
                      <span className="text-sm text-green-700 font-medium">Selected</span>
                    ) : (
                      request.status !== 'selected' && (
                        <button
                          onClick={() => handleSelect(request.id, c.collaboratorId)}
                          disabled={selecting === request.id}
                          className="text-sm bg-slate-800 text-white rounded px-3 py-1 disabled:opacity-50"
                        >
                          Select
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
