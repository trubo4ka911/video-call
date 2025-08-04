// src/components/UserPicker.js
import React from "react";

export default function UserPicker({
  users,
  onlineUsers,
  currentUserId,
  value,
  onChange,
  onCall,
}) {
  return (
    <div className="user-picker">
      <label>
        Call whom?{" "}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {users
            .filter(
              (u) =>
                onlineUsers.includes(u.userId) && u.userId !== currentUserId
            )
            .map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} 🟢
              </option>
            ))}
        </select>
      </label>
      <button disabled={!value} onClick={onCall}>
        Call {value}
      </button>
    </div>
  );
}
