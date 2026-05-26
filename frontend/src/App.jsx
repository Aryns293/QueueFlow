import { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS = {
  queued:     { color: '#F59E0B', bg: '#FEF3C7' },
  processing: { color: '#3B82F6', bg: '#DBEAFE' },
  completed:  { color: '#10B981', bg: '#D1FAE5' },
  failed:     { color: '#EF4444', bg: '#FEE2E2' },
};

const JOB_TYPES = ['email', 'sms', 'image-resize', 'pdf-generate', 'analytics'];

export default function App() {
  const [jobs, setJobs]       = useState([]);
  const [filter, setFilter]   = useState('all');
  const [form, setForm]       = useState({ type: 'email', payload: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError]     = useState(null);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API}/jobs`);
      setJobs(res.data);
      setError(null);
    } catch {
      setError('Cannot reach API server');
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const createJob = async () => {
    if (!form.payload.trim()) return;
    setCreating(true);
    try {
      await axios.post(`${API}/jobs`, {
        type: form.type,
        payload: { data: form.payload }
      });
      setForm(f => ({ ...f, payload: '' }));
      fetchJobs();
    } catch {
      alert('Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  const counts = Object.fromEntries(
    ['queued', 'processing', 'completed', 'failed'].map(s => [
      s, jobs.filter(j => j.status === s).length
    ])
  );

  const visible = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>Job Queue</h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: '4px 0 0' }}>
            {error
              ? <span style={{ color: '#EF4444' }}>{error}</span>
              : `${jobs.length} total jobs · auto-refreshes every 3s`}
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {Object.entries(counts).map(([status, count]) => (
            <button key={status} onClick={() => setFilter(filter === status ? 'all' : status)}
              style={{
                padding: '18px 16px', borderRadius: 10, border: `2px solid ${filter === status ? STATUS[status].color : '#E2E8F0'}`,
                background: filter === status ? STATUS[status].bg : 'white',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s'
              }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: STATUS[status].color, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize', marginTop: 6, fontWeight: 500 }}>{status}</div>
            </button>
          ))}
        </div>

        {/* Create job form */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 14px' }}>Create job</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, color: '#0F172A', background: 'white' }}>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              placeholder="Payload (any text)"
              value={form.payload}
              onChange={e => setForm(f => ({ ...f, payload: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && createJob()}
              style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, outline: 'none' }}
            />
            <button onClick={createJob} disabled={creating || !form.payload.trim()}
              style={{
                padding: '9px 22px', background: creating ? '#94A3B8' : '#3B82F6', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: creating ? 'default' : 'pointer'
              }}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        {/* Jobs table */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 15 }}>
              {filter === 'all' ? 'All jobs' : `${filter} jobs`}
              <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 8 }}>({visible.length})</span>
            </span>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')}
                style={{ fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
                Show all
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
              No jobs yet — create one above or run the simulation script
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Job ID', 'Type', 'Status', 'Retries', 'Error', 'Created'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', color: '#64748B', fontWeight: 500, borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((job, i) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '11px 20px', fontFamily: 'monospace', color: '#94A3B8', fontSize: 12 }}>
                      {job.id.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '11px 20px', fontWeight: 500, color: '#334155' }}>
                      {job.type}
                    </td>
                    <td style={{ padding: '11px 20px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        color: STATUS[job.status]?.color,
                        background: STATUS[job.status]?.bg
                      }}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 20px', color: job.retry_count > 0 ? '#F59E0B' : '#CBD5E1', fontWeight: job.retry_count > 0 ? 600 : 400 }}>
                      {job.retry_count}/{job.max_retries}
                    </td>
                    <td style={{ padding: '11px 20px', color: '#EF4444', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.error || <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 20px', color: '#94A3B8' }}>
                      {new Date(job.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}