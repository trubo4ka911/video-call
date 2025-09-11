import "./Login.css";
// src/components/Login.js

export default function Login({
  users,
  value,
  onChange,
  onLogin,
  onSourceChange,
  source,
  socket,
  signalingUrl,
}) {
  const socketState = socket && socket.connected ? "connected" : "disconnected";
  return (
    <div className="login">
      <h2>Pick your user to “log in”:</h2>
      <div style={{ marginBottom: 8 }}>
        <strong>Socket:</strong> <span data-testid="socket-state">{socketState}</span>
        <br />
        <strong>Signaling:</strong> <span data-testid="signaling-url">{signalingUrl}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => onSourceChange("management")}
          style={{
            fontWeight: source === "management" ? "bold" : "normal",
            backgroundColor:
              source === "management" ? "#1706f8ff" : "#06d4f8ff",
          }}
        >
          Management
        </button>
        <button
          onClick={() => onSourceChange("mobile")}
          style={{
            fontWeight: source === "mobile" ? "bold" : "normal",
            backgroundColor: source === "mobile" ? "#1706f8ff" : "#06d4f8ff",
            marginLeft: 8,
          }}
        >
          Mobile
        </button>
      </div>

      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {users.map((u) => (
          <option key={u.id} value={u.SearchUser}>
            {u.SearchUser}
          </option>
        ))}
      </select>
      <button disabled={!value} onClick={onLogin}>
        Log in
      </button>
    </div>
  );
}
