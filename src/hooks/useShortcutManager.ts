import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: (e: KeyboardEvent) => void;
}

/**
 * Reusable layout & page level keyboard hotkey registry.
 * Disables triggers when typing in input, select or textareas to protect user state.
 */
export function useShortcutManager(shortcuts: ShortcutConfig[] = [], activeWorkspaceId?: string) {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip shortcuts if focusing input/form controls to prevent interference
      const activeElement = document.activeElement;
      const isTyping = 
        activeElement && (
          activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.hasAttribute("contenteditable")
        );

      if (isTyping) {
        // Let Escape blur from inputs
        if (e.key === "Escape") {
          (activeElement as HTMLElement).blur();
        }
        return;
      }

      const keyLower = e.key.toLowerCase();

      // 'c' or 'C' key -> navigate to create ticket (when not typing)
      if (keyLower === "c" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (activeWorkspaceId) {
          navigate(`/workspaces/${activeWorkspaceId}/tickets/new`);
        } else {
          navigate(`/dashboard`);
        }
        return;
      }

      // 's' or 'S' key -> focus search bar (when not typing)
      if (keyLower === "s" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const input = document.getElementById("layout-search-input");
        if (input) {
          input.focus();
        }
        return;
      }

      // Check registration configs
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action(e);
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, activeWorkspaceId, navigate]);
}
