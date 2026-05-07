// Tiny inline SVG icons. 1.5px stroke, currentColor.
const Icon = ({ name, size = 16, ...rest }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", ...rest };
  switch (name) {
    case "chevron-left":  return <svg {...props}><path d="M15 6l-6 6 6 6" /></svg>;
    case "chevron-right": return <svg {...props}><path d="M9 6l6 6-6 6" /></svg>;
    case "chevron-down":  return <svg {...props}><path d="M6 9l6 6 6-6" /></svg>;
    case "plus":          return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "search":        return <svg {...props}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
    case "settings":      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
    case "mic":           return <svg {...props}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>;
    case "stop":          return <svg {...props}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>;
    case "send":          return <svg {...props}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
    case "sparkle":       return <svg {...props}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M19 15l.7 1.8L21.5 18l-1.8.7L19 21l-.7-1.8L16.5 18l1.8-.7z" /></svg>;
    case "users":         return <svg {...props}><path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" /><path d="M3 21a9 9 0 0 1 18 0" /></svg>;
    case "pin":           return <svg {...props}><path d="M12 21v-7" /><path d="M9 4h6l-1 6 3 3H7l3-3-1-6z" /></svg>;
    case "today":         return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /><circle cx="12" cy="14" r="2" fill="currentColor" stroke="none" /></svg>;
    case "x":             return <svg {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "check":         return <svg {...props}><path d="M5 12l5 5L20 7" /></svg>;
    case "wave": return (
      <svg {...props} viewBox="0 0 32 16">
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="2" y1="8" x2="2" y2="8" />
          <line x1="6" y1="5" x2="6" y2="11" />
          <line x1="10" y1="2" x2="10" y2="14" />
          <line x1="14" y1="6" x2="14" y2="10" />
          <line x1="18" y1="3" x2="18" y2="13" />
          <line x1="22" y1="5" x2="22" y2="11" />
          <line x1="26" y1="7" x2="26" y2="9" />
          <line x1="30" y1="6" x2="30" y2="10" />
        </g>
      </svg>
    );
    default: return null;
  }
};

window.Icon = Icon;
