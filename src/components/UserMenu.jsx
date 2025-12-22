import React, { useState, useRef, useEffect } from "react";
import { LogIn, LogOut, ChevronDown, User } from "lucide-react";

const UserMenu = ({ user, onLogin, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Not logged in - show login button
  if (!user) {
    return (
      <button className="user-menu__login" onClick={onLogin}>
        <LogIn size={16} />
        <span>Sign in with GitHub</span>
      </button>
    );
  }

  // Logged in - show user menu
  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.login}
            className="user-menu__avatar"
          />
        ) : (
          <div className="user-menu__avatar-placeholder">
            <User size={14} />
          </div>
        )}
        <span className="user-menu__name">{user.login}</span>
        <ChevronDown
          size={14}
          className={`user-menu__chevron ${isOpen ? "rotate" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="user-menu__dropdown">
          <div className="user-menu__user-info">
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.login}
                className="user-menu__dropdown-avatar"
              />
            )}
            <div className="user-menu__user-details">
              {user.name && (
                <span className="user-menu__user-name">{user.name}</span>
              )}
              <span className="user-menu__user-login">@{user.login}</span>
            </div>
          </div>
          <div className="user-menu__divider" />
          <button className="user-menu__item" onClick={onLogout}>
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
