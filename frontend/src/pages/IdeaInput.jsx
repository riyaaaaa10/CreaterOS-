import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createProject, getProject, replyToProject, updateWorkflowStage, replyFollowUp } from '../api/projects.js';
import { WORKFLOW_STAGES } from '../constants.js';

function parseTurn(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export default function IdeaInput() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [input, setInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stageUpdating, setStageUpdating] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpHistory, setFollowUpHistory] = useState([]);
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId)
      .then(setProject)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleStart(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await createProject(input.trim());
      setInput('');
      navigate(`/idea-input/${created.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(message) {
    if (!message?.trim() || !project) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await replyToProject(project.id, message.trim());
      setProject(updated);
      setInput('');
      setShowCustom(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCustomSubmit(e) {
    e.preventDefault();
    if (project?.status !== 'in_progress') return;
    submitReply(input);
  }

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;

  const lastTurn =
    project && project.status === 'in_progress'
      ? parseTurn(project.conversation_history.at(-1)?.content)
      : null;

  const hasInteractiveOptions =
    (lastTurn?.type === 'question' && lastTurn.options?.length > 0) ||
    (lastTurn?.type === 'concept_choice' && lastTurn.concept_options?.length > 0);
  const showCustomInput = project?.status === 'in_progress' && (showCustom || !hasInteractiveOptions);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Plan Your Shoot</h1>

        {!project && (
          <form onSubmit={handleStart} className="bg-white shadow-sm rounded-2xl p-5 space-y-3">
            <label className="block text-sm font-medium text-slate-600">What&rsquo;s your idea?</label>
            <textarea
              placeholder="Describe your rough idea..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 h-28 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Thinking...' : 'Start'}
            </button>
          </form>
        )}

        {project && (
          <div className="space-y-4">
            <div className="space-y-3">
              {project.conversation_history.map((turn, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <ChatBubble key={i} turn={turn} />
              ))}
              {submitting && <TypingIndicator />}
            </div>

            {error && <p className="text-red-600 text-sm pl-9">{error}</p>}

            {project.status === 'in_progress' && lastTurn?.type === 'concept_choice' && lastTurn.concept_options?.length > 0 && (
              <ConceptChoices
                concepts={lastTurn.concept_options}
                onChoose={(concept) => submitReply(`I'll go with "${concept.title}": ${concept.description}`)}
                onCustom={() => setShowCustom(true)}
                disabled={submitting}
              />
            )}

            {project.status === 'in_progress' && lastTurn?.type === 'question' && lastTurn.options?.length > 0 && (
              <QuestionOptions
                options={lastTurn.options}
                onChoose={(opt) => submitReply(opt)}
                onCustom={() => setShowCustom(true)}
                disabled={submitting}
              />
            )}

            {showCustomInput && (
              <form onSubmit={handleCustomSubmit} className="flex gap-2 pl-9">
                <input
                  placeholder="Type your answer..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </form>
            )}

            {project.status === 'plan_ready' && (
              <>
                <PlanSummary brief={project.creative_brief} plan={project.production_plan} />
                <FollowUpPanel
                  history={followUpHistory}
                  input={followUpInput}
                  submitting={followUpSubmitting}
                  onInputChange={setFollowUpInput}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const msg = followUpInput.trim();
                    if (!msg) return;
                    setFollowUpSubmitting(true);
                    try {
                      const result = await replyFollowUp(project.id, msg);
                      const response = result.followup_response;
                      setFollowUpHistory((prev) => [
                        ...prev,
                        { role: 'user', content: msg },
                        { role: 'assistant', content: response.message, type: response.type },
                      ]);
                      setFollowUpInput('');
                      if (response.type === 'updated_plan') {
                        setProject((prev) => ({
                          ...prev,
                          creative_brief: result.creative_brief,
                          production_plan: result.production_plan,
                        }));
                      }
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setFollowUpSubmitting(false);
                    }
                  }}
                />
                <WorkflowStageSelector
                  currentStage={project.workflow_stage || null}
                  disabled={stageUpdating}
                  onSelect={async (stage) => {
                    setStageUpdating(true);
                    try {
                      const updated = await updateWorkflowStage(project.id, stage);
                      setProject((prev) => ({ ...prev, workflow_stage: updated.workflow_stage }));
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setStageUpdating(false);
                    }
                  }}
                />
                <Link
                  to={`/matches/${project.id}`}
                  className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  Find collaborators
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function WorkflowStageSelector({ currentStage, disabled, onSelect }) {
  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
        Production stage
      </p>
      <div className="flex flex-wrap gap-2">
        {WORKFLOW_STAGES.map((s) => {
          const isActive = currentStage === s.value;
          return (
            <button
              key={s.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function ChatBubble({ turn }) {
  const isUser = turn.role === 'user';
  let message = turn.content;
  let badge = null;

  if (!isUser) {
    const parsed = parseTurn(turn.content);
    if (parsed) {
      message = parsed.message;
      if (parsed.type === 'concept_choice') badge = 'Choosing a direction';
      if (parsed.type === 'final_plan') badge = 'Final plan';
    }
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
          isUser ? 'bg-slate-700 text-white' : 'bg-indigo-100 text-indigo-700'
        }`}
      >
        {isUser ? 'You' : 'AI'}
      </div>
      <div className="max-w-[80%] flex flex-col">
        {badge && (
          <span className="text-[11px] uppercase tracking-wide text-indigo-500 font-medium mb-1">{badge}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser ? 'bg-slate-800 text-white rounded-tr-sm' : 'bg-white shadow-sm text-slate-700 rounded-tl-sm'
          }`}
        >
          {message}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
        AI
      </div>
      <div className="bg-white shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

function QuestionOptions({ options, onChoose, onCustom, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pl-9">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChoose(opt)}
          disabled={disabled}
          className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {opt}
        </button>
      ))}
      <button
        type="button"
        onClick={onCustom}
        disabled={disabled}
        className="text-slate-500 hover:text-slate-700 text-sm underline disabled:opacity-50"
      >
        Something else
      </button>
    </div>
  );
}

function ConceptChoices({ concepts, onChoose, onCustom, disabled }) {
  return (
    <div className="pl-9 space-y-2">
      {concepts.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChoose(c)}
          disabled={disabled}
          className="w-full text-left bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
        >
          <p className="text-sm font-semibold text-slate-800">{c.title}</p>
          <p className="text-sm text-slate-600 mt-0.5">{c.description}</p>
        </button>
      ))}
      <button
        type="button"
        onClick={onCustom}
        disabled={disabled}
        className="text-slate-500 hover:text-slate-700 text-sm underline disabled:opacity-50"
      >
        None of these — let me describe something else
      </button>
    </div>
  );
}

function ChipList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map((item) => (
        <span key={item} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
          {item}
        </span>
      ))}
    </div>
  );
}


function ContentSignals({ signals }) {
  // signals_source tells us whether live web research was used or heuristic fallback.
  const isLive = signals.signals_source === 'live_research';
  const reachStr = signals.estimated_reach_low && signals.estimated_reach_high
    ? `${(signals.estimated_reach_low / 1000).toFixed(0)}K – ${(signals.estimated_reach_high / 1000).toFixed(0)}K`
    : '—';

  const competitionColor = {
    Low: 'text-emerald-600',
    Medium: 'text-amber-600',
    High: 'text-red-500',
  }[signals.competition] || 'text-slate-600';

  const trendColor = {
    Rising: 'text-emerald-600',
    Steady: 'text-slate-600',
    Declining: 'text-red-500',
  }[signals.trend_growth] || 'text-slate-600';

  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Content signals</h2>
        {isLive ? (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
            Based on live trend research
          </span>
        ) : (
          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
            AI estimate · not live data
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Virality</span>
          <p className="text-slate-800 font-semibold">{signals.virality_score?.toFixed(1)}/10</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Competition</span>
          <p className={`font-semibold ${competitionColor}`}>{signals.competition}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Trend</span>
          <p className={`font-semibold ${trendColor}`}>{signals.trend_growth}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Audience match</span>
          <p className="text-slate-800 font-semibold">{signals.audience_match_pct}%</p>
        </div>
        <div className="col-span-2 sm:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Est. reach</span>
          <p className="text-slate-800 font-semibold">{reachStr}</p>
        </div>
      </div>
    </div>
  );
}


function PlanSummary({ brief, plan }) {
  // Build a lookup so script lines can be paired with their shot card.
  // Gracefully absent for older projects that predate the script field.
  const scriptByShot = Object.fromEntries(
    (plan.script ?? []).map(({ shot_number, line }) => [shot_number, line]),
  );

  return (
    <div className="bg-white shadow-sm rounded-2xl overflow-hidden">
      {/* Creative brief */}
      <div className="p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Creative brief</h2>
        <p className="text-base font-semibold text-slate-800 leading-snug">{brief.refined_concept}</p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hook</span>
            <p className="text-slate-700 mt-0.5">{brief.hook}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Style</span>
            <p className="text-slate-700 mt-0.5">{brief.visual_style}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Caption idea</span>
            <p className="text-slate-700 mt-0.5">{brief.caption_idea}</p>
          </div>
        </div>
        {brief.hashtags?.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hashtags</span>
            <ChipList items={brief.hashtags} />
          </div>
        )}
      </div>

      {/* Content signals — AI-estimated heuristics, not live platform data */}
      {plan.content_signals && (
        <ContentSignals signals={plan.content_signals} />
      )}

      {/* Production plan */}
      <div className="border-t border-slate-100 p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Production plan</h2>

        <div className="space-y-2">
          {plan.shot_list.map((s) => (
            <div key={s.shot_number} className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-indigo-500 mb-0.5">Shot {s.shot_number} · {s.shot_type}</p>
              <p className="text-sm text-slate-800">{s.description}</p>
              {scriptByShot[s.shot_number] && (
                <p className="text-xs text-slate-500 italic mt-1">"{scriptByShot[s.shot_number]}"</p>
              )}
              {s.location_note && (
                <p className="text-xs text-slate-400 mt-0.5">{s.location_note}</p>
              )}
            </div>
          ))}
        </div>

        {plan.props?.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Props</span>
            <ChipList items={plan.props} />
          </div>
        )}
        {plan.equipment?.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Equipment</span>
            <ChipList items={plan.equipment} />
          </div>
        )}
        {plan.outfit_suggestions?.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Outfits</span>
            <ChipList items={plan.outfit_suggestions} />
          </div>
        )}
        {plan.needed_roles?.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Needed roles</span>
            <ChipList items={plan.needed_roles.map((r) => r.replace('_', ' '))} />
          </div>
        )}
      </div>
    </div>
  );
}


function FollowUpPanel({ history, input, submitting, onInputChange, onSubmit }) {
  return (
    <div className="bg-white shadow-sm rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
          Ask a follow-up
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Refine your plan, ask questions, or request changes.
        </p>
      </div>

      {history.length > 0 && (
        <div className="px-5 pb-3 space-y-3">
          {history.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isUser ? 'bg-slate-700 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {isUser ? 'You' : 'AI'}
                </div>
                <div className="max-w-[80%]">
                  {!isUser && msg.type === 'updated_plan' && (
                    <span className="text-[11px] uppercase tracking-wide text-indigo-500 font-medium mb-1 block">
                      Plan updated
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-slate-800 text-white rounded-tr-sm'
                        : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          {submitting && <TypingIndicator />}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2 px-5 pb-4 pt-2">
        <input
          placeholder="E.g. Can you make the hook punchier?"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={submitting}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {submitting ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
