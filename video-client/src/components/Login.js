import "./Login.css";
// src/components/Login.js
import React from "react";

export default function Login({ users, value, onChange, onLogin }) {
  return (
    <div className="login">
      <h2>Pick your user to “log in”:</h2>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {users.map((u) => (
          <option key={u.userId} value={u.userId}>
            {u.name}
          </option>
        ))}
      </select>
      <button disabled={!value} onClick={onLogin}>
        Log in
      </button>
    </div>
  );
}
