import React from 'react';

export default function SmartInsight({text}) {
 return <aside className="smart-insight" aria-label="Smart insight">
  <span className="smart-insight-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a7 7 0 0 0-4 12.75c.6.42 1 1.03 1 1.75h6c0-.72.4-1.33 1-1.75A7 7 0 0 0 12 3Z"/><path d="M9.5 21h5m-4.5-3.5h4M12 6v3m-1.5-1.5h3"/></svg></span>
  <span className="smart-insight-copy"><span className="smart-insight-label">Smart insight</span><span className="smart-insight-text">{text}</span></span>
 </aside>;
}
