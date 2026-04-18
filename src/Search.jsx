import React, { useState, useEffect } from "react";
import Navbar from "./navbar";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";

const CATEGORIES = ["Web Development", "Graphic Design", "Marketing", "Writing", "Video Editing", "Data Analysis", "UI/UX Design", "Social Media"];

export default function SearchPage() {
  const [query, setQuery]           = useState("");
  const [jobs, setJobs]             = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [selected, setSelected]     = useState([]);
  const [maxPrice, setMaxPrice]     = useState(10000);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/jobs/available`)
      .then(r => { setJobs(r.data); setFiltered(r.data); })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let res = jobs;
    if (query.trim()) {
      const q = query.toLowerCase();
      res = res.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.content?.toLowerCase().includes(q)
      );
    }
    if (selected.length) {
      res = res.filter(j =>
        selected.some(cat => j.title?.toLowerCase().includes(cat.toLowerCase()))
      );
    }
    res = res.filter(j => (j.srtAmount || 0) <= maxPrice);
    setFiltered(res);
  }, [query, selected, maxPrice, jobs]);

  const toggleCat = (cat) =>
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search jobs by title or description..."
            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition-colors"
          />
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <div className="w-64 shrink-0 hidden md:block">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Categories</h3>
                <div className="space-y-2">
                  {CATEGORIES.map(cat => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => toggleCat(cat)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer
                          ${selected.includes(cat)
                            ? "bg-black dark:bg-white border-black dark:border-white"
                            : "border-gray-300 dark:border-white/20 bg-transparent"
                          }`}
                      >
                        {selected.includes(cat) && (
                          <span className="text-white dark:text-black text-[10px] font-bold">✓</span>
                        )}
                      </div>
                      <span
                        onClick={() => toggleCat(cat)}
                        className="text-sm text-gray-600 dark:text-white/60 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
                      >
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  Max Budget: <span className="font-black">{maxPrice} SRT</span>
                </h3>
                <input
                  type="range" min="0" max="10000" step="100"
                  value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-white/30 mt-1">
                  <span>0</span><span>10,000 SRT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-white/40">
                {loading ? "Loading..." : `${filtered.length} job${filtered.length !== 1 ? "s" : ""} found`}
              </h2>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])}
                  className="text-xs text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white underline transition-colors">
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-gray-400 dark:text-white/30 font-semibold">No jobs found</p>
                <p className="text-gray-300 dark:text-white/20 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map(job => (
                  <div key={job._id}
                    className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 hover:shadow-md dark:hover:shadow-none hover:border-gray-300 dark:hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">{job.title}</h3>
                        <p className="text-gray-500 dark:text-white/50 text-sm line-clamp-2">{job.content}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black text-gray-900 dark:text-white">{job.srtAmount || 0}</p>
                        <p className="text-xs text-gray-400 dark:text-white/30">SRT</p>
                      </div>
                    </div>
                    {job.deadline && (
                      <p className="text-xs text-gray-400 dark:text-white/30 mt-3">
                        Deadline: {new Date(job.deadline * 1000).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
