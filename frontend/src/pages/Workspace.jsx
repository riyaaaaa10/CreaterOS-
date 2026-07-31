import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWorkspace, createTask, updateTask } from '../api/workspace.js';
import { label } from '../constants.js';

export default function Workspace() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function load() {
    try {
      const result = await getWorkspace(projectId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const task = await createTask(projectId, { title: newTaskTitle.trim(), due: newTaskDue || null });
      setData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
      setNewTaskTitle('');
      setNewTaskDue('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleTask(task) {
    try {
      const updated = await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === task.id ? updated : t)),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="p-8 text-slate-500">Loading workspace...</div>;
  if (error && !data) return <div className="p-8 text-red-600">{error}</div>;

  const { project, tasks, collaborationRequests } = data;
  const team = collaborationRequests
    .filter((r) => r.selected_collaborator)
    .map((r) => ({ role: r.role_needed, collaboratorId: r.selected_collaborator }));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Shared Workspace</h1>
          <Link to={`/idea-input/${projectId}`} className="text-sm text-slate-500 underline">
            View full plan
          </Link>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold text-slate-700 mb-2">Brief</h2>
          <p className="text-sm text-slate-600">{project.creative_brief?.refined_concept}</p>
          <p className="text-sm text-slate-600 mt-1">Hook: {project.creative_brief?.hook}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold text-slate-700 mb-2">Team</h2>
          <ul className="text-sm text-slate-600 space-y-1">
            {team.length === 0 && <li>No collaborators selected yet.</li>}
            {team.map((member) => (
              <li key={member.collaboratorId}>
                {label(member.role)}: {member.collaboratorId}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="font-semibold text-slate-700 mb-3">Task Checklist</h2>
          <ul className="space-y-2 mb-4">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => toggleTask(task)}
                />
                <span className={task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}>
                  {task.title}
                </span>
                {task.due && <span className="text-xs text-slate-400 ml-auto">{task.due}</span>}
              </li>
            ))}
            {tasks.length === 0 && <li className="text-sm text-slate-500">No tasks yet.</li>}
          </ul>

          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              placeholder="New task"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Due (optional)"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="w-32 border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <button type="submit" className="bg-slate-800 text-white rounded px-4 py-2 text-sm font-medium">
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
