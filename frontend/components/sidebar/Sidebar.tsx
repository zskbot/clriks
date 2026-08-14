const navItems = [
  { icon: "🏠", label: "Dashboard" },
  { icon: "📁", label: "Projects" },
  { icon: "📂", label: "Explorer" },
  { icon: "🤖", label: "AI" },
  { icon: "🌐", label: "Preview" },
  { icon: "💻", label: "Terminal" },
  { icon: "🌿", label: "Git" },
  { icon: "⚙", label: "Settings" },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: "260px",
      background: "#0f172a",
      color: "#fff",
      padding: "16px",
      borderRight: "1px solid #1e293b"
    }}>
      <h2>ClaudeRiks</h2>
      <br/>
      {navItems.map(({ icon, label }) => (
        <div key={label}>{icon} {label}</div>
      ))}
    </aside>
  )
}
