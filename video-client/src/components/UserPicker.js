import "./UserPicker.css";
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
                onlineUsers.includes(u.SearchUser) &&
                u.SearchUser !== currentUserId
            )
            .map((u) => {
              // Management: has FirstName/LastName, Mobile: has PINNumber
              const isManagement = u.FirstName !== undefined && u.LastName !== undefined;
              return (
                <option key={u.id} value={u.SearchUser}>
                  {u.SearchUser} 🟢
                  {isManagement ? (
                    <> | Name: {u.FirstName} {u.LastName} | Admin type: {u.UserType}</>
                  ) : (
                    <> | PIN Number: {u.PINNumber} | Admin type: {u.UserType}</>
                  )}
                </option>
              );
            })}
        </select>
      </label>
      <button disabled={!value} onClick={onCall}>
        Call {value}
      </button>
    </div>
  );
}
