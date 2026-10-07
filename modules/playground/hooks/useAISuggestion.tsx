import { useCallback, useRef, useState } from "react";

interface AISuggestionState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
}

interface UseAISuggestionReturn extends AISuggestionState {
  toggleEnabled: () => void;
  fetchSuggestion: (type: string, editor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
}

export const UseAISuggestions = (): UseAISuggestionReturn => {
  const [state, setState] = useState<AISuggestionState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
  });

  // Keeps track of the current request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keeps the latest enabled value
  const enabledRef = useRef(true);

  const toggleEnabled = useCallback(() => {
    enabledRef.current = !enabledRef.current;

    // If AI is disabled, cancel current request
    if (!enabledRef.current) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      setState((prev) => ({
        ...prev,
        isEnabled: false,
        isLoading: false,
        suggestion: null,
        position: null,
      }));

      return;
    }

    setState((prev) => ({
      ...prev,
      isEnabled: true,
    }));
  }, []);

  const fetchSuggestion = useCallback(async (type: string, editor: any) => {
    if (!enabledRef.current || !editor) {
      return;
    }

    const model = editor.getModel();
    const cursorPosition = editor.getPosition();

    if (!model || !cursorPosition) {
      return;
    }

    // Cancel previous request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      suggestion: null,
      position: null,
    }));

    try {
      const payload = {
        fileContent: model.getValue(),
        cursorLine: cursorPosition.lineNumber - 1,
        cursorColumn: cursorPosition.column - 1,
        suggestionType: type,
      };

      const response = await fetch("/api/code-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();

      // Ignore old/cancelled request
      if (controller.signal.aborted) {
        return;
      }

      if (data.suggestion) {
        const suggestionText = data.suggestion.trim();

        setState((prev) => ({
          ...prev,
          suggestion: suggestionText,
          position: {
            line: cursorPosition.lineNumber,
            column: cursorPosition.column,
          },
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error: any) {
      // Abort is expected when a new request starts
      if (error?.name === "AbortError") {
        return;
      }

      console.error("Error fetching code suggestion:", error);

      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  const acceptSuggestion = useCallback((editor: any, monaco: any) => {
    setState((currentState) => {
      if (
        !currentState.suggestion ||
        !currentState.position ||
        !editor ||
        !monaco
      ) {
        return currentState;
      }

      const { line, column } = currentState.position;

      const sanitizedSuggestion = currentState.suggestion.replace(
        /^\d+:\s\*/gm,
        "",
      );

      editor.executeEdits("", [
        {
          range: new monaco.Range(line, column, line, column),
          text: sanitizedSuggestion,
          forceMoveMarkers: true,
        },
      ]);

      if (currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
        isLoading: false,
      };
    });
  }, []);

  const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
        isLoading: false,
      };
    });
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
        isLoading: false,
      };
    });
  }, []);

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
  };
};
