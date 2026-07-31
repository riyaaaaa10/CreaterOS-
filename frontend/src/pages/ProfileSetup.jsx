import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, saveMyProfile } from '../api/profiles.js';
import {
  ROLE_TAXONOMY,
  PLATFORMS,
  EXPERIENCE_LEVELS,
  BUDGET_RANGES,
  AVAILABILITY_OPTIONS,
  CONTENT_GOALS,
  POSTING_FREQUENCY,
  label,
} from '../constants.js';

const emptyFields = {
  niche: '',
  platforms: [],
  location: '',
  experience_level: '',
  aesthetic_tags: '',
  budget_range: '',
  skills: [],
  availability: '',
  // Creator-only extended fields
  target_audience: '',
  content_goals: [],
  posting_frequency: '',
  equipment: '',
};

function splitTags(str) {
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [creatorFields, setCreatorFields] = useState(emptyFields);
  const [collaboratorFields, setCollaboratorFields] = useState(emptyFields);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        if (!profile) return;
        setRoles(profile.roles || []);
        if (profile.creator_profile) {
          setCreatorFields({
            ...emptyFields,
            ...profile.creator_profile,
            aesthetic_tags: (profile.creator_profile.aesthetic_tags || []).join(', '),
            equipment: (profile.creator_profile.equipment || []).join(', '),
          });
        }
        if (profile.collaborator_profile) {
          setCollaboratorFields({
            ...emptyFields,
            ...profile.collaborator_profile,
            aesthetic_tags: (profile.collaborator_profile.aesthetic_tags || []).join(', '),
          });
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  function toggleRole(role) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function toggleListValue(setter, field, value) {
    setter((prev) => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (roles.length === 0) {
      setError('Select at least one role: creator or collaborator.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        roles,
        creator_profile: roles.includes('creator')
          ? {
              ...creatorFields,
              aesthetic_tags: splitTags(creatorFields.aesthetic_tags),
              equipment: splitTags(creatorFields.equipment),
            }
          : null,
        collaborator_profile: roles.includes('collaborator')
          ? { ...collaboratorFields, aesthetic_tags: splitTags(collaboratorFields.aesthetic_tags) }
          : null,
      };
      await saveMyProfile(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="p-8 text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-8 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Set Up Your Profile</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div>
          <p className="font-medium text-slate-700 mb-2">I am a...</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={roles.includes('creator')} onChange={() => toggleRole('creator')} />
              Creator
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={roles.includes('collaborator')} onChange={() => toggleRole('collaborator')} />
              Collaborator
            </label>
          </div>
        </div>

        {roles.includes('creator') && (
          <ProfileFieldGroup
            title="Creator details"
            fields={creatorFields}
            setFields={setCreatorFields}
            toggleListValue={(field, value) => toggleListValue(setCreatorFields, field, value)}
            showSkillsAndAvailability={false}
          />
        )}

        {roles.includes('collaborator') && (
          <ProfileFieldGroup
            title="Collaborator details"
            fields={collaboratorFields}
            setFields={setCollaboratorFields}
            toggleListValue={(field, value) => toggleListValue(setCollaboratorFields, field, value)}
            showSkillsAndAvailability
          />
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-800 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}

function ProfileFieldGroup({ title, fields, setFields, toggleListValue, showSkillsAndAvailability }) {
  return (
    <div className="border-t border-slate-200 pt-4 space-y-3">
      <h2 className="font-semibold text-slate-700">{title}</h2>

      <input
        placeholder="Niche (e.g. travel, fitness, comedy)"
        value={fields.niche}
        onChange={(e) => setFields((f) => ({ ...f, niche: e.target.value }))}
        className="w-full border border-slate-300 rounded px-3 py-2"
      />

      <div>
        <p className="text-sm text-slate-500 mb-1">Platforms</p>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={fields.platforms.includes(p)}
                onChange={() => toggleListValue('platforms', p)}
              />
              {label(p)}
            </label>
          ))}
        </div>
      </div>

      <input
        placeholder="Location (city)"
        value={fields.location}
        onChange={(e) => setFields((f) => ({ ...f, location: e.target.value }))}
        className="w-full border border-slate-300 rounded px-3 py-2"
      />

      <select
        value={fields.experience_level}
        onChange={(e) => setFields((f) => ({ ...f, experience_level: e.target.value }))}
        className="w-full border border-slate-300 rounded px-3 py-2"
      >
        <option value="">Experience level</option>
        {EXPERIENCE_LEVELS.map((lvl) => (
          <option key={lvl} value={lvl}>{label(lvl)}</option>
        ))}
      </select>

      <input
        placeholder="Aesthetic tags, comma-separated (e.g. moody, minimal, bright)"
        value={fields.aesthetic_tags}
        onChange={(e) => setFields((f) => ({ ...f, aesthetic_tags: e.target.value }))}
        className="w-full border border-slate-300 rounded px-3 py-2"
      />

      {!showSkillsAndAvailability && (
        <>
          <input
            placeholder="Target audience (e.g. women 18-25 into fitness)"
            value={fields.target_audience || ''}
            onChange={(e) => setFields((f) => ({ ...f, target_audience: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-2"
          />

          <div>
            <p className="text-sm text-slate-500 mb-1">Content goals</p>
            <div className="flex flex-wrap gap-3">
              {CONTENT_GOALS.map((g) => (
                <label key={g} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={(fields.content_goals || []).includes(g)}
                    onChange={() => toggleListValue('content_goals', g)}
                  />
                  {label(g)}
                </label>
              ))}
            </div>
          </div>

          <select
            value={fields.posting_frequency || ''}
            onChange={(e) => setFields((f) => ({ ...f, posting_frequency: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-2"
          >
            <option value="">Posting frequency</option>
            {POSTING_FREQUENCY.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <input
            placeholder="Equipment, comma-separated (e.g. iPhone 15, DJI Osmo, ring light)"
            value={fields.equipment || ''}
            onChange={(e) => setFields((f) => ({ ...f, equipment: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-2"
          />
        </>
      )}

      {showSkillsAndAvailability && (
        <>
          <div>
            <p className="text-sm text-slate-500 mb-1">Skills</p>
            <div className="flex flex-wrap gap-3">
              {ROLE_TAXONOMY.map((role) => (
                <label key={role} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={fields.skills.includes(role)}
                    onChange={() => toggleListValue('skills', role)}
                  />
                  {label(role)}
                </label>
              ))}
            </div>
          </div>

          <select
            value={fields.budget_range}
            onChange={(e) => setFields((f) => ({ ...f, budget_range: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-2"
          >
            <option value="">Budget range</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={fields.availability}
            onChange={(e) => setFields((f) => ({ ...f, availability: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-2"
          >
            <option value="">Availability</option>
            {AVAILABILITY_OPTIONS.map((a) => (
              <option key={a} value={a}>{label(a)}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
